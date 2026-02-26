import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'
import mammoth from 'mammoth'

const require = createRequire(import.meta.url)
const pdfParse = require('pdf-parse')

export async function parseFile(filePath, fileName) {
  const ext = path.extname(fileName).toLowerCase()

  try {
    if (ext === '.pdf') {
      return await extractTextFromPDF(filePath)
    } else if (ext === '.doc' || ext === '.docx') {
      return await extractTextFromDocx(filePath)
    } else if (ext === '.txt') {
      return fs.readFileSync(filePath, 'utf-8')
    } else {
      throw new Error('不支持的文件格式')
    }
  } catch (error) {
    console.error('文件解析错误:', error)
    throw new Error('无法解析文件内容: ' + error.message)
  }
}

export async function extractTextFromPDF(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath)
    const data = await pdfParse(dataBuffer)
    return data.text
  } catch (error) {
    console.error('PDF解析错误:', error)
    throw new Error('PDF文件解析失败，请确保文件格式正确')
  }
}

export async function extractTextFromDocx(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath)
    const result = await mammoth.extractRawText({ buffer: dataBuffer })
    return result.value
  } catch (error) {
    console.error('Word文档解析错误:', error)
    throw new Error('Word文档解析失败，请确保文件格式正确')
  }
}
