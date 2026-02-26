import { Button, Space, Card, Typography, Progress, Message, Icon } from 'tdesign-react'
import { RefreshIcon, DownloadIcon, PlayCircleIcon, CheckCircleIcon, ErrorCircleIcon, FileIcon } from 'tdesign-icons-react'
import { GenerationProgress } from '../types'

const { Text, Paragraph } = Typography

interface GenerationPanelProps {
  progress: GenerationProgress
  generatedFile: string | null
  onGenerate: () => void
  onReset: () => void
  onBack: () => void
}

export default function GenerationPanel({ 
  progress, 
  generatedFile, 
  onGenerate, 
  onReset,
  onBack 
}: GenerationPanelProps) {
  const isGenerating = progress.status === 'generating' || progress.status === 'building' || progress.status === 'parsing'
  const isComplete = progress.status === 'complete'
  const isError = progress.status === 'error'

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'parsing':
      case 'generating':
      case 'building':
        return <Icon name="loading" className="w-6 h-6 text-primary animate-spin" />
      case 'complete':
        return <CheckCircleIcon className="w-6 h-6 text-functional-success" />
      case 'error':
        return <ErrorCircleIcon className="w-6 h-6 text-functional-error" />
      default:
        return <PlayCircleIcon className="w-6 h-6 text-text-muted" />
    }
  }

  const getStatusColor = () => {
    switch (progress.status) {
      case 'complete':
        return 'success'
      case 'error':
        return 'error'
      case 'generating':
      case 'building':
      case 'parsing':
        return 'active'
      default:
        return 'default'
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-background-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-medium text-text mb-6">生成投标文件</h2>

        <Card className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            {getStatusIcon()}
            <div className="flex-1">
              <Text className="text-text font-medium block">{progress.message}</Text>
              {isGenerating && (
                <Text className="text-text-muted text-sm">请稍候，这可能需要几分钟时间</Text>
              )}
            </div>
          </div>
          
          {(isGenerating || isComplete) && (
            <Progress 
              percentage={progress.progress} 
              status={getStatusColor() as any}
              trackColor="#E7E7E7"
            />
          )}
        </Card>

        {!isGenerating && !isComplete && (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileIcon className="w-10 h-10 text-primary" />
            </div>
            <Paragraph className="text-text-secondary mb-6">
              所有配置已完成，点击下方按钮开始生成投标文件
            </Paragraph>
          </div>
        )}

        {isComplete && generatedFile && (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-functional-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircleIcon className="w-10 h-10 text-functional-success" />
            </div>
            <Text className="text-lg font-medium text-text block mb-2">投标文件生成成功</Text>
            <Text className="text-text-muted mb-6">文件已准备就绪，您可以下载查看</Text>
            
            <Button 
              theme="primary"
              size="large"
              icon={<DownloadIcon />}
              onClick={() => {
                const link = document.createElement('a')
                link.href = generatedFile
                link.download = '投标文件.docx'
                link.click()
                Message.success('文件下载已开始')
              }}
            >
              下载Word文件
            </Button>
          </div>
        )}

        {isError && (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-functional-error/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <ErrorCircleIcon className="w-10 h-10 text-functional-error" />
            </div>
            <Text className="text-lg font-medium text-functional-error block mb-2">生成失败</Text>
            <Text className="text-text-muted mb-6">请检查网络连接和大模型配置后重试</Text>
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={isGenerating}>
          上一步
        </Button>
        <Space>
          <Button 
            variant="outline" 
            icon={<RefreshIcon />} 
            onClick={onReset}
          >
            重新开始
          </Button>
          <Button 
            theme="primary" 
            icon={<PlayCircleIcon />} 
            onClick={onGenerate}
            disabled={isGenerating || isComplete}
            loading={isGenerating}
          >
            {isGenerating ? '生成中...' : '开始生成'}
          </Button>
        </Space>
      </div>
    </div>
  )
}
