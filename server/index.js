import express from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import apiRouter from './routes/api.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// 创建输出目录
const outputDir = path.join(__dirname, 'outputs')
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

// 静态文件服务（用于下载生成的文件）
app.use('/api/download', express.static(outputDir))

app.use('/api', apiRouter)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '服务运行中' })
})

// 服务前端静态文件
const distPath = path.join(__dirname, '../dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))

  // SPA 回退路由
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`)
})
