import { useState } from 'react'
import './App.css'
import UploadScreen from './components/UploadScreen'
import FieldPreview from './components/FieldPreview'
import VoiceSession from './components/VoiceSession'
import FormReview from './components/FormReview'
import { useFormParser } from './hooks/useFormParser'
import { useAIQuestions } from './hooks/useAIQuestions'

const SCREEN = { UPLOAD: 'upload', PREVIEW: 'preview', SESSION: 'session', REVIEW: 'review' }

export default function App() {
  const [screen, setScreen] = useState(SCREEN.UPLOAD)
  const [fields, setFields] = useState([])
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [originalFile, setOriginalFile] = useState(null)
  const [apiKey, setApiKey] = useState(
    () => localStorage.getItem('groq_key') || import.meta.env.VITE_GROQ_API_KEY || ''
  )
  const [elevenKey, setElevenKey] = useState(
    () => localStorage.getItem('eleven_key') || import.meta.env.VITE_ELEVEN_API_KEY || ''
  )
  const [voiceId, setVoiceId] = useState(
    () => localStorage.getItem('eleven_voice') || ''
  )

  const { parseFile, parsing, progress } = useFormParser()
  const { generateQuestions, loading: loadingQuestions } = useAIQuestions()

  function handleApiKeyChange(key) {
    setApiKey(key)
    localStorage.setItem('groq_key', key)
  }

  function handleElevenKeyChange(key) {
    setElevenKey(key)
    localStorage.setItem('eleven_key', key)
  }

  function handleVoiceChange(id) {
    setVoiceId(id)
    localStorage.setItem('eleven_voice', id)
  }

  async function handleUpload(file) {
    try {
      const detected = await parseFile(file)
      setOriginalFile(file)
      setFields(detected.length > 0 ? detected : ['Full Name', 'Email', 'Phone Number', 'Date of Birth', 'Address'])
      setScreen(SCREEN.PREVIEW)
    } catch {
      alert('Failed to parse the file. Please try a different file.')
    }
  }

  async function handleStartSession(confirmedFields) {
    const qs = await generateQuestions(confirmedFields, apiKey)
    setQuestions(qs)
    setAnswers({})
    setScreen(SCREEN.SESSION)
  }

  function handleAnswerUpdate(field, value) {
    setAnswers(prev => ({ ...prev, [field]: value }))
  }

  function handleRestart() {
    setFields([])
    setQuestions([])
    setAnswers({})
    setOriginalFile(null)
    setScreen(SCREEN.UPLOAD)
  }

  return (
    <>
      {screen === SCREEN.UPLOAD && (
        <UploadScreen onUpload={handleUpload} parsing={parsing} progress={progress} />
      )}
      {screen === SCREEN.PREVIEW && (
        <FieldPreview
          fields={fields}
          onStart={handleStartSession}
          onBack={() => setScreen(SCREEN.UPLOAD)}
          apiKey={apiKey}
          onApiKeyChange={handleApiKeyChange}
          elevenKey={elevenKey}
          onElevenKeyChange={handleElevenKeyChange}
          voiceId={voiceId}
          onVoiceChange={handleVoiceChange}
          loadingQuestions={loadingQuestions}
        />
      )}
      {screen === SCREEN.SESSION && (
        <VoiceSession
          questions={questions}
          answers={answers}
          onAnswerUpdate={handleAnswerUpdate}
          onComplete={() => setScreen(SCREEN.REVIEW)}
          elevenKey={elevenKey}
          voiceId={voiceId}
        />
      )}
      {screen === SCREEN.REVIEW && (
        <FormReview
          questions={questions}
          answers={answers}
          onEdit={handleAnswerUpdate}
          onRestart={handleRestart}
          originalFile={originalFile}
        />
      )}
    </>
  )
}
