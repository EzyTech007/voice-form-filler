import { useRef, useState } from 'react'

export default function UploadScreen({ onUpload, parsing, progress }) {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)

  function handleFile(file) {
    if (!file) return
    const allowed = [
      'application/pdf',
      'image/jpeg', 'image/png', 'image/jpg',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]
    const name = file.name.toLowerCase()
    if (!allowed.includes(file.type) && !name.endsWith('.docx')) {
      alert('Please upload a PDF, DOCX, JPG, or PNG file.')
      return
    }
    onUpload(file)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <div className="max-w-lg w-full text-center">
        {/* Logo / Title */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Voice Form Filler</h1>
          <p className="text-slate-400">Upload a form and fill it out with your voice</p>
        </div>

        {/* Upload Zone */}
        {!parsing ? (
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-12 cursor-pointer transition-all duration-200
              ${dragOver
                ? 'border-indigo-400 bg-indigo-500/10'
                : 'border-slate-600 hover:border-indigo-500 hover:bg-slate-700/30'
              }`}
          >
            <div className="flex flex-col items-center gap-4">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors
                ${dragOver ? 'bg-indigo-500/20' : 'bg-slate-700'}`}>
                <svg className="w-7 h-7 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <p className="text-white font-medium text-lg">Drop your form here</p>
                <p className="text-slate-400 text-sm mt-1">or click to browse</p>
              </div>
              <div className="flex gap-2">
                {['PDF', 'DOCX', 'JPG', 'PNG'].map(ext => (
                  <span key={ext} className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded-md font-mono">
                    {ext}
                  </span>
                ))}
              </div>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.docx"
              className="hidden"
              onChange={e => handleFile(e.target.files[0])}
            />
          </div>
        ) : (
          <div className="border-2 border-slate-700 rounded-2xl p-12 bg-slate-800/50">
            <div className="flex flex-col items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-indigo-500/20 flex items-center justify-center">
                <svg className="w-7 h-7 text-indigo-400 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-medium">Parsing your form...</p>
                <p className="text-slate-400 text-sm mt-1">Extracting field labels</p>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-slate-400 text-sm">{progress}%</p>
            </div>
          </div>
        )}

        <p className="text-slate-500 text-xs mt-6">
          Your form is processed locally. No data is sent to any server except for AI question generation.
        </p>
      </div>
    </div>
  )
}
