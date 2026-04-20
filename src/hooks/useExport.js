export function useExport() {

  function exportAsJSON(fields, answers) {
    const data = {}
    fields.forEach(f => { data[f] = answers[f] || '' })
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'filled-form.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Render original PDF pages as images, then overlay answers
  async function exportFilledPDF(fields, answers, originalFile) {
    const { jsPDF } = await import('jspdf')

    const isPDF = originalFile?.type === 'application/pdf'
    const isImage = originalFile?.type?.startsWith('image/')

    if (isPDF) {
      await exportOverlaidPDF(fields, answers, originalFile, jsPDF)
    } else if (isImage) {
      await exportImageWithOverlay(fields, answers, originalFile, jsPDF)
    } else {
      // DOCX or no file — generate a clean styled form PDF
      await exportStyledFormPDF(fields, answers, jsPDF)
    }
  }

  return { exportAsJSON, exportFilledPDF }
}

// ── PDF: render each page to canvas, draw answers on top ──────────────────────
async function exportOverlaidPDF(fields, answers, file, jsPDF) {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  // Render all pages to canvases first
  const scale = 2
  const pageCanvases = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
    pageCanvases.push({ canvas, viewport })
  }

  // Build answer overlay on first page canvas
  const { canvas: firstCanvas } = pageCanvases[0]
  const ctx = firstCanvas.getContext('2d')

  // Find blank lines / underscores in the PDF to position answers
  // Strategy: draw answers sequentially in the lower portion of the page
  // as a clean overlay block
  const blockX = firstCanvas.width * 0.05
  let blockY = firstCanvas.height * 0.55
  const lineH = firstCanvas.height * 0.045

  ctx.font = `bold ${lineH * 0.5}px Arial`
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.fillRect(blockX - 8, blockY - lineH, firstCanvas.width * 0.9, lineH * (fields.length + 1.5))

  fields.forEach((field, i) => {
    const val = answers[field]
    if (!val || val === 'Skipped') return
    const y = blockY + i * lineH

    // Label
    ctx.font = `bold ${lineH * 0.38}px Arial`
    ctx.fillStyle = '#374151'
    ctx.fillText(`${field}:`, blockX, y)

    // Value
    ctx.font = `${lineH * 0.42}px Arial`
    ctx.fillStyle = '#1e40af'
    ctx.fillText(val, blockX + firstCanvas.width * 0.28, y)

    // Underline
    ctx.strokeStyle = '#d1d5db'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(blockX, y + lineH * 0.15)
    ctx.lineTo(blockX + firstCanvas.width * 0.88, y + lineH * 0.15)
    ctx.stroke()
  })

  // Create jsPDF from canvases
  const { width: w, height: h } = pageCanvases[0].viewport
  const doc = new jsPDF({
    orientation: w > h ? 'landscape' : 'portrait',
    unit: 'px',
    format: [w / scale, h / scale],
  })

  pageCanvases.forEach(({ canvas }, idx) => {
    if (idx > 0) doc.addPage([canvas.width / scale, canvas.height / scale])
    doc.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, canvas.width / scale, canvas.height / scale)
  })

  doc.save('filled-form.pdf')
}

// ── Image: draw answers over the image ────────────────────────────────────────
async function exportImageWithOverlay(fields, answers, file, jsPDF) {
  const img = await loadImage(file)
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0)

  const lineH = canvas.height * 0.04
  const blockX = canvas.width * 0.05
  let blockY = canvas.height * 0.6

  ctx.fillStyle = 'rgba(255,255,255,0.88)'
  ctx.fillRect(blockX - 8, blockY - lineH, canvas.width * 0.9, lineH * (fields.length + 1.5))

  fields.forEach((field, i) => {
    const val = answers[field]
    if (!val || val === 'Skipped') return
    const y = blockY + i * lineH
    ctx.font = `bold ${lineH * 0.38}px Arial`
    ctx.fillStyle = '#374151'
    ctx.fillText(`${field}:`, blockX, y)
    ctx.font = `${lineH * 0.42}px Arial`
    ctx.fillStyle = '#1e40af'
    ctx.fillText(val, blockX + canvas.width * 0.28, y)
    ctx.strokeStyle = '#d1d5db'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(blockX, y + lineH * 0.15)
    ctx.lineTo(blockX + canvas.width * 0.88, y + lineH * 0.15)
    ctx.stroke()
  })

  const doc = new jsPDF({
    orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
    unit: 'px',
    format: [canvas.width, canvas.height],
  })
  doc.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, canvas.width, canvas.height)
  doc.save('filled-form.pdf')
}

// ── DOCX / fallback: clean styled form PDF ────────────────────────────────────
async function exportStyledFormPDF(fields, answers, jsPDF) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 20

  // Header bar
  doc.setFillColor(30, 64, 175)
  doc.rect(0, 0, pageW, 28, 'F')
  doc.setFontSize(16)
  doc.setTextColor(255, 255, 255)
  doc.setFont(undefined, 'bold')
  doc.text('Filled Form', margin, 18)
  doc.setFontSize(9)
  doc.setFont(undefined, 'normal')
  doc.text(`Generated ${new Date().toLocaleDateString()}`, pageW - margin, 18, { align: 'right' })

  let y = 42
  doc.setFontSize(11)

  fields.forEach((field, i) => {
    if (y > pageH - 25) {
      doc.addPage()
      y = 20
    }

    const val = answers[field] || ''
    const isSkipped = !val || val === 'Skipped'

    // Alternating row background
    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252)
      doc.rect(margin - 4, y - 6, pageW - (margin - 4) * 2, 14, 'F')
    }

    // Field label
    doc.setFont(undefined, 'bold')
    doc.setTextColor(71, 85, 105)
    doc.text(field, margin, y)

    // Answer value
    doc.setFont(undefined, 'normal')
    doc.setTextColor(isSkipped ? 148 : 30, isSkipped ? 163 : 64, isSkipped ? 175 : 175)
    const displayVal = isSkipped ? '—' : val
    doc.text(displayVal, pageW / 2, y)

    // Bottom border
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.3)
    doc.line(margin - 4, y + 5, pageW - margin + 4, y + 5)

    y += 16
  })

  // Footer
  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184)
  doc.text('Voice Form Filler', pageW / 2, pageH - 8, { align: 'center' })

  doc.save('filled-form.pdf')
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = reject
    img.src = url
  })
}
