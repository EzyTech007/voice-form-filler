import { useState } from 'react'

function extractFieldLabels(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const fieldPatterns = [
    /^(first\s*name|last\s*name|full\s*name|name)[\s:*]*/i,
    /^(email|e-mail|email\s*address)[\s:*]*/i,
    /^(phone|phone\s*number|mobile|telephone)[\s:*]*/i,
    /^(address|street\s*address|home\s*address)[\s:*]*/i,
    /^(city|town)[\s:*]*/i,
    /^(state|province|region)[\s:*]*/i,
    /^(zip|zip\s*code|postal\s*code)[\s:*]*/i,
    /^(country)[\s:*]*/i,
    /^(date\s*of\s*birth|dob|birth\s*date|birthday)[\s:*]*/i,
    /^(age)[\s:*]*/i,
    /^(gender|sex)[\s:*]*/i,
    /^(occupation|job\s*title|position)[\s:*]*/i,
    /^(company|employer|organization)[\s:*]*/i,
    /^(nationality|citizenship)[\s:*]*/i,
    /^(passport\s*number|id\s*number|national\s*id)[\s:*]*/i,
    /^(signature)[\s:*]*/i,
    /^(date)[\s:*]*/i,
    /^(marital\s*status)[\s:*]*/i,
    /^(emergency\s*contact)[\s:*]*/i,
    /^(relationship)[\s:*]*/i,
  ]

  const found = new Set()
  const fields = []

  for (const line of lines) {
    for (const pattern of fieldPatterns) {
      if (pattern.test(line)) {
        const label = line.replace(/[\s:*_]+$/, '').trim()
        const key = label.toLowerCase()
        if (!found.has(key) && label.length > 1 && label.length < 60) {
          found.add(key)
          fields.push(label)
        }
        break
      }
    }
    if (/^[A-Z][a-zA-Z\s]{2,40}:$/.test(line)) {
      const label = line.replace(/:$/, '').trim()
      const key = label.toLowerCase()
      if (!found.has(key)) { found.add(key); fields.push(label) }
    }
  }

  if (fields.length < 3) {
    for (const line of lines) {
      if (line.length > 2 && line.length < 50 && /^[A-Za-z]/.test(line)) {
        const label = line.replace(/[:\s*_]+$/, '').trim()
        const key = label.toLowerCase()
        if (!found.has(key) && label.split(' ').length <= 5) {
          found.add(key); fields.push(label)
        }
      }
      if (fields.length >= 15) break
    }
  }

  return fields.slice(0, 20)
}

async function parsePDF(file, onProgress) {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  let text = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    text += content.items.map(item => item.str).join('\n') + '\n'
    onProgress(Math.round((i / pdf.numPages) * 80))
  }
  return text
}

async function parseWord(file, onProgress) {
  const mammoth = await import('mammoth')
  onProgress(30)
  const arrayBuffer = await file.arrayBuffer()
  onProgress(60)
  const result = await mammoth.extractRawText({ arrayBuffer })
  onProgress(80)
  return result.value
}

// For images: use a free OCR.space API (no key needed for basic use)
// Falls back to prompting user to type fields manually if it fails
async function parseImage(file, onProgress) {
  onProgress(20)
  const formData = new FormData()
  formData.append('file', file)
  formData.append('language', 'eng')
  formData.append('isOverlayRequired', 'false')
  formData.append('apikey', 'helloworld') // free public demo key from ocr.space

  onProgress(40)
  const response = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    body: formData,
  })

  onProgress(70)
  const data = await response.json()

  if (data.IsErroredOnProcessing) {
    throw new Error(data.ErrorMessage?.[0] || 'OCR failed')
  }

  onProgress(80)
  return data.ParsedResults?.[0]?.ParsedText || ''
}

export function useFormParser() {
  const [parsing, setParsing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)

  async function parseFile(file) {
    setParsing(true)
    setError(null)
    setProgress(0)

    try {
      let text = ''
      const type = file.type
      const name = file.name.toLowerCase()

      if (type === 'application/pdf') {
        text = await parsePDF(file, setProgress)
      } else if (
        type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        name.endsWith('.docx')
      ) {
        text = await parseWord(file, setProgress)
      } else if (type.startsWith('image/')) {
        text = await parseImage(file, setProgress)
      } else {
        throw new Error('Unsupported file type')
      }

      setProgress(90)
      const fields = extractFieldLabels(text)
      setProgress(100)
      return fields
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setParsing(false)
    }
  }

  return { parseFile, parsing, progress, error }
}
