import test from 'node:test'
import assert from 'node:assert/strict'

/**
 * HTML Escaper used in ReportView.tsx
 */
function escapeHtml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

test('Security & DOM Sanitization — XSS Defense in PDF Reporting', async (t) => {
  await t.test('Escapes malicious <script> tags in vehicle notes', () => {
    const maliciousInput = '<script>alert("XSS Attack")</script>'
    const escaped = escapeHtml(maliciousInput)
    assert.strictEqual(escaped, '&lt;script&gt;alert(&quot;XSS Attack&quot;)&lt;/script&gt;')
    assert.ok(!escaped.includes('<script>'))
  })

  await t.test('Escapes inline event handler injection attempts', () => {
    const maliciousInput = '"><img src=x onerror=alert(1)>'
    const escaped = escapeHtml(maliciousInput)
    assert.strictEqual(escaped, '&quot;&gt;&lt;img src=x onerror=alert(1)&gt;')
    assert.ok(!escaped.includes('<img'))
  })

  await t.test('Safely handles null, undefined, and non-string inputs', () => {
    assert.strictEqual(escapeHtml(null), '')
    assert.strictEqual(escapeHtml(undefined), '')
    assert.strictEqual(escapeHtml(12345), '12345')
  })

  await t.test('Preserves standard alphanumeric characters and safe vehicle descriptions', () => {
    const safeInput = '2024 Porsche 911 GT3 RS (VIN: WP0AF2A97RS123456)'
    assert.strictEqual(escapeHtml(safeInput), safeInput)
  })
})
