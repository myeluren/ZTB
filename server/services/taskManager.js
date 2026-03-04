import db from '../db/database.js'
import { generateContent } from './contentGen.js'
import { generateWordFile } from './fileGen.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const outputsDir = path.join(__dirname, '..', 'outputs')

// 任务执行队列
const taskQueue = new Map()

// 创建新任务
export function createTask(taskData) {
  const stmt = db.prepare(`
    INSERT INTO tasks (
      task_name, file_name, file_content, outline,
      format_settings, llm_config, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  const result = stmt.run(
    taskData.taskName,
    taskData.fileName,
    JSON.stringify(taskData.fileContent),
    JSON.stringify(taskData.outline),
    JSON.stringify(taskData.formatSettings),
    JSON.stringify(taskData.llmConfig),
    'pending'
  )

  const taskId = result.lastInsertRowid
  console.log(`创建任务: ${taskId} - ${taskData.taskName}`)

  return taskId
}

// 获取任务列表
export function getTasks(limit = 50, offset = 0) {
  const stmt = db.prepare(`
    SELECT * FROM tasks
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `)

  return stmt.all(limit, offset)
}

// 获取任务详情
export function getTask(taskId) {
  const stmt = db.prepare('SELECT * FROM tasks WHERE id = ?')
  return stmt.get(taskId)
}

// 更新任务状态
export function updateTaskStatus(taskId, status) {
  const stmt = db.prepare(`
    UPDATE tasks
    SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `)

  stmt.run(status, taskId)
  console.log(`任务 ${taskId} 状态更新为: ${status}`)
}

// 更新任务进度
export function updateTaskProgress(taskId, progress, completedSections, totalSections, currentSection, generatedContent) {
  const stmt = db.prepare(`
    UPDATE tasks
    SET
      progress = ?,
      completed_sections = ?,
      total_sections = ?,
      current_section = ?,
      generated_content = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `)

  stmt.run(
    progress,
    completedSections,
    totalSections,
    currentSection,
    JSON.stringify(generatedContent),
    taskId
  )

  // 自动保存已生成的内容
  if (generatedContent && generatedContent.length > 0) {
    saveTaskPartialContent(taskId, generatedContent)
  }
}

// 更新任务完成状态
export function completeTask(taskId, fileUrl) {
  const stmt = db.prepare(`
    UPDATE tasks
    SET
      status = 'completed',
      progress = 100,
      updated_at = CURRENT_TIMESTAMP,
      completed_at = CURRENT_TIMESTAMP,
      file_url = ?
    WHERE id = ?
  `)

  stmt.run(fileUrl, taskId)
  console.log(`任务 ${taskId} 已完成`)
}

// 标记任务失败
export function failTask(taskId, errorMessage) {
  const stmt = db.prepare(`
    UPDATE tasks
    SET
      status = 'failed',
      error_message = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `)

  stmt.run(errorMessage, taskId)
  console.error(`任务 ${taskId} 失败: ${errorMessage}`)
}

// 保存任务部分内容
function saveTaskPartialContent(taskId, content) {
  if (!fs.existsSync(outputsDir)) {
    fs.mkdirSync(outputsDir, { recursive: true })
  }

  const filePath = path.join(outputsDir, `task_${taskId}_partial.json`)
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf-8')
}

// 获取任务部分内容
export function getTaskPartialContent(taskId) {
  const filePath = path.join(outputsDir, `task_${taskId}_partial.json`)
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      return JSON.parse(content)
    } catch (err) {
      console.error('读取部分内容失败:', err)
      return null
    }
  }
  return null
}

// 开始执行任务（后台执行）
export async function startTask(taskId) {
  const task = getTask(taskId)
  if (!task) {
    throw new Error('任务不存在')
  }

  if (task.status === 'running') {
    console.log(`任务 ${taskId} 已经在执行中`)
    return
  }

  updateTaskStatus(taskId, 'running')

  try {
    // 解析任务数据
    const fileContent = JSON.parse(task.file_content)
    const outline = JSON.parse(task.outline)
    const formatSettings = JSON.parse(task.format_settings)
    const llmConfig = JSON.parse(task.llm_config)

    // 从断点恢复（如果有部分内容）
    const partialContent = getTaskPartialContent(taskId)
    let startSection = 0
    if (partialContent) {
      startSection = partialContent.length
      console.log(`任务 ${taskId} 从断点恢复: 第 ${startSection} 章节`)
    }

    // 生成内容
    const generatedContent = await generateContent(
      fileContent,
      outline,
      formatSettings,
      llmConfig,
      (completed, total, currentSection) => {
        // 进度回调
        const progress = Math.round((completed / total) * 100)
        const currentContent = partialContent ? [...partialContent, ...outline.slice(0, completed)] : outline.slice(0, completed)
        updateTaskProgress(taskId, progress, completed, total, currentSection, currentContent)
      }
    )

    // 生成Word文档
    const filename = `投标文件_${task.id}_${new Date().toISOString().slice(0, 10)}.docx`
    const buffer = await generateWordFile(generatedContent, formatSettings)

    // 保存文件
    if (!fs.existsSync(outputsDir)) {
      fs.mkdirSync(outputsDir, { recursive: true })
    }
    const outputPath = path.join(outputsDir, filename)
    fs.writeFileSync(outputPath, buffer)

    // 更新任务完成状态
    const fileUrl = `/api/download/${filename}`
    completeTask(taskId, fileUrl)

  } catch (error) {
    console.error(`任务 ${taskId} 执行失败:`, error)
    failTask(taskId, error.message)
  }
}

// 暂停任务
export function pauseTask(taskId) {
  const task = getTask(taskId)
  if (!task || task.status !== 'running') {
    throw new Error('任务未在运行中，无法暂停')
  }

  updateTaskStatus(taskId, 'paused')
  console.log(`任务 ${taskId} 已暂停`)
}

// 继续任务
export function resumeTask(taskId) {
  const task = getTask(taskId)
  if (!task || task.status !== 'paused') {
    throw new Error('任务未暂停，无法继续')
  }

  console.log(`任务 ${taskId} 继续执行`)
  startTask(taskId)
}

// 删除任务
export function deleteTask(taskId) {
  const stmt = db.prepare('DELETE FROM tasks WHERE id = ?')
  stmt.run(taskId)

  // 删除关联的文件
  const partialFile = path.join(outputsDir, `task_${taskId}_partial.json`)

  if (fs.existsSync(partialFile)) {
    fs.unlinkSync(partialFile)
  }

  console.log(`任务 ${taskId} 已删除`)
}

// 获取所有未完成的任务（用于服务启动时恢复）
export function getPendingTasks() {
  const stmt = db.prepare(`
    SELECT * FROM tasks
    WHERE status IN ('pending', 'running', 'paused')
    ORDER BY created_at ASC
  `)
  return stmt.all()
}

// 恢复所有未完成的任务
export async function recoverPendingTasks() {
  const pendingTasks = getPendingTasks()

  if (pendingTasks.length === 0) {
    console.log('没有需要恢复的任务')
    return
  }

  console.log(`发现 ${pendingTasks.length} 个未完成的任务，开始恢复...`)

  // 用于记录哪些任务需要恢复执行
  const tasksToRun = []

  for (const task of pendingTasks) {
    // 如果任务状态是 running，说明服务异常退出，将其改为 pending
    if (task.status === 'running') {
      console.log(`任务 ${task.id} 状态从 running 改为 pending`)
      updateTaskStatus(task.id, 'pending')
      tasksToRun.push(task.id)
    } else if (task.status === 'pending') {
      tasksToRun.push(task.id)
    }
    // paused 状态的任务不自动恢复，需要用户手动点击继续
  }

  // 依次执行所有需要恢复的任务（间隔3秒，避免并发）
  for (const taskId of tasksToRun) {
    try {
      // 延迟执行，避免启动时瞬间压力过大
      await new Promise(resolve => setTimeout(resolve, 3000))
      console.log(`开始恢复执行任务 ${taskId}`)
      await startTask(taskId)
    } catch (error) {
      console.error(`恢复任务 ${taskId} 失败:`, error.message)
    }
  }
}
