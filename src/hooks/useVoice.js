import { useState, useRef, useCallback } from 'react'

// Best free ElevenLabs voices (no card required on free tier)
// Rachel = warm, natural female | Brian = natural male
export const ELEVENLABS_VOICES = [
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', description: 'Warm & natural female' },
  { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', description: 'Natural male' },
  { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', description: 'Expressive female' },
  { id: 'iP95p4xoKVk53GoZ742B', name: 'Chris', description: 'Casual male' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', description: 'Deep authoritative male' },
]

async function speakElevenLabs(text, apiKey, voiceId) {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2',
        voice_settings: {
          stability: 0.4,        // lower = more expressive/human
          similarity_boost: 0.8,
          style: 0.3,            // adds natural style variation
          use_speaker_boost: true,
        },
      }),
    }
  )

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail?.message || `ElevenLabs error ${response.status}`)
  }

  const audioBlob = await response.blob()
  const audioUrl = URL.createObjectURL(audioBlob)

  return new Promise((resolve, reject) => {
    const audio = new Audio(audioUrl)
    audio.onended = () => { URL.revokeObjectURL(audioUrl); resolve() }
    audio.onerror = () => { URL.revokeObjectURL(audioUrl); reject(new Error('Audio playback failed')) }
    audio.play().catch(reject)
  })
}

function speakBrowser(text) {
  return new Promise((resolve) => {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.92
    utterance.pitch = 1.05
    utterance.volume = 1

    const trySpeak = () => {
      const voices = window.speechSynthesis.getVoices()
      const preferred =
        voices.find(v => v.lang.startsWith('en') && v.name.includes('Google US English')) ||
        voices.find(v => v.lang.startsWith('en') && v.name.includes('Samantha')) ||
        voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) ||
        voices.find(v => v.lang === 'en-US') ||
        voices.find(v => v.lang.startsWith('en'))
      if (preferred) utterance.voice = preferred
      utterance.onend = resolve
      utterance.onerror = resolve
      window.speechSynthesis.speak(utterance)
    }

    // Voices may not be loaded yet
    if (window.speechSynthesis.getVoices().length > 0) {
      trySpeak()
    } else {
      window.speechSynthesis.onvoiceschanged = trySpeak
    }
  })
}

export function useSpeech() {
  const [speaking, setSpeaking] = useState(false)
  const audioRef = useRef(null)

  const speak = useCallback(async (text, elevenLabsKey, voiceId) => {
    setSpeaking(true)
    try {
      if (elevenLabsKey?.trim()) {
        await speakElevenLabs(text, elevenLabsKey.trim(), voiceId || ELEVENLABS_VOICES[0].id)
      } else {
        await speakBrowser(text)
      }
    } catch (err) {
      console.warn('ElevenLabs failed, falling back to browser TTS:', err.message)
      await speakBrowser(text)
    } finally {
      setSpeaking(false)
    }
  }, [])

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel()
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setSpeaking(false)
  }, [])

  return { speak, stopSpeaking, speaking }
}

export function useRecognition() {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef(null)

  const isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window

  const startListening = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!isSupported) {
        reject(new Error('Speech recognition not supported in this browser'))
        return
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      const recognition = new SpeechRecognition()
      recognitionRef.current = recognition

      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = 'en-US'
      recognition.maxAlternatives = 1

      let finalTranscript = ''

      recognition.onstart = () => { setListening(true); setTranscript(''); finalTranscript = '' }

      recognition.onresult = (event) => {
        let interim = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript
          if (event.results[i].isFinal) finalTranscript += t
          else interim += t
        }
        setTranscript(finalTranscript || interim)
      }

      recognition.onend = () => { setListening(false); resolve(finalTranscript.trim()) }

      recognition.onerror = (event) => {
        setListening(false)
        if (event.error === 'no-speech') resolve('')
        else reject(new Error(`Speech recognition error: ${event.error}`))
      }

      recognition.start()
    })
  }, [isSupported])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  return { startListening, stopListening, listening, transcript, isSupported }
}
