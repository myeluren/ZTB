import { Upload, Button, Space, Card, Typography, Progress } from 'tdesign-react'
import { FileAddIcon, DeleteIcon, CheckCircleIcon } from 'tdesign-icons-react'

const { Text } = Typography

interface FileUploaderProps {
  onUpload: (file: File) => void
  file: File | null
}

export default function FileUploader({ onUpload, file }: FileUploaderProps) {
  const handleChange = (context: { file: File }) => {
    if (context.file) {
      const validTypes = ['.pdf', '.doc', '.docx']
      const fileName = context.file.name
      const extension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase()
      
      if (!validTypes.includes(extension)) {
        return
      }
      onUpload(context.file)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-background-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-medium text-text mb-4">上传招标文件</h2>
        <p className="text-text-secondary text-sm mb-6">
          请上传PDF或Word格式的招标文件，系统将自动解析文件内容并生成投标文件大纲
        </p>
        
        {!file ? (
          <Upload
            draggable
            accept=".pdf,.doc,.docx"
            onChange={handleChange}
            multiple={false}
            max={1}
            className="w-full"
            ui="dragger"
          >
            <div className="p-12">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <FileAddIcon className="w-8 h-8 text-primary" />
                </div>
                <Text className="text-text mb-2">点击或拖拽招标文件到此处上传</Text>
                <Text className="text-text-muted text-xs">支持 PDF、Word 格式，单个文件不超过 50MB</Text>
              </div>
            </div>
          </Upload>
        ) : (
          <Card className="border border-primary/20 bg-primary/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <CheckCircleIcon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <Text className="text-text font-medium">{file.name}</Text>
                  <Text className="text-text-muted text-xs">{(file.size / 1024 / 1024).toFixed(2)} MB</Text>
                </div>
              </div>
              <Space>
                <Button variant="outline" size="small" icon={<DeleteIcon />} onClick={() => onUpload(null as any)}>
                  重新上传
                </Button>
              </Space>
            </div>
          </Card>
        )}
      </div>

      {file && (
        <div className="bg-background-white rounded-xl shadow-sm p-6">
          <h3 className="text-base font-medium text-text mb-4">下一步操作</h3>
          <Text className="text-text-secondary text-sm">
            招标文件上传成功后，系统将自动解析文件内容并生成投标文件大纲。您可以在下一步中对大纲进行修改和确认。
          </Text>
        </div>
      )}
    </div>
  )
}
