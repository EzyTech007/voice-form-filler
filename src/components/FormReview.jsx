import { useState } from 'react'
import { useExport } from '../hooks/useExport'

export default function FormReview({ questions, answers, onEdit, onRestart, originalFile }) {
  const [editingField, setEditingField] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [exporting, setExporting] = useState(false)
  const { exportFilledPDF, exportAsJSON } = useExport()

  const fields = questions.map(q => q.field)
  const filledCount = fields.filter(f => answers[f] && answers[f] !== 'Skipped').length

  function startEdit(field) {
    setEditingField(field)
    setEditValue(answers[field] || '')
  }

  function saveEdit() {
    onEdit(editingField, editValue)
    setEditingField(null)
  }

  async function handleExportPDF() {
    setExporting(true)
    try {
      await exportFilledPDF(fields, answers, originalFile)
    } finally {
      setExporting(false)
    }
  }

  const fileLabel = originalFile
    ? originalFile.name.length > 28
      ? originalFile.name.slice(0, 25) + '...'
      : originalFile.name
    : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-600 mb-4">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white">Form Complete</h2>
          <p className="text-slate-400 mt-1">{filledCount} of {fields.length} fields filled</p>
          {fileLabel && (
            <p className="text-slate-500 text-xs mt-1">
              Original: <span className="text-slate-400">{fileLabel}</span>
            </p>
          )}
        </div>

        {/* Fields */}
        <div className="bg-slate-800/60 rounded-2xl border border-slate-700 divide-y divide-slate-700 mb-6">
          {questions.map((q, i) => {
            const value = answers[q.field]
            const isSkipped = value === 'Skipped' || !value
            const isEditing = editingField === q.field

            return (
              <div key={i} className="p-4 flex items-start gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5
                  ${isSkipped ? 'bg-slate-600' : 'bg-emerald-500'}`}>
                  {isSkipped ? (
                    <span className="text-slate-400 text-xs">—</span>
                  ) : (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-slate-400 text-xs font-medium mb-0.5">{q.field}</p>
                  {isEditing ? (
                    <div className="flex gap-2 mt-1">
                      <input
                        type="text"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && saveEdit()}
                        autoFocus
                        className="flex-1 bg-slate-700 border border-indigo-500 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none"
                      />
                      <button onClick={saveEdit}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors">
                        Save
                      </button>
                      <button onClick={() => setEditingField(null)}
                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <p className={`text-sm ${isSkipped ? 'text-slate-500 italic' : 'text-white'}`}>
                      {value || 'Not answered'}
                    </p>
                  )}
                </div>

                {!isEditing && (
                  <button onClick={() => startEdit(q.field)}
                    className="text-slate-500 hover:text-indigo-400 transition-colors flex-shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Export */}
        <div className="flex gap-3 mb-4">
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500
              text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {exporting ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating PDF...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {originalFile ? 'Download Filled Form (PDF)' : 'Download as PDF'}
              </>
            )}
          </button>

          <button
            onClick={() => exportAsJSON(fields, answers)}
            className="px-5 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            JSON
          </button>
        </div>

        <button
          onClick={onRestart}
          className="w-full py-3 border border-slate-600 hover:border-slate-500 text-slate-400 hover:text-white font-medium rounded-xl transition-colors"
        >
          Start Over
        </button>
      </div>
    </div>
  )
}
