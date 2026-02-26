import { useState } from 'react'
import { FormatSettings as FormatSettingsType } from '../types'

interface FormatSettingsProps {
  settings: FormatSettingsType
  onChange: (settings: FormatSettingsType) => void
  onConfirm: () => void
  onBack: () => void
}

const fontOptions = [
  { label: '黑体', value: '黑体' },
  { label: '宋体', value: '宋体' },
  { label: '楷体', value: '楷体' },
  { label: '微软雅黑', value: '微软雅黑' },
]

const lineSpacingOptions = [
  { label: '1.0', value: 1.0 },
  { label: '1.5', value: 1.5 },
  { label: '2.0', value: 2.0 },
  { label: '2.5', value: 2.5 },
]

const numberingStyleOptions = [
  { label: '无编号', value: 'none' },
  { label: '数字编号 (1,2,3)', value: 'decimal' },
  { label: '中文数字 (一,二,三)', value: 'chinese' },
  { label: '字母编号 (A,B,C)', value: 'alpha' },
]

export default function FormatSettings({ settings, onChange, onConfirm, onBack }: FormatSettingsProps) {
  const [localSettings, setLocalSettings] = useState(settings)

  const handleStyleChange = (value: 'detailed' | 'concise') => {
    const newSettings = {
      ...localSettings,
      contentStyle: value,
      pageCount: value === 'detailed' ? 50 : 30
    }
    setLocalSettings(newSettings)
    onChange(newSettings)
  }

  const handlePageCountChange = (value: number) => {
    const newSettings = { ...localSettings, pageCount: value }
    setLocalSettings(newSettings)
    onChange(newSettings)
  }

  const handleTitleFormatChange = (field: string, value: any) => {
    const newSettings = {
      ...localSettings,
      titleFormat: {
        ...localSettings.titleFormat,
        [field]: value
      }
    }
    setLocalSettings(newSettings)
    onChange(newSettings)
  }

  const handleBodyFormatChange = (field: string, value: any) => {
    const newSettings = {
      ...localSettings,
      bodyFormat: {
        ...localSettings.bodyFormat,
        [field]: value
      }
    }
    setLocalSettings(newSettings)
    onChange(newSettings)
  }

  return (
    <div className="format-settings-container">
      {/* 内容风格 */}
      <div className="format-section">
        <h3 className="format-section-title">内容风格</h3>
        <div className="style-options">
          <label className={`style-option ${localSettings.contentStyle === 'detailed' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="contentStyle"
              value="detailed"
              checked={localSettings.contentStyle === 'detailed'}
              onChange={(e) => handleStyleChange(e.target.value as 'detailed' | 'concise')}
            />
            <div className="style-option-content">
              <span className="style-option-title">精细</span>
              <span className="style-option-desc">对每一个章节内容进行细致的编写，尽可能拆解招标文件进行响应</span>
            </div>
          </label>
          <label className={`style-option ${localSettings.contentStyle === 'concise' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="contentStyle"
              value="concise"
              checked={localSettings.contentStyle === 'concise'}
              onChange={(e) => handleStyleChange(e.target.value as 'detailed' | 'concise')}
            />
            <div className="style-option-content">
              <span className="style-option-title">概括</span>
              <span className="style-option-desc">相对于"精细"，不需要过于细致；基础原则是都要满足招标要求，不能偏离</span>
            </div>
          </label>
        </div>
      </div>

      {/* 预估页数 */}
      <div className="format-section">
        <h3 className="format-section-title">预估页数</h3>
        <div className="page-count-control">
          <input
            type="range"
            min={10}
            max={200}
            value={localSettings.pageCount}
            onChange={(e) => handlePageCountChange(parseInt(e.target.value))}
            className="page-count-slider"
          />
          <div className="page-count-input-wrapper">
            <input
              type="number"
              min={10}
              max={200}
              value={localSettings.pageCount}
              onChange={(e) => handlePageCountChange(parseInt(e.target.value) || 10)}
              className="page-count-input"
            />
            <span className="page-count-unit">页</span>
          </div>
        </div>
      </div>

      <div className="format-divider"></div>

      {/* 标题格式设置 */}
      <div className="format-section">
        <h3 className="format-section-title">标题格式设置</h3>
        <div className="format-grid">
          <div className="format-field">
            <label className="format-label">标题字体</label>
            <select
              value={localSettings.titleFormat.fontFamily}
              onChange={(e) => handleTitleFormatChange('fontFamily', e.target.value)}
              className="format-select"
            >
              {fontOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="format-field">
            <label className="format-label">标题字号 (pt)</label>
            <input
              type="number"
              min={12}
              max={24}
              value={localSettings.titleFormat.fontSize}
              onChange={(e) => handleTitleFormatChange('fontSize', parseInt(e.target.value) || 12)}
              className="format-input"
            />
          </div>
          <div className="format-field">
            <label className="format-label">标题行间距</label>
            <select
              value={localSettings.titleFormat.lineSpacing}
              onChange={(e) => handleTitleFormatChange('lineSpacing', parseFloat(e.target.value))}
              className="format-select"
            >
              {lineSpacingOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="format-field">
            <label className="format-label">标题编号样式</label>
            <select
              value={localSettings.titleFormat.numberingStyle}
              onChange={(e) => handleTitleFormatChange('numberingStyle', e.target.value)}
              className="format-select"
            >
              {numberingStyleOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="format-field">
            <label className="format-label">标题段前间距 (pt)</label>
            <input
              type="number"
              min={0}
              max={50}
              value={localSettings.titleFormat.beforeParagraph}
              onChange={(e) => handleTitleFormatChange('beforeParagraph', parseInt(e.target.value) || 0)}
              className="format-input"
            />
          </div>
          <div className="format-field">
            <label className="format-label">标题段后间距 (pt)</label>
            <input
              type="number"
              min={0}
              max={50}
              value={localSettings.titleFormat.afterParagraph}
              onChange={(e) => handleTitleFormatChange('afterParagraph', parseInt(e.target.value) || 0)}
              className="format-input"
            />
          </div>
          <div className="format-field full-width">
            <label className="format-label">标题缩进 (字符)</label>
            <input
              type="number"
              min={0}
              max={10}
              value={localSettings.titleFormat.indentation}
              onChange={(e) => handleTitleFormatChange('indentation', parseInt(e.target.value) || 0)}
              className="format-input"
            />
          </div>
        </div>
      </div>

      <div className="format-divider"></div>

      {/* 正文格式设置 */}
      <div className="format-section">
        <h3 className="format-section-title">正文格式设置</h3>
        <div className="format-grid body-format-grid">
          <div className="format-field">
            <label className="format-label">正文字体</label>
            <select
              value={localSettings.bodyFormat.fontFamily}
              onChange={(e) => handleBodyFormatChange('fontFamily', e.target.value)}
              className="format-select"
            >
              {fontOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="format-field">
            <label className="format-label">正文字号 (pt)</label>
            <input
              type="number"
              min={10}
              max={20}
              value={localSettings.bodyFormat.fontSize}
              onChange={(e) => handleBodyFormatChange('fontSize', parseInt(e.target.value) || 10)}
              className="format-input"
            />
          </div>
          <div className="format-field">
            <label className="format-label">正文行间距</label>
            <select
              value={localSettings.bodyFormat.lineSpacing}
              onChange={(e) => handleBodyFormatChange('lineSpacing', parseFloat(e.target.value))}
              className="format-select"
            >
              {lineSpacingOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="format-field">
            <label className="format-label">正文段前间距 (pt)</label>
            <input
              type="number"
              min={0}
              max={50}
              value={localSettings.bodyFormat.beforeParagraph}
              onChange={(e) => handleBodyFormatChange('beforeParagraph', parseInt(e.target.value) || 0)}
              className="format-input"
            />
          </div>
          <div className="format-field">
            <label className="format-label">正文段后间距 (pt)</label>
            <input
              type="number"
              min={0}
              max={50}
              value={localSettings.bodyFormat.afterParagraph}
              onChange={(e) => handleBodyFormatChange('afterParagraph', parseInt(e.target.value) || 0)}
              className="format-input"
            />
          </div>
          <div className="format-field full-width">
            <label className="format-label">正文首行缩进 (字符)</label>
            <input
              type="number"
              min={0}
              max={10}
              value={localSettings.bodyFormat.indentation}
              onChange={(e) => handleBodyFormatChange('indentation', parseInt(e.target.value) || 0)}
              className="format-input"
            />
          </div>
        </div>
      </div>

      {/* 格式预览 */}
      <div className="format-preview">
        <div className="format-preview-info">
          <span className="format-preview-title">格式预览</span>
          <span className="format-preview-desc">
            {localSettings.contentStyle === 'detailed' ? '精细风格' : '概括风格'} / {localSettings.titleFormat.fontFamily}标题{localSettings.titleFormat.fontSize}pt / {localSettings.bodyFormat.fontFamily}正文{localSettings.bodyFormat.fontSize}pt
          </span>
        </div>
        <div className="format-preview-count">
          <span className="format-preview-number">{localSettings.pageCount}</span>
          <span className="format-preview-unit">预估页数</span>
        </div>
      </div>
    </div>
  )
}
