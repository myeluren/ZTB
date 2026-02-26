import { useState } from 'react'
import { Button, Space, Card, Input, Typography, Collapse, Icon, Message } from 'tdesign-react'
import { AddIcon, RemoveIcon, ChevronDownIcon, ChevronUpIcon, CheckIcon } from 'tdesign-icons-react'
import { OutlineItem } from '../types'

const { Text } = Typography

interface OutlineEditorProps {
  outline: OutlineItem[]
  onChange: (outline: OutlineItem[]) => void
  onConfirm: () => void
  onBack: () => void
}

export default function OutlineEditor({ outline, onChange, onConfirm, onBack }: OutlineEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [expandedKeys, setExpandedKeys] = useState<string[]>([])

  const handleAddItem = (parentId?: string) => {
    const newItem: OutlineItem = {
      id: `item-${Date.now()}`,
      title: '新章节',
      level: parentId ? 2 : 1,
      children: parentId ? undefined : []
    }

    if (parentId) {
      const addToParent = (items: OutlineItem[]): OutlineItem[] => {
        return items.map(item => {
          if (item.id === parentId) {
            return {
              ...item,
              children: [...(item.children || []), { ...newItem, level: 2 }]
            }
          }
          if (item.children) {
            return { ...item, children: addToParent(item.children) }
          }
          return item
        })
      }
      onChange(addToParent(outline))
    } else {
      onChange([...outline, newItem])
    }
  }

  const handleRemoveItem = (id: string) => {
    const removeFromList = (items: OutlineItem[]): OutlineItem[] => {
      return items.filter(item => item.id !== id).map(item => {
        if (item.children) {
          return { ...item, children: removeFromList(item.children) }
        }
        return item
      })
    }
    onChange(removeFromList(outline))
  }

  const handleEditStart = (item: OutlineItem) => {
    setEditingId(item.id)
    setEditValue(item.title)
  }

  const handleEditConfirm = (id: string) => {
    const updateItem = (items: OutlineItem[]): OutlineItem[] => {
      return items.map(item => {
        if (item.id === id) {
          return { ...item, title: editValue }
        }
        if (item.children) {
          return { ...item, children: updateItem(item.children) }
        }
        return item
      })
    }
    onChange(updateItem(outline))
    setEditingId(null)
  }

  const toggleExpand = (id: string) => {
    setExpandedKeys(prev => 
      prev.includes(id) ? prev.filter(k => k !== id) : [...prev, id]
    )
  }

  const renderOutlineItem = (item: OutlineItem, index: number) => {
    const isExpanded = expandedKeys.includes(item.id)
    const hasChildren = item.children && item.children.length > 0

    return (
      <div key={item.id} className="mb-2">
        <div 
          className={`flex items-center gap-2 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors ${
            item.level === 1 ? 'ml-0' : 'ml-8'
          }`}
        >
          {hasChildren && (
            <button 
              onClick={() => toggleExpand(item.id)}
              className="p-1 hover:bg-gray-200 rounded"
            >
              {isExpanded ? (
                <ChevronUpIcon className="w-4 h-4 text-text-muted" />
              ) : (
                <ChevronDownIcon className="w-4 h-4 text-text-muted" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-6" />}

          <span className="text-text-muted text-sm font-medium w-6">
            {item.level === 1 ? `${index + 1}` : `${index + 1}.${(item.children?.length || 0) + 1}`}
          </span>

          {editingId === item.id ? (
            <Input
              value={editValue}
              onChange={setEditValue}
              onBlur={() => handleEditConfirm(item.id)}
              onEnter={() => handleEditConfirm(item.id)}
              autoFocus
              className="flex-1"
            />
          ) : (
            <Text 
              className="flex-1 cursor-pointer hover:text-primary"
              onClick={() => handleEditStart(item)}
            >
              {item.title}
            </Text>
          )}

          <Space>
            <button 
              onClick={() => handleAddItem(item.id)}
              className="p-1.5 hover:bg-primary/10 rounded text-primary"
              title="添加子章节"
            >
              <AddIcon className="w-4 h-4" />
            </button>
            <button 
              onClick={() => handleRemoveItem(item.id)}
              className="p-1.5 hover:bg-functional-error/10 rounded text-functional-error"
              title="删除"
            >
              <RemoveIcon className="w-4 h-4" />
            </button>
          </Space>
        </div>

        {hasChildren && isExpanded && item.children && (
          <div className="mt-2">
            {item.children.map((child, childIndex) => renderOutlineItem(child, childIndex))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-background-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-medium text-text mb-4">投标文件大纲</h2>
        <p className="text-text-secondary text-sm mb-6">
          以下是根据招标文件自动生成的大纲，您可以进行修改、调整顺序或增删章节
        </p>

        <div className="space-y-2">
          {outline.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              <Text>暂无大纲，请先上传招标文件</Text>
            </div>
          ) : (
            outline.map((item, index) => renderOutlineItem(item, index))
          )}
        </div>

        {outline.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <Button variant="outline" icon={<AddIcon />} onClick={() => handleAddItem()}>
              添加章节
            </Button>
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          上一步
        </Button>
        <Button 
          theme="primary" 
          icon={<CheckIcon />} 
          onClick={onConfirm}
          disabled={outline.length === 0}
        >
          确认大纲并继续
        </Button>
      </div>
    </div>
  )
}
