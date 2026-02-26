import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbDir = path.join(__dirname, '../data')
const dbPath = path.join(dbDir, 'tasks.db')

// 确保数据库目录存在
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

// 创建数据库连接
const db = new Database(dbPath)

// 初始化数据库表
function initDatabase() {
  // 任务表
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_name TEXT NOT NULL,
      file_name TEXT,
      file_content TEXT,
      outline TEXT,
      format_settings TEXT,
      llm_config TEXT,
      status TEXT DEFAULT 'pending',
      progress INTEGER DEFAULT 0,
      completed_sections INTEGER DEFAULT 0,
      total_sections INTEGER DEFAULT 0,
      current_section TEXT,
      generated_content TEXT,
      file_url TEXT,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME
    )
  `)

  // 创建索引
  db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC)`)

  console.log('数据库初始化完成')
}

// 任务状态枚举
export const TaskStatus = {
  PENDING: 'pending',      // 待开始
  RUNNING: 'running',      // 进行中
  PAUSED: 'paused',        // 已暂停
  COMPLETED: 'completed',  // 已完成
  FAILED: 'failed'         // 失败
}

// 初始化数据库
initDatabase()

export default db
