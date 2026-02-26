import { callLLM, filterThinkingContent } from '../utils/llm.js'

export async function generateOutline(fileContent, llmConfig = null) {
  const prompt = `请仔细阅读以下招标文件内容，然后生成一个结构化的投标文件大纲。

招标文件内容：
${fileContent}

要求：
1. 大纲应该符合投标文件的标准格式
2. 包含技术方案、项目管理、实施计划、售后服务等常规章节
3. 根据招标文件的具体要求调整章节内容
4. 输出JSON格式的大纲，每个章节包含id、title、level和children字段

请只输出JSON格式的大纲，不要输出其他内容。格式示例：
[
  {
    "id": "section-0",
    "title": "第一章 项目概况",
    "level": 1,
    "children": [
      {"id": "section-0-0", "title": "1.1 项目背景", "level": 2}
    ]
  }
]`

  try {
    const config = llmConfig || {
      apiKey: '',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4'
    }

    console.log('=== generateOutline 开始 ===')
    console.log('fileContent 长度:', fileContent?.length)
    console.log('llmConfig:', JSON.stringify(config, null, 2))

    const response = await callLLM({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      model: config.model,
      messages: [
        { role: 'system', content: '你是一个专业的投标文件编写助手，擅长生成结构化的投标文件大纲。请根据招标文件的具体内容生成对应的大纲章节。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 4000
    })

    console.log('=== LLM 响应 ===')
    console.log('response.choices:', response.choices?.length)

    if (!response.choices || response.choices.length === 0) {
      throw new Error('LLM返回的响应没有choices字段')
    }

    const text = response.choices[0].message.content

    // 过滤掉 thinking/推理内容
    const filteredText = filterThinkingContent(text)

    console.log('LLM返回内容长度:', filteredText?.length)
    console.log('LLM返回内容前1000字符:', filteredText?.substring(0, 1000))
    console.log('LLM返回完整内容:')
    console.log(filteredText)

    const jsonMatch = filteredText.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      try {
        const outline = JSON.parse(jsonMatch[0])
        console.log('大纲生成成功，章节数量:', outline.length)
        return outline.map((item, index) => ({
          id: `section-${index}`,
          ...item,
          level: 1,
          children: item.children ? item.children.map((child, cIndex) => ({
            id: `section-${index}-${cIndex}`,
            ...child,
            level: 2
          })) : []
        }))
      } catch (parseError) {
        console.error('JSON解析失败:')
        console.error('解析错误:', parseError.message)
        console.error('JSON内容:', jsonMatch[0])
        console.log('使用默认大纲')
        return getDefaultOutline()
      }
    }

    console.warn('未能从LLM响应中解析出大纲JSON，使用默认大纲')
    return getDefaultOutline()
  } catch (error) {
    console.error('生成大纲失败:')
    console.error('错误类型:', error.constructor.name)
    console.error('错误消息:', error.message)
    console.error('错误堆栈:', error.stack)

    // 返回默认大纲，但添加一个标记让前端知道这是默认大纲
    const defaultOutline = getDefaultOutline()
    // 在第一个章节添加错误信息标记
    if (defaultOutline.length > 0) {
      defaultOutline[0]._error = '大模型调用失败：' + error.message
    }
    return defaultOutline
  }
}

function getDefaultOutline() {
  return [
    {
      id: 'section-0',
      title: '第一章 项目理解',
      level: 1,
      children: [
        { id: 'section-0-0', title: '1.1 项目背景', level: 2 },
        { id: 'section-0-1', title: '1.2 需求分析', level: 2 },
        { id: 'section-0-2', title: '1.3 建设目标', level: 2 }
      ]
    },
    {
      id: 'section-1',
      title: '第二章 技术方案',
      level: 1,
      children: [
        { id: 'section-1-0', title: '2.1 系统架构设计', level: 2 },
        { id: 'section-1-1', title: '2.2 功能模块说明', level: 2 },
        { id: 'section-1-2', title: '2.3 技术选型', level: 2 }
      ]
    },
    {
      id: 'section-2',
      title: '第三章 项目实施',
      level: 1,
      children: [
        { id: 'section-2-0', title: '3.1 实施计划', level: 2 },
        { id: 'section-2-1', title: '3.2 项目团队', level: 2 },
        { id: 'section-2-2', title: '3.3 质量管理', level: 2 }
      ]
    },
    {
      id: 'section-3',
      title: '第四章 售后服务',
      level: 1,
      children: [
        { id: 'section-3-0', title: '4.1 服务内容', level: 2 },
        { id: 'section-3-1', title: '4.2 响应承诺', level: 2 },
        { id: 'section-3-2', title: '4.3 培训计划', level: 2 }
      ]
    },
    {
      id: 'section-4',
      title: '第五章 项目报价',
      level: 1,
      children: [
        { id: 'section-4-0', title: '5.1 报价说明', level: 2 },
        { id: 'section-4-1', title: '5.2 报价明细', level: 2 }
      ]
    }
  ]
}
