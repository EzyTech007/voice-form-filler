import { useState } from 'react'

const PROMPT = (fields) => `You are a friendly voice assistant helping fill out a form.
Convert each of these form field labels into a natural, conversational question to ask the user.
Also provide a brief validation hint for each field.

Fields: ${JSON.stringify(fields)}

Respond with a JSON array only, no markdown, no explanation. Format:
[
  { "field": "First Name", "question": "What is your first name?", "validation": "name" },
  ...
]

Validation types: "name", "email", "phone", "date", "number", "address", "text"`

async function callGroq(fields, apiKey) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      max_tokens: 1024,
      temperature: 0.3,
      messages: [{ role: 'user', content: PROMPT(fields) }],
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `Groq API error ${response.status}`)
  }

  const data = await response.json()
  return data.choices[0].message.content.trim()
}

function parseJSON(text) {
  const clean = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim()
  return JSON.parse(clean)
}

export function useAIQuestions() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function generateQuestions(fields, apiKey) {
    setLoading(true)
    setError(null)

    try {
      if (apiKey?.trim()) {
        const raw = await callGroq(fields, apiKey.trim())
        return parseJSON(raw)
      }
    } catch (err) {
      console.warn('Groq failed, using fallback questions:', err.message)
      setError(err.message)
    } finally {
      setLoading(false)
    }

    // Fallback: rule-based, works offline with no key
    return fields.map(f => ({
      field: f,
      question: fallbackQuestion(f),
      validation: inferType(f),
    }))
  }

  return { generateQuestions, loading, error }
}

function fallbackQuestion(field) {
  const l = field.toLowerCase()
  if (l.includes('first name')) return 'What is your first name?'
  if (l.includes('last name')) return 'What is your last name?'
  if (l.includes('full name') || l === 'name') return 'What is your full name?'
  if (l.includes('email')) return 'What is your email address?'
  if (l.includes('phone') || l.includes('mobile')) return 'What is your phone number?'
  if (l.includes('date of birth') || l.includes('dob')) return 'What is your date of birth?'
  if (l.includes('age')) return 'How old are you?'
  if (l.includes('address')) return 'What is your street address?'
  if (l.includes('city')) return 'What city do you live in?'
  if (l.includes('state') || l.includes('province')) return 'What state or province are you in?'
  if (l.includes('zip') || l.includes('postal')) return 'What is your zip or postal code?'
  if (l.includes('country')) return 'What country are you from?'
  if (l.includes('gender') || l.includes('sex')) return 'What is your gender?'
  if (l.includes('occupation') || l.includes('job')) return 'What is your occupation?'
  if (l.includes('company') || l.includes('employer')) return 'What company do you work for?'
  if (l.includes('nationality')) return 'What is your nationality?'
  if (l.includes('marital')) return 'What is your marital status?'
  return `What is your ${field.toLowerCase()}?`
}

function inferType(field) {
  const l = field.toLowerCase()
  if (l.includes('email')) return 'email'
  if (l.includes('phone') || l.includes('mobile')) return 'phone'
  if (l.includes('date') || l.includes('dob') || l.includes('birth')) return 'date'
  if (l.includes('age') || l.includes('zip') || l.includes('postal')) return 'number'
  if (l.includes('name')) return 'name'
  if (l.includes('address') || l.includes('city') || l.includes('state') || l.includes('country')) return 'address'
  return 'text'
}
