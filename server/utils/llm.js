import OpenAI from 'openai'

// 过滤 LLM 响应中的 thinking/推理内容
export function filterThinkingContent(content) {
  if (!content) return content

  // 移除 <thinking>...</thinking> 标签及其内容
  // 常见的 thinking 标签格式
  let filtered = content.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
  filtered = filtered.replace(/<thinking>[\s\S]*$/gi, '')
  filtered = filtered.replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '')
  filtered = filtered.replace(/<reasoning>[\s\S]*$/gi, '')
  filtered = filtered.replace(/<reflection>[\s\S]*?<\/reflection>/gi, '')

  // 移除被某些模型用作文本标记的 thinking 块（如独立成行的 "#### Thoughts:" 等）
  filtered = filtered.replace(/^####\s*Thoughts?:.*$/gim, '')
  filtered = filtered.replace(/^####\s*Reasoning:.*$/gim, '')
  filtered = filtered.replace(/^####\s*Thinking:.*$/gim, '')

  // 移除常见的思考过程前缀
  filtered = filtered.replace(/^Thought:.*$/gm, '')
  filtered = filtered.replace(/^Reasoning:.*$/gm, '')

  // 移除多餘的空白
  filtered = filtered.trim()

  return filtered
}

export async function callLLM({ apiKey, baseUrl, model, messages, temperature = 0.7, max_tokens = 2000 }) {
  console.log('=== callLLM 调用 ===')
  console.log('baseUrl:', baseUrl)
  console.log('model:', model)
  console.log('temperature:', temperature)
  console.log('max_tokens:', max_tokens)
  console.log('messages 数量:', messages.length)

  const openai = new OpenAI({
    apiKey,
    baseURL: baseUrl
  })

  const response = await openai.chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens
  })

  console.log('=== callLLM 响应 ===')
  console.log('response:', JSON.stringify(response, null, 2))

  return response
}
