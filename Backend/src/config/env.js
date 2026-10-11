function validateEnvironment() {
  const required = [
    'MONGO_URI',
    'CLERK_SECRET_KEY',
    'ADMIN_EMAILS',
    'GEMINI_API_KEY',
  ]

  const missing = required.filter((key) => !process.env[key] || !String(process.env[key]).trim())

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}

module.exports = { validateEnvironment }
