// Escapes regex metacharacters so user input can't inject into $regex queries.
function escapeRegex(str) {
  if (typeof str !== 'string') return ''
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function isValidEmail(email) {
  if (typeof email !== 'string') return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

module.exports = { escapeRegex, isValidEmail }
