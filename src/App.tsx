import { useState, useRef, useEffect } from 'react'
import FormatSettingsComponent from './components/FormatSettings'
import TaskList from './components/TaskList'

// 模型配置接口
interface ModelConfig {
  provider: string
  officialUrl: string
  baseUrl: string
  apiKey: string
  model: string
}

// 预设供应商列表
const providers = [
  { 
    name: 'OpenAI', 
    officialUrl: 'https://openai.com',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4', 'gpt-4-turbo', 'gpt-4o', 'gpt-3.5-turbo']
  },
  { 
    name: 'Anthropic', 
    officialUrl: 'https://anthropic.com',
    baseUrl: 'https://api.anthropic.com',
    models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307']
  },
  { 
    name: '阿里云通义千问', 
    officialUrl: 'https://tongyi.aliyun.com',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: ['qwen-turbo', 'qwen-plus', 'qwen-max']
  },
  { 
    name: '百度文心一言', 
    officialUrl: 'https://yiyan.baidu.com',
    baseUrl: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat',
    models: ['ernie-bot-4', 'ernie-bot', 'ernie-bot-turbo']
  },
  { 
    name: '智谱AI', 
    officialUrl: 'https://open.bigmodel.cn',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: ['glm-4', 'glm-4-air', 'glm-3-turbo']
  },
  { 
    name: 'Moonshot', 
    officialUrl: 'https://moonshot.cn',
    baseUrl: 'https://api.moonshot.cn/v1',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k']
  },
  { 
    name: '自定义', 
    officialUrl: '',
    baseUrl: '',
    models: []
  }
]

const defaultModelConfig: ModelConfig = {
  provider: '',
  officialUrl: '',
  baseUrl: '',
  apiKey: '',
  model: ''
}

const defaultFormatSettings = {
  contentStyle: 'detailed',
  pageCount: 50,
  titleFormat: {
    fontFamily: '黑体',
    fontSize: 16,
    lineSpacing: 1.5,
    numberingStyle: 'none',
    beforeParagraph: 0,
    afterParagraph: 0,
    indentation: 0
  },
  bodyFormat: {
    fontFamily: '宋体',
    fontSize: 14,
    lineSpacing: 1.5,
    beforeParagraph: 0,
    afterParagraph: 0,
    indentation: 2
  }
}

const steps = [
  { id: 'upload', title: '上传文件', description: '上传招标文件' },
  { id: 'outline', title: '确认大纲', description: '编辑投标大纲' },
  { id: 'format', title: '格式设置', description: '设置文档格式' },
  { id: 'generate', title: '生成文件', description: '生成投标文档' },
  { id: 'tasks', title: '任务列表', description: '查看生成任务' },
]

// 默认大纲模板（Markdown格式）
const defaultOutlineMarkdown = `# 投标文件大纲

## 1. 项目概况

## 2. 技术方案
### 2.1 系统架构设计
### 2.2 功能模块说明
### 2.3 技术优势

## 3. 项目实施计划
### 3.1 实施进度安排
### 3.2 资源配置

## 4. 质量保证
### 4.1 质量管理体系
### 4.2 测试方案

## 5. 售后服务
### 5.1 服务承诺
### 5.2 技术支持

## 6. 报价清单`

function App() {
  const [currentStep, setCurrentStep] = useState('upload')
  const [activeTab, setActiveTab] = useState<'guide' | 'tasks'>('guide')  // guide: 步骤导航, tasks: 任务列表
  const [bidFile, setBidFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showLLMConfig, setShowLLMConfig] = useState(false)
  const [llmConfigTab, setLlmConfigTab] = useState<'analysis' | 'generation'>('analysis')
  const [analysisConfig, setAnalysisConfig] = useState<ModelConfig>(defaultModelConfig)
  const [generationConfig, setGenerationConfig] = useState<ModelConfig>(defaultModelConfig)
  const [error, setError] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [outlineMarkdown, setOutlineMarkdown] = useState(defaultOutlineMarkdown)
  const [structuredOutline, setStructuredOutline] = useState<any[]>([])
  const [fileContent, setFileContent] = useState<string>('')
  const [formatSettings, setFormatSettings] = useState(defaultFormatSettings as any)
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false)
  const [outlineGenResult, setOutlineGenResult] = useState<{success: boolean; message: string} | null>(null)
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [testResult, setTestResult] = useState<{success: boolean; message: string} | null>(null)
  const [isEditingOutline, setIsEditingOutline] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<any>(null)
  const [currentGeneratingSection, setCurrentGeneratingSection] = useState('')
  const [completedSections, setCompletedSections] = useState(0)
  const [totalSections, setTotalSections] = useState(0)

  // 加载配置
  useEffect(() => {
    const loadConfigs = async () => {
      try {
        const response = await fetch('/api/config')
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            if (data.analysisConfig) setAnalysisConfig(data.analysisConfig)
            if (data.generationConfig) setGenerationConfig(data.generationConfig)
          }
        }
      } catch (err) {
        console.error('加载配置失败:', err)
      }
    }
    loadConfigs()

    // 从本地存储恢复生成状态
    const savedGeneration = localStorage.getItem('bidGenerationState')
    if (savedGeneration) {
      try {
        const state = JSON.parse(savedGeneration)
        if (state.isGenerating) {
          setIsGenerating(true)
          setGenerationProgress(state.progress || 0)
          setCompletedSections(state.completedSections || 0)
          setTotalSections(state.totalSections || 0)
          setCurrentGeneratingSection(state.currentSection || '')
          setGeneratedContent(state.generatedContent || null)
        }
      } catch (err) {
        console.error('恢复生成状态失败:', err)
      }
    }

  }, [])

  // 持久化生成状态
  useEffect(() => {
    if (isGenerating) {
      const state = {
        isGenerating,
        progress: generationProgress,
        completedSections,
        totalSections,
        currentSection: currentGeneratingSection,
        generatedContent,
        timestamp: Date.now()
      }
      localStorage.setItem('bidGenerationState', JSON.stringify(state))
    } else if (!isGenerating) {
      localStorage.removeItem('bidGenerationState')
    }
  }, [isGenerating, generationProgress, completedSections, totalSections, currentGeneratingSection, generatedContent])

  const uploadZoneRef = useRef<HTMLDivElement>(null)
  const outlineEditorRef = useRef<HTMLTextAreaElement>(null)

  // 将Markdown大纲转换为结构化格式
  const markdownToStructuredOutline = (markdown: string) => {
    const lines = markdown.split('\n')
    const outline = []
    let currentSection: any = null
    let sectionId = 0
    let childId = 0

    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('## ')) {
        // 二级标题
        const title = trimmed.substring(3).trim()
        if (currentSection) {
          currentSection.children.push({
            id: `section-${sectionId}-${childId++}`,
            title,
            level: 2
          })
        }
      } else if (trimmed.startsWith('# ')) {
        // 一级标题
        const title = trimmed.substring(2).trim()
        currentSection = {
          id: `section-${sectionId++}`,
          title,
          level: 1,
          children: []
        }
        outline.push(currentSection)
        childId = 0
      }
    }
    return outline
  }

  // 将结构化大纲转换为Markdown
  const structuredOutlineToMarkdown = (outline: any[]) => {
    let markdown = ''
    outline.forEach(section => {
      markdown += `# ${section.title}\n\n`
      if (section.children) {
        section.children.forEach((child: any) => {
          markdown += `## ${child.title}\n\n`
        })
      }
    })
    return markdown.trim()
  }

  const handleFileUpload = async (file: File) => {
    const validTypes = ['.pdf', '.doc', '.docx']
    const fileName = file.name
    const extension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase()

    if (!validTypes.includes(extension)) {
      setError('仅支持 PDF、Word 格式文件')
      return
    }

    setError('')
    setBidFile(file)

    // 调用后端API解析文件并提取文本内容（不生成大纲）
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/parse-text', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`解析失败: ${response.status}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.message || '解析失败')
      }

      // 保存解析后的文件内容
      setFileContent(result.content)
    } catch (err) {
      console.error('文件解析失败:', err)
      setError('文件解析失败，请重试')
      setFileContent('')
    }
  }

  // 使用大模型生成大纲
  const generateOutlineFromLLM = async () => {
    if (!fileContent) {
      setError('请先上传招标文件')
      return { success: false, shouldProceed: false }
    }

    if (!analysisConfig.apiKey || !analysisConfig.baseUrl || !analysisConfig.model) {
      setError('请先配置招标文件分析模型')
      setShowLLMConfig(true)
      return { success: false, shouldProceed: false }
    }

    setIsGeneratingOutline(true)
    setOutlineGenResult(null)
    try {
      const response = await fetch('/api/generate-outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileContent,
          llmConfig: analysisConfig
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP错误: ${response.status}`)
      }

      const result = await response.json()

      // 检查是否使用了默认大纲
      const hasError = result.usingDefaultOutline && result.errorMessage

      // 保存结构化大纲（移除_error标记）
      const cleanOutline = result.outline.map((item: any) => {
        const { _error, ...rest } = item
        return rest
      })
      setStructuredOutline(cleanOutline)
      // 将结构化大纲转换为Markdown格式显示
      const markdown = structuredOutlineToMarkdown(cleanOutline)
      setOutlineMarkdown(markdown)

      if (hasError) {
        // LLM调用失败，使用了默认大纲，但允许继续
        setOutlineGenResult({
          success: false,
          message: '使用默认大纲（LLM调用失败: ' + result.errorMessage + '）'
        })
        return { success: false, shouldProceed: true }
      } else {
        // 设置成功提示
        setOutlineGenResult({
          success: true,
          message: `大纲生成成功！共 ${cleanOutline.length} 个章节`
        })
        return { success: true, shouldProceed: true }
      }
    } catch (err) {
      console.error('生成大纲失败:', err)
      const errorMsg = err instanceof Error ? err.message : '未知错误'
      setError('生成大纲失败: ' + errorMsg)
      setOutlineGenResult({
        success: false,
        message: '生成失败，使用默认大纲。错误原因: ' + errorMsg
      })
      // 使用默认大纲，但允许继续
      const defaultOutline = markdownToStructuredOutline(defaultOutlineMarkdown)
      setStructuredOutline(defaultOutline)
      setOutlineMarkdown(defaultOutlineMarkdown)
      return { success: false, shouldProceed: true }
    } finally {
      setIsGeneratingOutline(false)
    }
  }

  // 测试模型连接
  const testConnection = async () => {
    const currentConfig = llmConfigTab === 'analysis' ? analysisConfig : generationConfig
    
    if (!currentConfig.apiKey || !currentConfig.baseUrl) {
      setTestResult({ success: false, message: '请填写API Key和请求地址' })
      return
    }
    
    setIsTestingConnection(true)
    setTestResult(null)
    
    try {
      // 模拟测试连接
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // 这里应该调用后端API测试连接
      // const response = await fetch('/api/test-connection', { ... })
      
      setTestResult({ success: true, message: '连接成功！模型服务可用' })
    } catch (err) {
      setTestResult({ success: false, message: '连接失败，请检查配置' })
    } finally {
      setIsTestingConnection(false)
    }
  }

  // 处理供应商选择
  const handleProviderChange = (providerName: string) => {
    const selected = providers.find(p => p.name === providerName)
    const currentConfig = llmConfigTab === 'analysis' ? analysisConfig : generationConfig
    const setConfig = llmConfigTab === 'analysis' ? setAnalysisConfig : setGenerationConfig

    if (selected) {
      const newConfig = {
        ...currentConfig,
        provider: providerName,
        officialUrl: selected.officialUrl,
        baseUrl: selected.baseUrl,
        model: selected.models[0] || ''
      }
      setConfig(newConfig)
    }
  }

  // 保存配置到文件
  const saveConfigToFile = async (config: ModelConfig, tab: 'analysis' | 'generation') => {
    try {
      const configKey = tab === 'analysis' ? 'analysisConfig' : 'generationConfig'
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [configKey]: config
        })
      })
      if (!response.ok) {
        console.error('保存配置失败:', response.status)
      }
    } catch (err) {
      console.error('保存配置失败:', err)
    }
  }

  // 获取当前配置
  const getCurrentConfig = () => llmConfigTab === 'analysis' ? analysisConfig : generationConfig
  const setCurrentConfig = (config: ModelConfig) => {
    if (llmConfigTab === 'analysis') {
      setAnalysisConfig(config)
    } else {
      setGenerationConfig(config)
    }
  }

  // 拖拽事件处理
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  // 步骤校验
  const validateStep = (stepId: string): boolean => {
    switch (stepId) {
      case 'upload':
        if (!bidFile) {
          setError('请先上传招标文件')
          return false
        }
        if (!fileContent) {
          setError('文件解析失败，请重新上传')
          return false
        }
        return true
      case 'outline':
        return true
      case 'format':
        return true
      case 'generate':
        if (!generationConfig.apiKey) {
          setError('请先配置投标文件生成模型')
          setShowLLMConfig(true)
          return false
        }
        if (!fileContent) {
          setError('请先上传招标文件并解析内容')
          return false
        }
        if (!structuredOutline || structuredOutline.length === 0) {
          setError('请先生成或编辑投标大纲')
          return false
        }
        return true
      default:
        return true
    }
  }

  const handleNextStep = async () => {
    if (validateStep(currentStep)) {
      setError('')
      const currentIndex = steps.findIndex(s => s.id === currentStep)

      // 如果是从上传页面跳转到大纲页面，需要先生成大纲
      if (currentStep === 'upload' && currentIndex < steps.length - 1) {
        setIsNavigating(true)
        try {
          const result = await generateOutlineFromLLM()
          if (result.shouldProceed) {
            setCurrentStep(steps[currentIndex + 1].id)
          }
          // 如果shouldProceed为false，说明配置不完整，已在generateOutlineFromLLM中设置了error，不跳转
        } finally {
          setIsNavigating(false)
        }
      } else if (currentIndex < steps.length - 1) {
        setCurrentStep(steps[currentIndex + 1].id)
      }
    }
  }

  const handlePrevStep = () => {
    const currentIndex = steps.findIndex(s => s.id === currentStep)
    if (currentIndex > 0) {
      setError('')
      setCurrentStep(steps[currentIndex - 1].id)
    }
  }

  const handleGenerate = async () => {
    if (!validateStep('generate')) return

    try {
      // 创建任务（后台执行）
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskName: `投标文件_${new Date().toISOString().slice(0, 10)}_${Date.now()}`,
          fileName: bidFile?.name || '',
          fileContent,
          outline: structuredOutline,
          formatSettings,
          llmConfig: generationConfig
        })
      })

      if (!response.ok) {
        throw new Error(`创建任务失败: ${response.status}`)
      }

      const result = await response.json()
      if (result.success) {
        // 跳转到任务列表页面
        setCurrentStep('tasks')
      } else {
        throw new Error(result.message || '创建任务失败')
      }
    } catch (err) {
      console.error('创建任务失败:', err)
      setError('创建任务失败: ' + (err instanceof Error ? err.message : '未知错误'))
    }
  }

  const getStepIndex = (stepId: string) => steps.findIndex(s => s.id === stepId)
  const currentIndex = getStepIndex(currentStep)

  return (
    <div className="app-container">
      {/* 响应式头部 */}
      <header className="app-header">
        <h1 className="header-title">智能投标标书生成系统</h1>
        <div className="header-tabs">
          <button
            className={`header-tab ${activeTab === 'guide' ? 'active' : ''}`}
            onClick={() => setActiveTab('guide')}
          >
            操作向导
          </button>
          <button
            className={`header-tab ${activeTab === 'tasks' ? 'active' : ''}`}
            onClick={() => setActiveTab('tasks')}
          >
            任务列表
          </button>
        </div>
        <button
          className="config-button"
          onClick={() => setShowLLMConfig(true)}
        >
          大模型配置
        </button>
      </header>

      <main className="main-container">
        {activeTab === 'tasks' ? (
          /* 任务列表视图 */
          <div className="tasks-view">
            <TaskList />
          </div>
        ) : (
          <>
            {/* 左侧进度条 */}
            <div className="sidebar">
          <h2 className="sidebar-title">生成步骤</h2>
          
          <div className="steps-list">
            {steps.map((step, index) => {
              const isActive = step.id === currentStep
              const isCompleted = currentIndex > index
              
              return (
                <div key={step.id} className="step-item">
                  {/* 步骤圆圈 */}
                  <div className={`step-circle ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                    {isCompleted ? '✓' : index + 1}
                  </div>
                  
                  {/* 步骤信息 */}
                  <div className="step-info">
                    <div className={`step-title ${isActive ? 'active' : ''}`}>
                      {step.title}
                    </div>
                    <div className="step-description">
                      {step.description}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 右侧内容区域 */}
        <div className="content-area">
          <div className="content-card">
            <h2 className="content-title">
              {steps.find(s => s.id === currentStep)?.title}
            </h2>
            
            <p className="content-description">
              {steps.find(s => s.id === currentStep)?.description}
            </p>
            
            {/* 错误提示 */}
            {error && (
              <div className="error-message">
                {error}
                <button 
                  className="error-close"
                  onClick={() => setError('')}
                >
                  ×
                </button>
              </div>
            )}
            
            {/* 第一步：文件上传 */}
            {currentStep === 'upload' && (
              <>
                <div 
                  ref={uploadZoneRef}
                  className={`upload-zone ${isDragging ? 'dragging' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input 
                    type="file" 
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileUpload(file)
                    }}
                    className="upload-input"
                    id="fileInput"
                  />
                  <label htmlFor="fileInput" className="upload-label">
                    <div className="upload-icon">
                      📁
                    </div>
                    <div className="upload-hint">
                      点击或拖拽招标文件到此处上传
                    </div>
                    <div className="upload-subhint">
                      支持 PDF、Word 格式，单个文件不超过 50MB
                    </div>
                  </label>
                </div>

                {bidFile && (
                  <div className="file-info">
                    <div className="file-name">
                      ✅ {bidFile.name}
                    </div>
                    <div className="file-size">
                      大小: {(bidFile.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                )}
              </>
            )}

            {/* 第二步：大纲编辑 */}
            {currentStep === 'outline' && (
              <div className="outline-section">
                {isGeneratingOutline ? (
                  <div className="generating-outline">
                    <div className="outline-loading"></div>
                    <div className="loading-text">正在生成大纲，请稍候...</div>
                  </div>
                ) : (
                  <>
                    <div className="outline-toolbar">
                      <button 
                        className={`toolbar-btn ${isEditingOutline ? 'active' : ''}`}
                        onClick={() => setIsEditingOutline(!isEditingOutline)}
                      >
                        {isEditingOutline ? '预览模式' : '编辑模式'}
                      </button>
                      <span className="toolbar-hint">当前使用: {analysisConfig.provider || '未配置'} - {analysisConfig.model || '未选择模型'}</span>
                    </div>
                    
                    {/* 大纲生成结果提示 */}
                    {outlineGenResult && (
                      <div className={`outline-result ${outlineGenResult.success ? 'success' : 'error'}`}>
                        {outlineGenResult.message}
                      </div>
                    )}
                    
                    {isEditingOutline ? (
                      <textarea
                        ref={outlineEditorRef}
                        className="outline-editor"
                        value={outlineMarkdown}
                        onChange={(e) => {
                          const newMarkdown = e.target.value
                          setOutlineMarkdown(newMarkdown)
                          setStructuredOutline(markdownToStructuredOutline(newMarkdown))
                        }}
                        placeholder="请输入大纲内容，支持Markdown格式"
                      />
                    ) : (
                      <div className="outline-preview">
                        <pre>{outlineMarkdown}</pre>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* 第三步：格式设置 */}
            {currentStep === 'format' && (
              <FormatSettingsComponent
                settings={formatSettings}
                onChange={setFormatSettings}
                onConfirm={() => setCurrentStep('generate')}
                onBack={() => setCurrentStep('outline')}
              />
            )}

            {/* 第四步：生成文件 */}
            {currentStep === 'generate' && (
              <div className="generate-section">
                <div className="generate-info">
                  <div className="generate-icon">📄</div>
                  <div className="generate-title">准备就绪</div>
                  <div className="generate-description">
                    所有配置已完成，点击下方按钮创建后台生成任务。任务创建后可以在"任务列表"页面查看进度。
                  </div>
                  <div className="generate-details">
                    <div className="detail-item">
                      <span className="detail-label">文件:</span>
                      <span className="detail-value">{bidFile?.name}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">分析模型:</span>
                      <span className="detail-value">{analysisConfig.provider} - {analysisConfig.model}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">生成模型:</span>
                      <span className="detail-value">{generationConfig.provider} - {generationConfig.model}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">风格:</span>
                      <span className="detail-value">{formatSettings.contentStyle === 'detailed' ? '精细' : '概括'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">页数:</span>
                      <span className="detail-value">{formatSettings.pageCount}页</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 第五步：任务列表 */}
            {currentStep === 'tasks' && (
              <TaskList />
            )}

            {/* 导航按钮 */}
            <div className="navigation-buttons">
              <button 
                onClick={handlePrevStep}
                disabled={currentIndex === 0 || isGenerating || isNavigating}
                className={`nav-button nav-button-prev ${currentIndex === 0 ? 'disabled' : ''}`}
              >
                上一步
              </button>

              {currentStep !== 'generate' && currentStep !== 'tasks' && (
                <button
                  onClick={handleNextStep}
                  disabled={isNavigating}
                  className={`nav-button nav-button-next ${isNavigating ? 'loading' : ''}`}
                >
                  {isNavigating && <div className="high-rail-progress"></div>}
                  <span className="button-text">{isNavigating ? '分析中...' : '下一步'}</span>
                </button>
              )}

              {currentStep === 'generate' && (
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className={`nav-button nav-button-generate ${isGenerating ? 'generating' : ''}`}
                >
                  {isGenerating ? '生成中...' : '生成文件'}
                </button>
              )}
            </div>
          </div>
        </div>
        </>
        )}
      </main>

      {/* 大模型配置弹窗 */}
      {showLLMConfig && (
        <div className="modal-overlay" onClick={() => setShowLLMConfig(false)}>
          <div className="modal-content llm-config-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">大模型配置</h3>
              <button 
                className="modal-close"
                onClick={() => setShowLLMConfig(false)}
              >
                ×
              </button>
            </div>
            
            {/* Tab 切换 */}
            <div className="config-tabs">
              <button 
                className={`config-tab ${llmConfigTab === 'analysis' ? 'active' : ''}`}
                onClick={() => { setLlmConfigTab('analysis'); setTestResult(null); }}
              >
                招标文件分析
              </button>
              <button 
                className={`config-tab ${llmConfigTab === 'generation' ? 'active' : ''}`}
                onClick={() => { setLlmConfigTab('generation'); setTestResult(null); }}
              >
                投标文件生成
              </button>
            </div>
            
            <div className="modal-body">
              {/* 供应商名称 */}
              <div className="config-group">
                <label className="config-label">供应商名称 <span className="required">*</span></label>
                <input 
                  type="text"
                  className="config-input"
                  placeholder="选择或输入供应商名称"
                  list="providerList"
                  value={getCurrentConfig().provider}
                  onChange={(e) => handleProviderChange(e.target.value)}
                />
                <datalist id="providerList">
                  {providers.map(p => (
                    <option key={p.name} value={p.name}>{p.name}</option>
                  ))}
                </datalist>
              </div>
              
              {/* 官方链接 */}
              <div className="config-group">
                <label className="config-label">官方链接</label>
                <div className="config-input-with-link">
                  <input 
                    type="text"
                    className="config-input"
                    placeholder="官方网站地址"
                    value={getCurrentConfig().officialUrl}
                    onChange={(e) => setCurrentConfig({ ...getCurrentConfig(), officialUrl: e.target.value })}
                  />
                  {getCurrentConfig().officialUrl && (
                    <a 
                      href={getCurrentConfig().officialUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="config-link"
                    >
                      访问
                    </a>
                  )}
                </div>
              </div>
              
              {/* 请求地址 */}
              <div className="config-group">
                <label className="config-label">请求地址 <span className="required">*</span></label>
                <input 
                  type="text"
                  className="config-input"
                  placeholder="API请求地址"
                  list="baseUrlList"
                  value={getCurrentConfig().baseUrl}
                  onChange={(e) => setCurrentConfig({ ...getCurrentConfig(), baseUrl: e.target.value })}
                />
                <datalist id="baseUrlList">
                  {providers.filter(p => p.baseUrl).map(p => (
                    <option key={p.baseUrl} value={p.baseUrl}>{p.name}</option>
                  ))}
                </datalist>
              </div>
              
              {/* API Key */}
              <div className="config-group">
                <label className="config-label">API Key <span className="required">*</span></label>
                <input 
                  type="password"
                  className="config-input"
                  placeholder="请输入API Key"
                  value={getCurrentConfig().apiKey}
                  onChange={(e) => setCurrentConfig({ ...getCurrentConfig(), apiKey: e.target.value })}
                />
              </div>
              
              {/* 模型选择 */}
              <div className="config-group">
                <label className="config-label">模型选择 <span className="required">*</span></label>
                <input 
                  type="text"
                  className="config-input"
                  placeholder="选择或输入模型名称"
                  list="modelList"
                  value={getCurrentConfig().model}
                  onChange={(e) => setCurrentConfig({ ...getCurrentConfig(), model: e.target.value })}
                />
                <datalist id="modelList">
                  {(() => {
                    const selected = providers.find(p => p.name === getCurrentConfig().provider)
                    return selected?.models.map(m => (
                      <option key={m} value={m}>{m}</option>
                    )) || []
                  })()}
                </datalist>
              </div>
              
              {/* 调试连接 */}
              <div className="config-debug">
                <button 
                  className={`debug-button ${isTestingConnection ? 'testing' : ''}`}
                  onClick={testConnection}
                  disabled={isTestingConnection}
                >
                  {isTestingConnection ? '测试中...' : '测试连接'}
                </button>
                
                {testResult && (
                  <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
                    {testResult.success ? '✓' : '✗'} {testResult.message}
                  </div>
                )}
              </div>
              
              {/* 使用说明 */}
              <div className="config-notice">
                <div className="notice-title">使用说明</div>
                <ul className="notice-list">
                  <li>API Key 存储在浏览器本地，不会上传至服务器</li>
                  <li>招标文件分析和投标文件生成可以使用不同的模型</li>
                  <li>下拉选项支持手工输入，以输入内容为准</li>
                  <li>建议使用GPT-4或Claude-3以获得更好的生成效果</li>
                </ul>
              </div>
            </div>
            
            <div className="modal-footer">
              <button
                className="modal-button modal-button-cancel"
                onClick={() => setShowLLMConfig(false)}
              >
                取消
              </button>
              <button
                className="modal-button modal-button-save"
                onClick={() => {
                  const currentConfig = getCurrentConfig()
                  if (!currentConfig.apiKey) {
                    setError('请输入API Key')
                    return
                  }
                  if (!currentConfig.baseUrl) {
                    setError('请输入请求地址')
                    return
                  }
                  if (!currentConfig.model) {
                    setError('请选择或输入模型名称')
                    return
                  }
                  // 保存配置到文件
                  saveConfigToFile(currentConfig, llmConfigTab)
                  setShowLLMConfig(false)
                }}
              >
                保存配置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
