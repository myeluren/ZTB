import OpenAI from 'openai'

// 过滤 LLM 响应中的 thinking/推理内容
export function filterThinkingContent(content) {
  if (!content) return content

  let filtered = content

  // 1. 移除 XML 标签及其内容
  // 常见的 thinking 标签格式
  filtered = filtered.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
  filtered = filtered.replace(/<thinking>[\s\S]*$/gi, '')
  filtered = filtered.replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '')
  filtered = filtered.replace(/<reasoning>[\s\S]*$/gi, '')
  filtered = filtered.replace(/<reflection>[\s\S]*?<\/reflection>/gi, '')
  filtered = filtered.replace(/<thought_process>[\s\S]*?<\/thought_process>/gi, '')
  filtered = filtered.replace(/<thought_process>[\s\S]*$/gi, '')

  // 2. 移除被某些模型用作文本标记的 thinking 块（如独立成行的 "#### Thoughts:" 等）
  filtered = filtered.replace(/^####\s*Thoughts?:.*$/gim, '')
  filtered = filtered.replace(/^####\s*Reasoning:.*$/gim, '')
  filtered = filtered.replace(/^####\s*Thinking:.*$/gim, '')
  filtered = filtered.replace(/^####\s*Thought_process:.*$/gim, '')

  // 3. 移除常见的思考过程前缀
  filtered = filtered.replace(/^Thought:.*$/gm, '')
  filtered = filtered.replace(/^Reasoning:.*$/gm, '')
  filtered = filtered.replace(/^Thinking:.*$/gm, '')
  filtered = filtered.replace(/^Thought_process:.*$/gm, '')

  // 4. 检测并移除整段思考内容
  // 识别模式：以"让我分析"、"让我思考"、"首先"、"从...中"等开头的段落
  // 如果段落连续出现多个，可能是思考过程
  const lines = filtered.split('\n')
  const filteredLines = []
  let inThinkingBlock = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmedLine = line.trim()

    // 检测思考内容特征
    const isThinkingLine = 
      trimmedLine.match(/^(让我|我需要|首先|接下来|从.*?中|分析.*?相关|我打算|我将|考虑.*?的情况)/) ||
      trimmedLine.match(/^(思路|步骤|方法|过程|分析|理解|判断)/) ||
      trimmedLine.match(/^(\d+[\.\、]\s*(需要|我会|从|分析))/)

    // 检测是否进入思考块
    if (isThinkingLine && !inThinkingBlock) {
      // 检查下一行是否也是思考内容
      if (i + 1 < lines.length) {
        const nextLineTrimmed = lines[i + 1].trim()
        const nextIsThinking = nextLineTrimmed.match(/^(让我|我需要|首先|接下来|从.*?中|分析.*?相关|我打算|我将)/)
        if (nextIsThinking) {
          inThinkingBlock = true
          continue
        }
      }
    }

    // 如果在思考块中，检查是否退出
    if (inThinkingBlock) {
      // 检测思考块结束的特征
      const isEndOfThinking = 
        trimmedLine.match(/^(项目将|系统将|本项目|该系统|项目涵盖|重点关注)/) ||
        trimmedLine.match(/^(第|一|二|三|四|五|六|七|八|九|十|一、|二、|三、|1\.|2\.|3\.)/) ||
        trimmedLine.includes('核心包括') ||
        trimmedLine.includes('主要目标')

      if (isEndOfThinking || !isThinkingLine) {
        inThinkingBlock = false
        // 保留这一行（正文开始）
        filteredLines.push(line)
      }
    } else {
      filteredLines.push(line)
    }
  }

  filtered = filteredLines.join('\n')

  // 5. 移除多余空白行
  filtered = filtered.replace(/\n{3,}/g, '\n\n')
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

  // 处理不同的API提供商的baseUrl格式
  let baseURL = baseUrl

  // MiniMax API特殊处理
  if (baseURL.includes('minimaxi')) {
    // 将 api.minimaxi.com 替换为 api.minimax.chat
    baseURL = baseURL.replace('api.minimaxi.com', 'api.minimax.chat')
  }

  // 确保以/v1结尾（标准OpenAI兼容格式）
  if (!baseURL.endsWith('/v1')) {
    if (baseURL.endsWith('/')) {
      baseURL = baseURL + 'v1'
    } else {
      baseURL = baseURL + '/v1'
    }
  }

  console.log('处理后的baseURL:', baseURL)

  const openai = new OpenAI({
    apiKey,
    baseURL,
    timeout: 300000, // 5分钟超时
    maxRetries: 2
  })

  const startTime = Date.now()
  const response = await openai.chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens
  })
  const endTime = Date.now()

  console.log('=== callLLM 响应 ===')
  console.log('耗时:', (endTime - startTime) / 1000, '秒')
  console.log('response choices:', response.choices.length)
  console.log('response usage:', response.usage)

  return response
}
