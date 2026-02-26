import { useState } from 'react'
import { Dialog, Button, Space, Form, Input, Select, InputAdornment, Message } from 'tdesign-react'
import { LockOnIcon, SaveIcon } from 'tdesign-icons-react'
import { LLMConfig as LLMConfigType } from '../types'

const { FormItem } = Form

interface LLMConfigProps {
  config: LLMConfigType
  onChange: (config: LLMConfigType) => void
  onClose: () => void
}

const modelOptions = [
  { label: 'GPT-4', value: 'gpt-4' },
  { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
  { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
  { label: 'Claude-3 Opus', value: 'claude-3-opus-20240229' },
  { label: 'Claude-3 Sonnet', value: 'claude-3-sonnet-20240229' },
  { label: '通义千问', value: 'qwen-turbo' },
  { label: '文心一言', value: 'ernie-bot' },
]

const baseUrlOptions = [
  { label: 'OpenAI', value: 'https://api.openai.com/v1' },
  { label: 'OpenAI 兼容接口', value: 'https://api.openai.com/v1' },
  { label: 'Azure OpenAI', value: 'https://your-resource.openai.azure.com/openai' },
  { label: ' Anthropic', value: 'https://api.anthropic.com' },
  { label: '阿里云通义', value: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
  { label: '百度智能云', value: 'https://qianfan.baidubce.com/v2' },
]

export default function LLMConfig({ config, onChange, onClose }: LLMConfigProps) {
  const [localConfig, setLocalConfig] = useState<LLMConfigType>(config)
  const [showKey, setShowKey] = useState(false)

  const handleSave = () => {
    if (!localConfig.apiKey) {
      Message.warning('请输入API Key')
      return
    }
    onChange(localConfig)
    Message.success('配置保存成功')
    onClose()
  }

  return (
    <Dialog
      header="大模型配置"
      visible={true}
      onClose={onClose}
      footer={
        <Space>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button theme="primary" icon={<SaveIcon />} onClick={handleSave}>保存配置</Button>
        </Space>
      }
      width="500px"
    >
      <div className="space-y-6 py-4">
        <div>
          <FormItem label="API Key" required>
            <Input
              value={localConfig.apiKey}
              onChange={(value) => setLocalConfig({ ...localConfig, apiKey: value })}
              type={showKey ? 'text' : 'password'}
              placeholder="请输入API Key"
              prefixIcon={<LockOnIcon />}
              suffix={
                <button 
                  onClick={() => setShowKey(!showKey)}
                  className="text-text-muted hover:text-text"
                >
                  {showKey ? '隐藏' : '显示'}
                </button>
              }
            />
          </FormItem>
        </div>

        <div>
          <FormItem label="Base URL">
            <Select
              value={localConfig.baseUrl}
              onChange={(value) => setLocalConfig({ ...localConfig, baseUrl: value as string })}
              options={baseUrlOptions}
              className="w-full"
            />
          </FormItem>
        </div>

        <div>
          <FormItem label="自定义Base URL">
            <Input
              value={localConfig.baseUrl}
              onChange={(value) => setLocalConfig({ ...localConfig, baseUrl: value })}
              placeholder="如需使用自定义接口，请输入URL"
            />
          </FormItem>
        </div>

        <div>
          <FormItem label="模型选择" required>
            <Select
              value={localConfig.model}
              onChange={(value) => setLocalConfig({ ...localConfig, model: value as string })}
              options={modelOptions}
              className="w-full"
              placeholder="选择大模型"
            />
          </FormItem>
        </div>

        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm text-blue-700">
            <div className="font-medium mb-1">使用说明</div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>API Key 存储在浏览器本地，不会上传至服务器</li>
              <li>不同标书可以使用不同的模型进行生成</li>
              <li>建议使用GPT-4或Claude-3以获得更好的生成效果</li>
            </ul>
          </div>
        </div>
      </div>
    </Dialog>
  )
}
