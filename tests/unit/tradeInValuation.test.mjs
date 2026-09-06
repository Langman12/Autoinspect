import assert from 'node:assert/strict'
import test from 'node:test'
import { tradeInValuationService } from '../../src/services/tradeInValuationService.ts'

test('Trade-In Valuation — Market Spread and Recon Deductions', () => {
  const mockDamages = [
    {
      id: 'd1',
      type: 'MECHANICAL',
      component: 'Front Strut Leaking',
      description: 'Blown seal',
      status: 'RED',
      severityScore: 80,
      estimatedCost: { low: '$400', medium: '$480', high: '$600' },
      actionRequired: 'Replace',
    },
  ]

  const valuation = tradeInValuationService.calculateValuation('TEST-VIN-1234', mockDamages, 30000)

  assert.equal(valuation.vehicleVin, 'TEST-VIN-1234')
  assert.ok(valuation.baseMarketSpread.wholesaleMmrAverage > 0)
  assert.ok(valuation.baseMarketSpread.cleanRetailMarket === 30000)
  assert.ok(valuation.totalReconDeductions > 0)
  assert.ok(valuation.adjustedWholesaleBid < valuation.baseMarketSpread.wholesaleMmrAverage)
})

test('Trade-In Valuation — Recon ROI Profit Multipliers', () => {
  const valuation = tradeInValuationService.calculateValuation('VIN-DEFAULT', [], 35000)

  assert.ok(valuation.reconRoiBreakdown.length >= 3)
  for (const item of valuation.reconRoiBreakdown) {
    assert.ok(item.repairCost > 0)
    assert.ok(item.valueBoostAtAuction > item.repairCost, 'Auction boost should exceed cost for positive ROI items')
    assert.ok(item.netProfitDelta > 0)
    assert.ok(item.roiPercent > 0)
  }
})
