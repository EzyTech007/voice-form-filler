import { useEffect, useState, useRef, useCallback } from 'react'
import { useSpeech, useRecognition } from '../hooks/useVoice'
import { extractValue } from '../utils/extractValue'

const VALIDATION = {
  email: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  phone: v => /[\d\s\-\(\)\+]{7,}/.test(v),
  number: v => /^\d+$/.test(v.replace(/\s/g, '')),
  date: v => v.length > 3,
  name: v => v.trim().length > 0,
  address: v => v.trim().length > 2,
  text: v => v.trim().length > 0,
}

export default function VoiceSession({ questions, answers, onAnswerUpdate, onComplete, elevenKey, voiceId }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  // states: idle | speaking | listening | confirming | manual
  const [sessionState, setSessionState] = useState('idle')
  const [liveTranscript, setLiveTranscript] = useState('')
  const [rawTranscript, setRawTranscript] = useState('')
  const [pendingAnswer, setPendingAnswer] = useState('')
  const [manualInput, setManualInput] = useState('')
  const [retryCount, setRetryCount] = useState(0)
  const [statusMsg, setStatusMsg] = useState('')

  const { speak, speaking } = useSpeech()
  const { startListening, stopListening, listening, transcript, isSupported } = useRecognition()

  // Use refs to avoid stale closures in async flows
  const currentIndexRef = useRef(currentIndex)
  const retryCountRef = useRef(retryCount)
  const sessionStateRef = useRef(sessionState)
  const runningRef = useRef(false)

  useEffect(() => { currentIndexRef.current = currentIndex }, [currentIndex])
  useEffect(() => { retryCountRef.current = retryCount }, [retryCount])
  useEffect(() => { sessionStateRef.current = sessionState }, [sessionState])

  // Sync live transcript
  useEffect(() => { setLiveTranscript(transcript) }, [transcript])

  // Kick off first question on mount
  useEffect(() => {
    if (!runningRef.current) {
      runningRef.current = true
      runQuestion(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function runQuestion(index) {
    const q = questions[index]
    if (!q) return

    setCurrentIndex(index)
    setStatusMsg('')
    setLiveTranscript('')
    setRawTranscript('')
    setPendingAnswer('')
    setSessionState('speaking')

    await speak(q.question, elevenKey, voiceId)

    // After speaking, start listening
    await doListen(index, 0)
  }

  async function doListen(index, retry) {
    const q = questions[index]
    if (!q) return

    if (!isSupported) {
      setSessionState('manual')
      return
    }

    setSessionState('listening')

    try {
      const result = await startListening()

      if (!result || result.trim() === '') {
        if (retry < 1) {
          setStatusMsg("I didn't catch that. Please try again.")
          setSessionState('speaking')
          await speak("I didn't catch that. Could you please repeat?", elevenKey, voiceId)
          await doListen(index, retry + 1)
        } else {
          setStatusMsg('Switching to manual input.')
          setSessionState('manual')
        }
        return
      }

      if (result.toLowerCase().includes('skip')) {
        onAnswerUpdate(q.field, 'Skipped')
        advanceTo(index + 1)
        return
      }

      const extracted = extractValue(q.field, result, q.validation)
      setRawTranscript(result)
      setPendingAnswer(extracted)
      setSessionState('confirming')
    } catch {
      setSessionState('manual')
    }
  }

  function confirmAnswer() {
    const idx = currentIndexRef.current
    const q = questions[idx]
    const val = pendingAnswer.trim()
    const validator = VALIDATION[q.validation] || VALIDATION.text

    if (!validator(val)) {
      setStatusMsg(`That doesn't look like a valid ${q.field}. Let me ask again.`)
      setSessionState('speaking')
      speak(`That doesn't look right. ${q.question}`, elevenKey, voiceId).then(() => {
        doListen(idx, 0)
      })
      return
    }

    onAnswerUpdate(q.field, val)
    advanceTo(idx + 1)
  }

  function advanceTo(nextIndex) {
    if (nextIndex >= questions.length) {
      onComplete()
    } else {
      runQuestion(nextIndex)
    }
  }

  function submitManual() {
    const val = manualInput.trim()
    if (!val) return
    const idx = currentIndexRef.current
    onAnswerUpdate(questions[idx].field, val)
    setManualInput('')
    advanceTo(idx + 1)
  }

  function skipCurrent() {
    const idx = currentIndexRef.current
    onAnswerUpdate(questions[idx].field, 'Skipped')
    advanceTo(idx + 1)
  }

  function retryListen() {
    doListen(currentIndexRef.current, 0)
  }

  const currentQ = questions[currentIndex]
  const total = questions.length
  const progress = Math.round((currentIndex / total) * 100)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex p-4 gap-4">

      {/* Left: answered fields sidebar */}
      <div className="hidden lg:flex flex-col w-72 flex-shrink-0">
        <div className="bg-slate-800/60 rounded-2xl border border-slate-700 p-4 flex-1 overflow-y-auto">
          <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Collected Answers</h3>
          <div className="space-y-2">
            {questions.map((q, i) => {
              const answered = answers[q.field]
              const isCurrent = i === currentIndex
              return (
                <div key={i} className={`flex items-start gap-2 p-2 rounded-lg transition-colors
                  ${isCurrent ? 'bg-indigo-500/10 border border-indigo-500/30' : ''}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5
                    ${answered ? 'bg-emerald-500' : isCurrent ? 'bg-indigo-500' : 'bg-slate-700'}`}>
                    {answered ? (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="text-white text-xs">{i + 1}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-300 text-xs font-medium truncate">{q.field}</p>
                    {answered && <p className="text-emerald-400 text-xs truncate">{answered}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Center: voice UI */}
      <div className="flex-1 flex flex-col items-center justify-center">

        {/* Progress bar */}
        <div className="w-full max-w-lg mb-6">
          <div className="flex justify-between text-sm text-slate-400 mb-2">
            <span>Question {currentIndex + 1} of {total}</span>
            <span>{progress}% complete</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-1.5">
            <div className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Question card */}
        <div className="w-full max-w-lg bg-slate-800/60 rounded-2xl border border-slate-700 p-8 mb-6">
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider block mb-3">
            {currentQ?.field}
          </span>
          <p className="text-white text-xl font-medium leading-relaxed">{currentQ?.question}</p>
          {statusMsg && <p className="mt-3 text-amber-400 text-sm">{statusMsg}</p>}
        </div>

        {/* Speaking state */}
        {sessionState === 'speaking' && (
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 text-slate-400">
              <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15.536 8.464a5 5 0 010 7.072M12 6v12M8.464 8.464a5 5 0 000 7.072" />
              </svg>
              <span className="text-sm text-violet-300">
                {elevenKey?.trim() ? 'Speaking (ElevenLabs)...' : 'Speaking...'}
              </span>
            </div>
            <div className="flex items-center gap-1 h-8">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-1 bg-violet-400 rounded-full wave-bar"
                  style={{ height: `${12 + i * 4}px` }} />
              ))}
            </div>
          </div>
        )}

        {/* Listening state */}
        {sessionState === 'listening' && (
          <div className="flex flex-col items-center gap-4">
            <button onClick={stopListening}
              className="relative w-20 h-20 rounded-full bg-red-500 hover:bg-red-400 transition-colors flex items-center justify-center mic-pulse">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
            <p className="text-slate-400 text-sm">Listening... click mic to stop</p>
            {liveTranscript && (
              <div className="w-full max-w-lg bg-slate-700/50 rounded-xl p-4 border border-slate-600">
                <p className="text-white text-sm italic">"{liveTranscript}"</p>
              </div>
            )}
            <button onClick={skipCurrent} className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
              Say "skip" or click to skip →
            </button>
          </div>
        )}

        {/* Confirming state */}
        {sessionState === 'confirming' && (
          <div className="flex flex-col items-center gap-4 w-full max-w-lg">
            <div className="w-full bg-slate-700/50 rounded-xl p-4 border border-emerald-500/30 space-y-2">
              <div>
                <p className="text-slate-500 text-xs mb-0.5">I heard:</p>
                <p className="text-slate-400 text-sm italic">"{rawTranscript}"</p>
              </div>
              <div className="border-t border-slate-600 pt-2">
                <p className="text-slate-500 text-xs mb-0.5">Extracted value:</p>
                <p className="text-white text-lg font-semibold">"{pendingAnswer}"</p>
              </div>
            </div>
            <div className="flex gap-3 w-full">
              <button onClick={confirmAnswer}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Confirm
              </button>
              <button onClick={retryListen}
                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Retry
              </button>
            </div>
            <button onClick={() => setSessionState('manual')}
              className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
              Type manually instead
            </button>
          </div>
        )}

        {/* Manual input state */}
        {sessionState === 'manual' && (
          <div className="flex flex-col gap-3 w-full max-w-lg">
            <p className="text-slate-400 text-sm text-center">Type your answer below</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={e => setManualInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitManual()}
                placeholder={`Enter ${currentQ?.field}...`}
                autoFocus
                className="flex-1 bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button onClick={submitManual}
                className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors">
                Next
              </button>
            </div>
            {isSupported && (
              <button onClick={retryListen}
                className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors text-center">
                Switch back to voice
              </button>
            )}
            <button onClick={skipCurrent}
              className="text-slate-500 hover:text-slate-300 text-sm transition-colors text-center">
              Skip this field
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
