import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx'

export async function generateWordFile(content, formatSettings) {
  try {
    console.log('=== generateWordFile 开始 ===')
    console.log('content 类型:', typeof content)
    console.log('content 是否为数组:', Array.isArray(content))
    console.log('content 长度:', content?.length)
    console.log('formatSettings:', JSON.stringify(formatSettings, null, 2))

    // 参数验证
    if (!content || !Array.isArray(content)) {
      throw new Error('content 必须是数组')
    }

    if (!formatSettings) {
      throw new Error('formatSettings 不能为空')
    }

    // 安全获取格式设置，确保所有数值都是有效的数字
    const titleFormat = {
      fontFamily: formatSettings.titleFormat?.fontFamily || '黑体',
      fontSize: parseInt(String(formatSettings.titleFormat?.fontSize)) || 16,
      lineSpacing: parseFloat(String(formatSettings.titleFormat?.lineSpacing)) || 1.5,
      numberingStyle: formatSettings.titleFormat?.numberingStyle || 'none',
      beforeParagraph: parseInt(String(formatSettings.titleFormat?.beforeParagraph)) || 0,
      afterParagraph: parseInt(String(formatSettings.titleFormat?.afterParagraph)) || 0,
      indentation: parseInt(String(formatSettings.titleFormat?.indentation)) || 0
    }

    const bodyFormat = {
      fontFamily: formatSettings.bodyFormat?.fontFamily || '宋体',
      fontSize: parseInt(String(formatSettings.bodyFormat?.fontSize)) || 14,
      lineSpacing: parseFloat(String(formatSettings.bodyFormat?.lineSpacing)) || 1.5,
      beforeParagraph: parseInt(String(formatSettings.bodyFormat?.beforeParagraph)) || 0,
      afterParagraph: parseInt(String(formatSettings.bodyFormat?.afterParagraph)) || 0,
      indentation: parseInt(String(formatSettings.bodyFormat?.indentation)) || 0
    }

    const children = []

    // 处理每个章节
    content.forEach((section, sectionIndex) => {
      try {
        // 一级标题
        if (sectionIndex > 0) {
          children.push(new Paragraph({}))
        }

        let sectionTitle = section.title || `章节 ${sectionIndex + 1}`
        // 检测标题是否已包含编号，避免重复添加
        const hasExistingNumber = /^\d+[\.\、]\s*\d*\s*/.test(sectionTitle)
        const titleNumber = titleFormat.numberingStyle === 'none' && !hasExistingNumber ?
          `${sectionIndex + 1}. ${sectionTitle}` :
          sectionTitle

        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: {
              before: (titleFormat.beforeParagraph || 0) * 20,
              after: (titleFormat.afterParagraph || 0) * 20,
              line: (titleFormat.lineSpacing || 1.5) * 240
            },
            indent: {
              left: (titleFormat.indentation || 0) * 200
            },
            children: [
              new TextRun({
                text: titleNumber,
                font: titleFormat.fontFamily || '黑体',
                size: (titleFormat.fontSize || 16) * 2,
                bold: true,
                color: '000000'
              })
            ]
          })
        )

        // 一级章节内容
        if (section.content && typeof section.content === 'string') {
          const paragraphs = section.content.split('\n').filter(p => p.trim())
          paragraphs.forEach(para => {
            if (para.trim()) {
              children.push(createBodyParagraph(para, bodyFormat))
            }
          })
        }

        // 二级子章节
        if (section.children && Array.isArray(section.children) && section.children.length > 0) {
          section.children.forEach((child, childIndex) => {
            try {
              // 添加空行分隔
              if (childIndex > 0 || section.content) {
                children.push(new Paragraph({}))
              }

              let childTitle = child.title || `子章节 ${childIndex + 1}`
              // 检测标题是否已包含编号，避免重复添加
              const hasExistingChildNumber = /^\d+[\.\、]\s*\d*\s*/.test(childTitle)
              const subTitleNumber = titleFormat.numberingStyle === 'none' && !hasExistingChildNumber ?
                `${sectionIndex + 1}.${childIndex + 1} ${childTitle}` :
                childTitle

              children.push(
                new Paragraph({
                  heading: HeadingLevel.HEADING_2,
                  spacing: {
                    before: (titleFormat.beforeParagraph || 0) * 20,
                    after: (titleFormat.afterParagraph || 0) * 20,
                    line: (titleFormat.lineSpacing || 1.5) * 240
                  },
                  indent: {
                    left: (titleFormat.indentation || 0) * 200
                  },
                  children: [
                    new TextRun({
                      text: subTitleNumber,
                      font: titleFormat.fontFamily || '黑体',
                      size: ((titleFormat.fontSize || 16) - 2) * 2,
                      bold: true,
                      color: '000000'
                    })
                  ]
                })
              )

              // 二级章节内容
              if (child.content && typeof child.content === 'string') {
                const paragraphs = child.content.split('\n').filter(p => p.trim())
                paragraphs.forEach(para => {
                  if (para.trim()) {
                    children.push(createBodyParagraph(para, bodyFormat))
                  }
                })
              }
            } catch (childError) {
              console.error(`处理子章节 ${childIndex} 时出错:`, childError)
            }
          })
        }
      } catch (sectionError) {
        console.error(`处理章节 ${sectionIndex} 时出错:`, sectionError)
      }
    })

    console.log('children 数量:', children.length)

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440
            }
          }
        },
        children
      }]
    })

    const buffer = await Packer.toBuffer(doc)
    console.log('=== generateWordFile 完成 ===')
    return buffer
  } catch (error) {
    console.error('generateWordFile 错误:', error)
    console.error('错误堆栈:', error.stack)
    throw error
  }
}

function createBodyParagraph(text, format) {
  // 确保text是字符串
  if (typeof text !== 'string') {
    text = String(text || '')
  }

  const trimmedText = text.trim()
  if (!trimmedText) {
    return new Paragraph({ text: '' })
  }

  try {
    const lines = trimmedText.split(/(\d+\.\d+|\[.*?\]|\【.*?\】)/)

    if (lines.length === 1) {
      return new Paragraph({
        spacing: {
          before: (format.beforeParagraph || 0) * 20,
          after: (format.afterParagraph || 0) * 20,
          line: (format.lineSpacing || 1.5) * 240
        },
        indent: {
          firstLine: (format.indentation || 0) * 200
        },
        children: [
          new TextRun({
            text: trimmedText,
            font: format.fontFamily || '宋体',
            size: (format.fontSize || 14) * 2
          })
        ]
      })
    }

    const textRuns = lines.map(line => {
      if (!line || !line.trim()) return null

      if (/^\d+\.\d+/.test(line) || /^\[.*\]$/.test(line) || /^【.*】$/.test(line)) {
        return new TextRun({
          text: line,
          font: format.fontFamily || '宋体',
          size: (format.fontSize || 14) * 2,
          bold: true
        })
      } else {
        return new TextRun({
          text: line,
          font: format.fontFamily || '宋体',
          size: (format.fontSize || 14) * 2
        })
      }
    }).filter(Boolean)

    if (textRuns.length === 0) {
      return new Paragraph({ text: '' })
    }

    return new Paragraph({
      spacing: {
        before: (format.beforeParagraph || 0) * 20,
        after: (format.afterParagraph || 0) * 20,
        line: (format.lineSpacing || 1.5) * 240
      },
      indent: {
        firstLine: (format.indentation || 0) * 200
      },
      children: textRuns
    })
  } catch (error) {
    console.error('createBodyParagraph 错误:', error, 'text:', text, 'format:', format)
    // 返回一个空的段落作为fallback
    return new Paragraph({ text: '' })
  }
}

export async function generatePDFFile(content, formatSettings) {
  return Buffer.from('PDF content placeholder')
}
