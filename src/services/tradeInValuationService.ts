import type {
  AuctionMarketSpread,
  DamageFinding,
  ReconRoiItem,
  TradeInValuation,
} from '../types.ts'

export class TradeInValuationService {
  public calculateValuation(
    vin: string,
    damages: DamageFinding[],
    baseRetailValue = 32500
  ): TradeInValuation {
    const wholesaleMmrAverage = Math.round(baseRetailValue * 0.78)
    const wholesaleMmrLow = Math.round(wholesaleMmrAverage * 0.92)
    const wholesaleMmrHigh = Math.round(wholesaleMmrAverage * 1.08)
    const cleanRetailMarket = baseRetailValue
    const privatePartyTarget = Math.round(baseRetailValue * 0.91)
    const roughTradeInBase = Math.round(wholesaleMmrAverage * 0.84)

    const baseSpread: AuctionMarketSpread = {
      wholesaleMmrLow,
      wholesaleMmrAverage,
      wholesaleMmrHigh,
      cleanRetailMarket,
      privatePartyTarget,
      roughTradeInBase,
    }

    let totalReconDeductions = 0
    const reconRoiItems: ReconRoiItem[] = []

    for (const damage of damages) {
      const comp = damage.component.toLowerCase()
      let cost = 350
      let valueBoost = 600

      if (comp.includes('strut') || comp.includes('suspension')) {
        cost = 480
        valueBoost = 1100
      } else if (comp.includes('coil') || comp.includes('misfire') || comp.includes('engine')) {
        cost = 180
        valueBoost = 950
      } else if (comp.includes('brake') || comp.includes('rotor')) {
        cost = 320
        valueBoost = 650
      } else if (comp.includes('catalytic') || comp.includes('exhaust')) {
        cost = 850
        valueBoost = 1400
      } else if (comp.includes('battery') || comp.includes('ev')) {
        cost = 1400
        valueBoost = 2600
      }

      totalReconDeductions += cost
      const netProfit = valueBoost - cost
      const roi = Math.round((netProfit / cost) * 100)

      reconRoiItems.push({
        component: damage.component,
        repairCost: cost,
        valueBoostAtAuction: valueBoost,
        netProfitDelta: netProfit,
        roiPercent: roi,
        recommendedPriority: roi > 80 ? 'HIGH_ROI' : roi > 30 ? 'MODERATE' : 'SKIP_UNPROFITABLE',
      })
    }

    // Default demo damages if none provided
    if (damages.length === 0) {
      totalReconDeductions = 980
      reconRoiItems.push({
        component: 'Front Strut Assembly Leak',
        repairCost: 480,
        valueBoostAtAuction: 1100,
        netProfitDelta: 620,
        roiPercent: 129,
        recommendedPriority: 'HIGH_ROI',
      })
      reconRoiItems.push({
        component: 'Rear Brake Rotor Grooving',
        repairCost: 320,
        valueBoostAtAuction: 650,
        netProfitDelta: 330,
        roiPercent: 103,
        recommendedPriority: 'HIGH_ROI',
      })
      reconRoiItems.push({
        component: 'Cylinder 3 Misfire Coil',
        repairCost: 180,
        valueBoostAtAuction: 950,
        netProfitDelta: 770,
        roiPercent: 427,
        recommendedPriority: 'HIGH_ROI',
      })
    }

    const adjustedWholesaleBid = Math.max(1000, wholesaleMmrAverage - totalReconDeductions)
    const estimatedRetailProfit = cleanRetailMarket - adjustedWholesaleBid - totalReconDeductions

    return {
      vehicleVin: vin || '1HGCR2F8XHA049211',
      baseMarketSpread: baseSpread,
      totalReconDeductions,
      adjustedWholesaleBid,
      recommendedAction: estimatedRetailProfit > 4000 ? 'RETAIL_RECONDITION' : 'WHOLESALE_AUCTION',
      reconRoiBreakdown: reconRoiItems,
      estimatedRetailProfit,
      generatedAt: Date.now(),
    }
  }
}

export const tradeInValuationService = new TradeInValuationService()
