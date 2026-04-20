/**
 * Extracts the actual value from a conversational voice response.
 * e.g. field="First Name", raw="My name is Deepanshu Choudhary" → "Deepanshu Choudhary"
 * Works purely with regex rules — no API call needed, instant.
 */
export function extractValue(field, raw, validationType) {
  const text = raw.trim()
  const lower = text.toLowerCase()
  const type = validationType || 'text'

  // ── Filler phrase strippers ──────────────────────────────────────────────────
  const fillerPatterns = [
    // Name patterns
    /^(my name is|i am|i'm|the name is|it's|its|call me|name is)\s+/i,
    // Age patterns
    /^(i am|i'm|my age is|i am about|i'm about|age is)\s+/i,
    // Email patterns
    /^(my email( address)? is|email is|it is|it's)\s+/i,
    // Phone patterns
    /^(my (phone|mobile|number|phone number|mobile number) is|call me at|reach me at|number is)\s+/i,
    // Address patterns
    /^(i live (at|in)|my address is|address is|i stay at|i reside at|located at)\s+/i,
    // City / country / state
    /^(i live in|i'm from|i am from|i'm in|i am in|from|in)\s+/i,
    // Company / occupation
    /^(i work (at|for|in)|i'm (a|an|the)|i am (a|an|the)|my (job|occupation|position|company|employer) is|working (at|for)|employed (at|by))\s+/i,
    // Gender
    /^(i am|i'm|my gender is|gender is)\s+/i,
    // Date of birth
    /^(i was born (on|in)?|my (date of birth|dob|birthday) is|born on|dob is)\s+/i,
    // Nationality / marital
    /^(i am|i'm|my (nationality|marital status) is)\s+/i,
    // Generic "it is / that is / the answer is"
    /^(it is|it's|that is|that's|the answer is|the value is|this is)\s+/i,
  ]

  let cleaned = text
  for (const pattern of fillerPatterns) {
    const match = cleaned.match(pattern)
    if (match) {
      cleaned = cleaned.slice(match[0].length).trim()
      break
    }
  }

  // ── Type-specific extraction ─────────────────────────────────────────────────

  if (type === 'email') {
    const emailMatch = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/)
    if (emailMatch) return emailMatch[0]
  }

  if (type === 'phone' || type === 'number') {
    const digits = text.replace(/[^\d\s\-\(\)\+]/g, '').trim()
    if (digits.replace(/\D/g, '').length >= 5) return digits
  }

  if (type === 'date') {
    // Try to find a date-like pattern
    const dateMatch = text.match(
      /(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})|(\d{4}[\/-]\d{1,2}[\/-]\d{1,2})|((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4})|(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4})/i
    )
    if (dateMatch) return dateMatch[0]
  }

  if (type === 'number') {
    // Convert spoken numbers to digits
    const spoken = convertSpokenNumber(lower)
    if (spoken !== null) return String(spoken)
    const numMatch = text.match(/\d+/)
    if (numMatch) return numMatch[0]
  }

  // ── Strip trailing filler ────────────────────────────────────────────────────
  cleaned = cleaned
    .replace(/\s+(please|thanks|thank you|okay|ok|sure|yes|yeah|yep)\.?$/i, '')
    .replace(/^(so|well|um|uh|like|actually|basically)\s+/i, '')
    .trim()

  // Capitalise first letter for name/address/text fields
  if (cleaned.length > 0 && ['name', 'address', 'text'].includes(type)) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
  }

  return cleaned || text
}

// Convert simple spoken numbers to digits (for age, zip, etc.)
function convertSpokenNumber(text) {
  const map = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
    sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
    thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  }
  const words = text.trim().split(/\s+/)
  if (words.length === 1 && map[words[0]] !== undefined) return map[words[0]]
  if (words.length === 2 && map[words[0]] !== undefined && map[words[1]] !== undefined) {
    return map[words[0]] + map[words[1]]
  }
  return null
}
