import { useState } from 'react'
import { ELEVENLABS_VOICES } from '../hooks/useVoice'

export default function FieldPreview({
  fields, onStart, onBack,
  apiKey, onApiKeyChange,
  elevenKey, onElevenKeyChange,
  voiceId, onVoiceChange,
  loadingQuestions
}) {
  const [editingFields, setEditingFields] = useState([...fields])
  const [newField, setNewField] = useState('')

  function removeField(i) {
    setEditingFields(prev => prev.filter((_, idx) => idx !== i))
  }

  function addField() {
    const trimmed = newField.trim()
    if (trimmed && !editingFields.includes(trimmed)) {
      setEditingFields(prev => [...prev, trimmed])
      setNewField('')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">

        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <button onClick={onBack} className="text-slate-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h2 className="text-2xl font-bold text-white">Detected Fields</h2>
            <p className="text-slate-400 text-sm">{editingFields.length} fields found — edit before starting</p>
          </div>
        </div>

        {/* Fields list */}
        <div className="bg-slate-800/60 rounded-2xl border border-slate-700 p-6 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
            {editingFields.map((field, i) => (
              <div key={i} className="flex items-center gap-2 bg-slate-700/50 rounded-lg px-3 py-2 group">
                <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 text-xs flex items-center justify-center font-bold flex-shrink-0">
                  {i + 1}
                </span>
                <span className="text-slate-200 text-sm flex-1 truncate">{field}</span>
                <button
                  onClick={() => removeField(i)}
                  className="text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Add field */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newField}
              onChange={e => setNewField(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addField()}
              placeholder="Add a field manually..."
              className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button onClick={addField} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-colors">
              Add
            </button>
          </div>
        </div>

        {/* Groq API Key */}
        <div className="bg-slate-800/60 rounded-2xl border border-slate-700 p-6 mb-4">
          {/* Provider badge */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-300">AI Question Generator</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/20">
                Groq · Free
              </span>
            </div>
            <a
              href="https://console.groq.com/keys"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Get free key →
            </a>
          </div>

          <input
            type="password"
            value={apiKey}
            onChange={e => onApiKeyChange(e.target.value)}
            placeholder="gsk_..."
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />

          <p className="text-slate-500 text-xs mt-2">
            {apiKey.trim()
              ? '✓ Key saved — AI will generate natural questions for each field.'
              : 'No key? Leave blank and the app uses built-in questions instead.'}
          </p>
        </div>

        {/* ElevenLabs Voice */}
        <div className="bg-slate-800/60 rounded-2xl border border-slate-700 p-6 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-300">Voice</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/20">
                ElevenLabs · Human
              </span>
            </div>
            <a href="https://elevenlabs.io" target="_blank" rel="noreferrer"
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
              Get free key →
            </a>
          </div>

          <input
            type="password"
            value={elevenKey}
            onChange={e => onElevenKeyChange(e.target.value)}
            placeholder="ElevenLabs API key..."
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 mb-3"
          />

          {/* Voice picker */}
          <div className="grid grid-cols-1 gap-2">
            {ELEVENLABS_VOICES.map(v => (
              <button
                key={v.id}
                onClick={() => onVoiceChange(v.id)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-left transition-colors
                  ${(voiceId || ELEVENLABS_VOICES[0].id) === v.id
                    ? 'border-violet-500/50 bg-violet-500/10'
                    : 'border-slate-700 hover:border-slate-600'}`}
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0
                  ${(voiceId || ELEVENLABS_VOICES[0].id) === v.id ? 'bg-violet-400' : 'bg-slate-600'}`} />
                <div>
                  <span className={`text-sm font-medium ${(voiceId || ELEVENLABS_VOICES[0].id) === v.id ? 'text-violet-300' : 'text-slate-300'}`}>
                    {v.name}
                  </span>
                  <span className="text-slate-500 text-xs ml-2">{v.description}</span>
                </div>
              </button>
            ))}
          </div>

          <p className="text-slate-500 text-xs mt-3">
            {elevenKey.trim()
              ? '✓ Human voice enabled — 10,000 free characters/month.'
              : 'No key? Leave blank to use browser voice instead.'}
          </p>
        </div>

        {/* Start */}
        <button
          onClick={() => onStart(editingFields)}
          disabled={editingFields.length === 0 || loadingQuestions}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500
            text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {loadingQuestions ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating questions...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              Start Voice Session
            </>
          )}
        </button>
      </div>
    </div>
  )
}
