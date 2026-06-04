/**
 * Input Validation and Sanitization Service
 * Provides utilities for validating and sanitizing user input
 */

/**
 * Sanitize user input to prevent XSS attacks
 * Removes potentially dangerous characters and HTML
 * @param {string} input - Raw user input
 * @returns {string} Sanitized input
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return ''
  }

  // Remove null bytes
  let sanitized = input.replace(/\0/g, '')

  // Escape HTML special characters
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')

  // Remove any script tags or event handlers (defense in depth)
  sanitized = sanitized
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/on\w+\s*=\s*['"]/gi, '')

  return sanitized.trim()
}

/**
 * Validate input length and type
 * @param {*} input - Input to validate
 * @param {string} fieldName - Name of the field (for error messages)
 * @param {number} minLength - Minimum allowed length
 * @param {number} maxLength - Maximum allowed length
 * @returns {Object} Validation result with valid flag and error message
 */
export function validateInputLength(input, fieldName, minLength, maxLength) {
  // Handle null/undefined
  if (input === null || input === undefined) {
    if (minLength > 0) {
      return {
        valid: false,
        error: `${fieldName} is required`
      }
    }
    return { valid: true }
  }

  // Ensure input is a string
  const strInput = String(input).trim()

  // Check minimum length
  if (strInput.length < minLength) {
    return {
      valid: false,
      error: `${fieldName} must be at least ${minLength} character${minLength !== 1 ? 's' : ''}`
    }
  }

  // Check maximum length
  if (strInput.length > maxLength) {
    return {
      valid: false,
      error: `${fieldName} must not exceed ${maxLength} characters (current: ${strInput.length})`
    }
  }

  return { valid: true }
}

/**
 * Validate comment message
 * @param {string} message - Comment message to validate
 * @returns {Object} Validation result
 */
export function validateComment(message) {
  const validation = validateInputLength(message, 'comment', 1, 5000)
  if (!validation.valid) {
    return validation
  }

  return { valid: true }
}

/**
 * Check for SQL injection patterns
 * Returns true if suspicious patterns are detected
 * @param {string} input - Input to check
 * @returns {boolean} True if suspicious SQL patterns detected
 */
export function detectSQLInjection(input) {
  if (typeof input !== 'string') {
    return false
  }

  // Patterns commonly used in SQL injection attempts
  const sqlInjectionPatterns = [
    /(\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
    /(-{2}|\/\*|\*\/|;|\||&&)/g, // SQL comment/command separators
    /(\bOR\b|\bAND\b)\s+(\d+|'[^']*')\s*=\s*(\d+|'[^']*')/gi, // OR 1=1 style
  ]

  for (const pattern of sqlInjectionPatterns) {
    if (pattern.test(input)) {
      return true
    }
  }

  return false
}

/**
 * Comprehensive input validation
 * @param {string} input - Input to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
export function validateUserInput(input, options = {}) {
  const {
    fieldName = 'input',
    minLength = 1,
    maxLength = 5000,
    allowHTML = false,
  } = options

  // Check length
  const lengthValidation = validateInputLength(input, fieldName, minLength, maxLength)
  if (!lengthValidation.valid) {
    return lengthValidation
  }

  // Check for SQL injection
  if (detectSQLInjection(input)) {
    return {
      valid: false,
      error: `${fieldName} contains suspicious characters or patterns`
    }
  }

  return { valid: true }
}
