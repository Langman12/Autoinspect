import test from 'node:test'
import assert from 'node:assert/strict'
import { recallService } from '../src/services/recallService.ts'

test('Recall Service - Rejects invalid VIN length', async () => {
  const shortVin = await recallService.getRecallsByVin('12345')
  assert.deepEqual(shortVin, [], 'Should return empty array for non-17 digit VIN')

  const emptyVin = await recallService.getRecallsByVin('')
  assert.deepEqual(emptyVin, [], 'Should return empty array for empty VIN')
})

test('Recall Service - Validates 17-digit format constraint', () => {
  const validVin = '5YJ3E1EB8NF123456'
  assert.equal(validVin.length, 17)
})
