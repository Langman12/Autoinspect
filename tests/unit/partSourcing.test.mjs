import assert from 'node:assert/strict'
import test from 'node:test'
import { partSourcingService } from '../../src/services/partSourcingService.ts'

test('Part Sourcing — Quote Generation and Labor Book Hours', () => {
  const mockDamages = [
    {
      id: 'dmg-1',
      type: 'MECHANICAL',
      component: 'Front Strut Assembly',
      description: 'Leaking oil',
      status: 'RED',
      severityScore: 80,
      estimatedCost: { low: '$400', medium: '$500', high: '$600' },
      actionRequired: 'Replace strut pair',
    },
    {
      id: 'dmg-2',
      type: 'SAFETY',
      component: 'Rear Brake Rotor',
      description: 'Scored disc',
      status: 'YELLOW',
      severityScore: 60,
      estimatedCost: { low: '$200', medium: '$300', high: '$400' },
      actionRequired: 'Replace rotors',
    },
  ]

  const quotes = partSourcingService.generateQuotesForDamages(mockDamages, 140)
  assert.equal(quotes.length, 2)

  const strutQuote = quotes[0]
  assert.equal(strutQuote.componentName, 'Front Strut Assembly')
  assert.ok(strutQuote.laborBookHours > 0)
  assert.equal(strutQuote.shopLaborRateHourly, 140)
  assert.ok(strutQuote.oemQuote.price > 0)
  assert.ok(strutQuote.aftermarketQuotes.length >= 2)
  assert.ok(strutQuote.diy.difficultyWrenches >= 1 && strutQuote.diy.difficultyWrenches <= 5)
  assert.ok(strutQuote.diy.requiredTools.length > 0)
})

test('Part Sourcing — Totals and DIY Savings Calculations', () => {
  const mockDamages = [
    {
      id: 'dmg-1',
      type: 'MECHANICAL',
      component: 'Cylinder 3 Ignition Coil',
      description: 'Misfire',
      status: 'RED',
      severityScore: 75,
      estimatedCost: { low: '$100', medium: '$150', high: '$200' },
      actionRequired: 'Replace coil',
    },
  ]

  const quotes = partSourcingService.generateQuotesForDamages(mockDamages, 150)
  const oemTotals = partSourcingService.calculateTotals(quotes, 'OEM')
  const aftermarketTotals = partSourcingService.calculateTotals(quotes, 'TIER_1_AFTERMARKET')

  assert.ok(oemTotals.totalPartsCost > 0)
  assert.ok(oemTotals.totalLaborCost > 0)
  assert.equal(oemTotals.totalRepairCost, oemTotals.totalPartsCost + oemTotals.totalLaborCost)
  assert.ok(oemTotals.estimatedDiySavings === oemTotals.totalLaborCost)
  assert.ok(aftermarketTotals.totalPartsCost <= oemTotals.totalPartsCost, 'Aftermarket should be cheaper or equal to OEM')
})
