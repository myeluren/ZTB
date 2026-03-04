# 智能投标标书生成系统 - 产品需求文档 (PRD)

## 项目概述
一个基于大语言模型的智能投标标书生成系统，帮助用户快速生成专业的投标文档。

## 版本历史
- **v1.0** - 初始版本：文件上传、大纲生成、格式设置、实时生成
- **v1.1** - 任务管理系统：后台任务执行、数据库持久化、断点续传、自动保存
- **v1.2** - 服务重启恢复：服务重启后自动恢复未完成任务、断点续传持久化

---

## 当前版本功能清单

### 1. 文件上传模块
**功能描述**：上传招标文件（PDF、Word格式）
- 支持拖拽上传
- 文件大小限制：50MB
- 自动解析文件内容并提取文本
- 解析后的内容用于大纲生成和内容生成

**技术实现**：
- 前端：React + Upload Zone组件
- 后端：`/api/parse-text` 接口，使用 mammoth (Word) 和 pdf-parse (PDF)

---

### 2. 大纲生成模块
**功能描述**：基于招标文件自动生成投标大纲
- 使用大语言模型分析招标文件
- 生成结构化大纲（一级标题、二级标题）
- 支持Markdown格式编辑
- 支持手动编辑大纲内容
- 支持切换编辑/预览模式

**技术实现**：
- 前端：App.tsx 大纲编辑区域
- 后端：`/api/generate-outline` 接口
- 支持默认大纲兜底（当LLM调用失败时）

---

### 3. 格式设置模块
**功能描述**：设置生成的投标文档格式
**配置项**：
- 内容风格：精细 / 概括
- 页数设置：可自定义页数（默认50页）
- 标题格式：
  - 字体、字号
  - 行间距
  - 编号样式
  - 段前段后间距
  - 首行缩进
- 正文格式：同标题格式配置

**技术实现**：
- 前端：FormatSettingsComponent 组件
- 后端：格式数据传递给 contentGen 服务

---

### 4. 任务管理系统（v1.1新增）

#### 4.1 任务生成列表
**功能描述**：记录每次生成的任务和任务生成进度情况
- 显示所有生成任务
- 实时显示任务状态
- 显示任务进度百分比
- 显示当前生成的章节
- 显示任务创建时间、完成时间
- 自动刷新（每5秒刷新运行中的任务）

**技术实现**：
- 前端：TaskList.tsx 组件
- 后端：`/api/tasks` (GET) 接口
- 数据库：SQLite tasks 表

#### 4.2 后台任务执行
**功能描述**：任务在后台执行，用户可关闭或刷新页面
- 任务创建后立即在后台开始执行
- 前端不阻塞，可以随时关闭或刷新
- 任务状态持久化到数据库
- 支持多个任务并发执行

**技术实现**：
- 后端：taskManager.js 服务
- 使用 Map 存储任务队列
- 独立的异步任务执行
- AbortController 支持任务中断

#### 4.3 断点续传
**功能描述**：支持暂停和继续任务
- 可暂停正在运行的任务
- 可继续已暂停的任务
- 支持失败任务重试
- 保存已生成内容的检查点

**技术实现**：
- 后端：`/api/tasks/:id/pause` 和 `/api/tasks/:id/resume` 接口
- 检查点保存：部分内容保存到 `task_{taskId}_partial.json`
- 恢复时从检查点继续生成

#### 4.4 数据库集成
**功能描述**：使用数据库持久化任务数据
- 数据库：SQLite（better-sqlite3）
- 数据表：tasks 表
- 索引：status、created_at

**tasks 表结构**：
```sql
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_name TEXT NOT NULL,
  file_name TEXT,
  file_content TEXT,
  outline TEXT,
  format_settings TEXT,
  llm_config TEXT,
  status TEXT DEFAULT 'pending',  -- pending, running, paused, completed, failed
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
```

**技术实现**：
- 数据库文件：`server/data/tasks.db`
- 初始化：server/db/database.js
- CRUD 操作：taskManager.js

#### 4.5 自动保存文档
**功能描述**：已生成的内容自动保存形成文档
- 任务完成后自动生成 Word 文档
- 保存到 `server/outputs` 目录
- 文件命名格式：`投标文件_{taskId}_{日期}.docx`
- 提供下载链接

**技术实现**：
- 后端：fileGen.js 生成 Word 文档
- 下载路径：`/api/download/{filename}`
- 前端：TaskList 组件下载按钮

#### 4.6 服务重启恢复 (v1.2新增)
**功能描述**：服务重启或页面刷新后，任务持续运行
- 服务启动时自动检查未完成的任务
- 将 running 状态的任务改为 pending 并自动重新执行
- 支持 pending 和 paused 状态的任务恢复
- 断点续传：已生成的内容从检查点文件恢复

**技术实现**：
- 后端：taskManager.js 新增 `getPendingTasks()` 和 `recoverPendingTasks()` 函数
- 服务启动时自动调用：`server/index.js` 中 `recoverPendingTasks()`
- 检查点文件：`outputs/task_{taskId}_partial.json`
- 前端轮询：TaskList 组件每5秒刷新运行中的任务

---

### 5. 大模型配置模块
**功能描述**：配置不同的 LLM 服务提供商
**支持供应商**：
- OpenAI
- Anthropic
- 阿里云通义千问
- 百度文心一言
- 智谱AI
- Moonshot
- 自定义

**配置项**：
- 供应商名称
- 官方链接
- API请求地址 (baseUrl)
- API Key
- 模型选择

**独立配置**：
- 招标文件分析配置
- 投标文件生成配置（可以使用不同的模型）

**技术实现**：
- 前端：LLM Config 弹窗组件
- 后端：`/api/config` (GET/POST) 接口
- 配置文件：`server/config.json`
- 调用工具：server/utils/llm.js

**支持的 LLM API**：
- 标准 OpenAI 兼容接口
- MiniMax API（自动转换域名：api.minimaxi.com → api.minimax.chat）

---

### 6. 用户界面
**设计风格**：
- 现代化、简洁、专业
- 响应式设计
- 蓝色主题（#0052D9）

**步骤流程**：
1. 上传文件
2. 确认大纲
3. 格式设置
4. 生成文件（创建后台任务）
5. 任务列表（查看进度和管理任务）

**主要组件**：
- App.tsx - 主应用
- FormatSettings.tsx - 格式设置
- TaskList.tsx - 任务列表

---

## 技术架构

### 前端
- **框架**：React 18.3.1 + TypeScript
- **构建工具**：Vite
- **样式**：TailwindCSS + 自定义CSS
- **状态管理**：React Hooks (useState, useEffect)

### 后端
- **运行时**：Node.js
- **框架**：Express
- **数据库**：SQLite (better-sqlite3)
- **模块系统**：ES Modules

### 服务结构
```
server/
├── index.js              # Express服务器入口
├── routes/
│   └── api.js           # API路由定义
├── services/
│   ├── taskManager.js    # 任务管理服务
│   ├── contentGen.js    # 内容生成服务
│   ├── fileGen.js       # Word文档生成服务
│   └── outlineGen.js    # 大纲生成服务
├── utils/
│   └── llm.js          # LLM调用工具
├── db/
│   └── database.js      # 数据库初始化
├── data/
│   └── tasks.db        # SQLite数据库文件
├── outputs/            # 生成的Word文档目录
└── uploads/            # 上传的文件目录
```

---

## API 接口列表

### 文件解析
- `POST /api/parse-text` - 解析上传的招标文件

### 大纲生成
- `POST /api/generate-outline` - 生成投标大纲

### 配置管理
- `GET /api/config` - 获取LLM配置
- `POST /api/config` - 保存LLM配置
- `GET /api/health` - 健康检查

### 任务管理
- `GET /api/tasks` - 获取任务列表
- `POST /api/tasks` - 创建新任务
- `GET /api/tasks/:id` - 获取任务详情
- `POST /api/tasks/:id/pause` - 暂停任务
- `POST /api/tasks/:id/resume` - 继续/重试任务
- `DELETE /api/tasks/:id` - 删除任务

### 文件下载
- `GET /api/download/:filename` - 下载生成的Word文档

---

## 已知问题和限制

### 1. Lint 警告
- `server/services/contentGen.js:229` - 未使用的变量 `level` 和 `style`
- 影响范围：不影响功能，仅代码质量问题

### 2. API 兼容性
- MiniMax API 需要域名转换（api.minimaxi.com → api.minimax.chat）
- 其他 LLM 供应商需要 OpenAI 兼容接口

### 3. 并发限制
- 当前版本支持多任务并发，但未设置并发数限制
- 可能导致资源耗尽或 API 调用速率限制

### 4. 错误处理和超时
- 部分错误未提供详细的用户友好的错误提示
- 网络错误、API 超时等场景需要改进
- 已添加 5 分钟 API 调用超时保护
- 已添加 LLM 调用重试机制（最多 2 次）
- 添加了详细的调用日志（耗时、token 使用量）

### 5. 思考内容过滤
- LLM 可能返回思考过程和推理内容
- 已实现多层次过滤机制：
  * XML 标签过滤（`<thinking>`, `<reasoning>`, `<reflection>` 等）
  * 文本标记过滤（`#### Thoughts:`, `Thinking:` 等）
  * 智能段落识别（识别"让我分析"、"我需要"等开头的内容）
  * 自动检测正文开始特征

---

## 后续优化建议

### 1. 性能优化
- 添加任务并发限制
- 实现任务优先级队列
- 优化数据库查询性能
- 添加缓存机制

### 2. 功能增强
- 支持任务模板
- 支持批量生成
- 添加任务历史搜索和筛选
- 支持导出任务列表

### 3. 用户体验
- 添加更多的错误提示和引导
- 支持进度条动画
- 添加任务完成通知
- 支持任务预览

### 4. 安全性
- API Key 加密存储
- 添加用户认证
- 实现文件访问权限控制
- 添加请求频率限制

### 5. 部署
- Docker 容器化
- 云端部署支持
- 数据库备份策略
- 日志系统完善

---

## 环境要求

### 开发环境
- Node.js >= 18
- npm >= 8

### 生产环境
- Linux/Windows/MacOS
- Node.js >= 18
- SQLite 数据库

### 依赖包
主要依赖见 `package.json`
- react, react-dom
- express
- better-sqlite3
- openai
- mammoth (Word解析)
- pdf-parse (PDF解析)
- docx (Word生成)

---

## 启动说明

### 前端启动
```bash
npm run dev
# 访问 http://localhost:5173
```

### 后端启动
```bash
node server/index.js
# 运行在 http://localhost:3001
```

### 数据库初始化
首次启动时自动创建数据库和表结构

---

## 更新日志

### v1.2 (当前版本 - 2026-02-27)
- ✅ 优化 LLM 调用超时和重试机制
- ✅ 增强 LLM 思考内容过滤（多层过滤算法）
- ✅ 添加详细的 API 调用日志（耗时、token 使用量）
- ✅ 修复路径计算问题（使用 process.cwd）
- ✅ 修复 outputs 目录创建问题
- ✅ 新增服务重启后自动恢复未完成任务
- ✅ 新增断点续传持久化（检查点文件）

### v1.1 (2026-02-26)
- ✅ 新增任务生成列表
- ✅ 新增后台任务执行
- ✅ 新增数据库持久化
- ✅ 新增断点续传功能
- ✅ 新增自动保存文档
- ✅ 修复 LLM 调用 404 错误（MiniMax API）
- ✅ 修复路径处理问题（Windows 环境兼容）
- ✅ 修复数据库初始化 SQL 语法错误
- ✅ 修复 TaskList 组件语法错误

### v1.0
- ✅ 文件上传和解析
- ✅ 大纲生成和编辑
- ✅ 格式设置
- ✅ 内容生成（SSE 流式输出）
- ✅ Word 文档生成
- ✅ LLM 配置管理

---

## 联系方式
- 项目路径：`d:/AI code/codebuddy`
- 前端端口：5173
- 后端端口：3001
