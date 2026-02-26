import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { parseFile } from '../services/fileParser.js'
import { generateOutline } from '../services/outlineGen.js'
import { generateContent } from '../services/contentGen.js'
import { generateWordFile } from '../services/fileGen.js'
import {
  createTask,
  getTasks,
  getTask,
  startTask,
  pauseTask,
  resumeTask,
  deleteTask
} from '../services/taskManager.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const CONFIG_FILE = path.join(__dirname, '../config.json')

const router = express.Router()

const uploadDir = path.join(__dirname, '../uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }
})

router.post('/parse-text', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '请上传文件' })
    }

    const filePath = req.file.path
    const content = await parseFile(filePath, req.file.originalname)

    fs.unlinkSync(filePath)

    res.json({
      success: true,
      content
    })
  } catch (error) {
    console.error('解析文件失败:', error)
    res.status(500).json({ success: false, message: error.message || '文件解析失败' })
  }
})

router.post('/generate-outline', async (req, res) => {
  try {
    const { fileContent, llmConfig } = req.body

    console.log('=== /generate-outline 接收参数 ===')
    console.log('fileContent 长度:', fileContent?.length)
    console.log('llmConfig:', JSON.stringify(llmConfig, null, 2))

    if (!fileContent || !llmConfig) {
      console.error('参数不完整:', { fileContent: !!fileContent, llmConfig: !!llmConfig })
      return res.status(400).json({ success: false, message: '参数不完整' })
    }

    const outline = await generateOutline(fileContent, llmConfig)

    // 检查是否有错误标记（LLM调用失败返回了默认大纲）
    const hasError = outline && outline[0] && outline[0]._error

    res.json({
      success: true,
      outline,
      usingDefaultOutline: hasError ? true : false,
      errorMessage: hasError ? outline[0]._error : null
    })
  } catch (error) {
    console.error('生成大纲失败:', error)
    console.error('错误堆栈:', error.stack)
    // 返回默认大纲而不是500错误
    const { getDefaultOutline } = await import('../services/outlineGen.js')
    const defaultOutline = getDefaultOutline()
    defaultOutline[0]._error = error.message
    res.json({
      success: true,
      outline: defaultOutline,
      usingDefaultOutline: true,
      errorMessage: error.message
    })
  }
})

router.post('/parse', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '请上传文件' })
    }

    const filePath = req.file.path
    const content = await parseFile(filePath, req.file.originalname)

    const outline = await generateOutline(content)

    fs.unlinkSync(filePath)

    res.json({
      success: true,
      content,
      outline
    })
  } catch (error) {
    console.error('解析文件失败:', error)
    res.status(500).json({ success: false, message: error.message || '文件解析失败' })
  }
})

router.post('/generate', async (req, res) => {
  try {
    const { fileContent, outline, formatSettings, llmConfig } = req.body

    console.log('=== /generate 接收参数 ===')
    console.log('fileContent 长度:', fileContent?.length)
    console.log('outline 章节数量:', outline?.length)
    console.log('formatSettings:', JSON.stringify(formatSettings, null, 2))
    console.log('llmConfig:', JSON.stringify(llmConfig, null, 2))

    if (!fileContent || !outline || !llmConfig) {
      console.error('参数不完整:', { fileContent: !!fileContent, outline: !!outline, llmConfig: !!llmConfig })
      return res.status(400).json({ success: false, message: '参数不完整' })
    }

    if (!Array.isArray(outline) || outline.length === 0) {
      console.error('outline 格式错误或为空')
      return res.status(400).json({ success: false, message: '大纲格式错误' })
    }

    const content = await generateContent(fileContent, outline, formatSettings, llmConfig)

    res.json({
      success: true,
      content
    })
  } catch (error) {
    console.error('生成内容失败:', error)
    console.error('错误堆栈:', error.stack)
    res.status(500).json({ success: false, message: error.message || '内容生成失败' })
  }
})

// 新增：SSE实时进度接口
router.post('/generate-stream', async (req, res) => {
  const { fileContent, outline, formatSettings, llmConfig } = req.body

  console.log('=== /generate-stream 接收参数 ===')
  console.log('fileContent 长度:', fileContent?.length)
  console.log('outline 章节数量:', outline?.length)

  if (!fileContent || !outline || !llmConfig) {
    return res.status(400).json({ success: false, message: '参数不完整' })
  }

  if (!Array.isArray(outline) || outline.length === 0) {
    return res.status(400).json({ success: false, message: '大纲格式错误' })
  }

  // 设置SSE响应头
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  try {
    let generatedContent = null

    // 生成内容并实时推送进度
    generatedContent = await generateContent(fileContent, outline, formatSettings, llmConfig, (completed, total, currentSection) => {
      // 推送进度事件
      res.write(`data: ${JSON.stringify({
        type: 'progress',
        completed,
        total,
        currentSection,
        percentage: Math.round((completed / total) * 100)
      })}\n\n`)
    })

    // 生成完成后，推送最终内容
    res.write(`data: ${JSON.stringify({
      type: 'complete',
      content: generatedContent
    })}\n\n`)

    res.end()
  } catch (error) {
    console.error('生成内容失败:', error)
    res.write(`data: ${JSON.stringify({
      type: 'error',
      message: error.message || '内容生成失败'
    })}\n\n`)
    res.end()
  }
})

router.post('/download', async (req, res) => {
  try {
    const { content, formatSettings, filename } = req.body

    console.log('=== /download 接收参数 ===')
    console.log('content 类型:', typeof content)
    console.log('formatSettings:', JSON.stringify(formatSettings, null, 2))

    if (!content || !formatSettings) {
      console.error('参数不完整:', { content: !!content, formatSettings: !!formatSettings })
      return res.status(400).json({ success: false, message: '参数不完整' })
    }

    const buffer = await generateWordFile(content, formatSettings)

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename || '投标文件.docx')}"`)
    res.send(buffer)
  } catch (error) {
    console.error('生成文件失败:', error)
    console.error('错误堆栈:', error.stack)
    res.status(500).json({ success: false, message: error.message || '文件生成失败' })
  }
})

router.get('/config', (req, res) => {
  try {
    console.log('=== GET /config 被调用 ===')
    console.log('CONFIG_FILE:', CONFIG_FILE)
    console.log('文件是否存在:', fs.existsSync(CONFIG_FILE))

    if (fs.existsSync(CONFIG_FILE)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'))
      console.log('读取到的配置:', config)
      res.json({ success: true, analysisConfig: config.analysisConfig || null, generationConfig: config.generationConfig || null })
    } else {
      console.log('配置文件不存在，返回null')
      res.json({ success: true, analysisConfig: null, generationConfig: null })
    }
  } catch (error) {
    console.error('读取配置失败:', error)
    res.status(500).json({ success: false, message: '读取配置失败' })
  }
})

router.post('/config', (req, res) => {
  try {
    const currentConfig = fs.existsSync(CONFIG_FILE) ? JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) : {}
    const newConfig = { ...currentConfig, ...req.body }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(newConfig, null, 2), 'utf8')
    res.json({ success: true })
  } catch (error) {
    console.error('保存配置失败:', error)
    res.status(500).json({ success: false, message: '保存配置失败' })
  }
})

// ========== 任务管理API ==========

// 获取任务列表
router.get('/tasks', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50
    const offset = parseInt(req.query.offset) || 0

    const tasks = getTasks(limit, offset)
    res.json({ success: true, tasks })
  } catch (error) {
    console.error('获取任务列表失败:', error)
    res.status(500).json({ success: false, message: '获取任务列表失败' })
  }
})

// 创建任务
router.post('/tasks', (req, res) => {
  try {
    const { taskName, fileName, fileContent, outline, formatSettings, llmConfig } = req.body

    if (!taskName || !fileContent || !outline || !formatSettings || !llmConfig) {
      return res.status(400).json({ success: false, message: '参数不完整' })
    }

    const taskId = createTask({
      taskName,
      fileName,
      fileContent,
      outline,
      formatSettings,
      llmConfig
    })

    // 立即启动任务（后台执行）
    startTask(taskId).catch(err => {
      console.error('任务启动失败:', err)
    })

    res.json({ success: true, taskId })
  } catch (error) {
    console.error('创建任务失败:', error)
    res.status(500).json({ success: false, message: '创建任务失败' })
  }
})

// 获取任务详情
router.get('/tasks/:id', (req, res) => {
  try {
    const task = getTask(req.params.id)
    if (!task) {
      return res.status(404).json({ success: false, message: '任务不存在' })
    }

    res.json({ success: true, task })
  } catch (error) {
    console.error('获取任务详情失败:', error)
    res.status(500).json({ success: false, message: '获取任务详情失败' })
  }
})

// 暂停任务
router.post('/tasks/:id/pause', (req, res) => {
  try {
    pauseTask(req.params.id)
    res.json({ success: true, message: '任务已暂停' })
  } catch (error) {
    console.error('暂停任务失败:', error)
    res.status(500).json({ success: false, message: error.message || '暂停任务失败' })
  }
})

// 继续任务
router.post('/tasks/:id/resume', (req, res) => {
  try {
    resumeTask(req.params.id)
    res.json({ success: true, message: '任务已继续' })
  } catch (error) {
    console.error('继续任务失败:', error)
    res.status(500).json({ success: false, message: error.message || '继续任务失败' })
  }
})

// 删除任务
router.delete('/tasks/:id', (req, res) => {
  try {
    deleteTask(req.params.id)
    res.json({ success: true, message: '任务已删除' })
  } catch (error) {
    console.error('删除任务失败:', error)
    res.status(500).json({ success: false, message: '删除任务失败' })
  }
})

// 下载任务生成的文件
router.get('/download/:filename', (req, res) => {
  try {
    const filename = req.params.filename
    const outputPath = path.join(__dirname, '../outputs', filename)

    if (!fs.existsSync(outputPath)) {
      return res.status(404).json({ success: false, message: '文件不存在' })
    }

    res.download(outputPath, filename)
  } catch (error) {
    console.error('下载文件失败:', error)
    res.status(500).json({ success: false, message: '下载文件失败' })
  }
})

export default router
