import type { DamageFinding, PartQuoteItem, PartSupplierQuote } from '../types.ts'

export class PartSourcingService {
  public generateQuotesForDamages(
    damages: DamageFinding[],
    shopLaborRateHourly = 135
  ): PartQuoteItem[] {
    return damages.map((damage) => this.generateQuoteForDamage(damage, shopLaborRateHourly))
  }

  public generateQuoteForDamage(
    damage: DamageFinding,
    shopLaborRateHourly = 135
  ): PartQuoteItem {
    const comp = damage.component.toLowerCase()

    let baseLaborHours = 1.8
    let oemPrice = 245
    let oemPartNum = 'OEM-54201-B'
    let difficulty: 1 | 2 | 3 | 4 | 5 = 2
    let diyHours = 2.5
    let requiredTools = ['Socket Set (8-19mm)', 'Torque Wrench', 'Trim Removal Prying Tools']
    let safetyGear = ['Safety Goggles', 'Nitrile Gloves']
    let skillWarning: string | undefined = undefined

    if (comp.includes('brake') || comp.includes('rotor') || comp.includes('pad')) {
      baseLaborHours = 2.0
      oemPrice = 310
      oemPartNum = 'BRK-6890-VENT'
      difficulty = 2
      diyHours = 3.0
      requiredTools = ['Brake Caliper Piston Compressor', '17mm Hex Socket', 'Brake Cleaner Spray', 'Torque Wrench (80-100 ft-lbs)', 'Wire Brush']
      safetyGear = ['Respirator Mask (Brake Dust)', 'Nitrile Gloves', 'Eye Protection']
      skillWarning = 'Ensure proper brake bedding procedure and bleed lines if calipers are disconnected.'
    } else if (comp.includes('strut') || comp.includes('suspension') || comp.includes('ball joint')) {
      baseLaborHours = 3.2
      oemPrice = 480
      oemPartNum = 'SUS-99120-GAS'
      difficulty = 4
      diyHours = 5.0
      requiredTools = ['Spring Compressor Tool', 'Heavy Duty Impact Wrench', 'Ball Joint Separator', 'Floor Jack & Jack Stands', 'Torque Wrench']
      safetyGear = ['Heavy Work Gloves', 'Full Face Shield', 'Steel Toe Boots']
      skillWarning = 'DANGER: Coil springs store extreme kinetic energy. Professional spring compressor required.'
    } else if (comp.includes('exhaust') || comp.includes('muffler') || comp.includes('catalytic')) {
      baseLaborHours = 2.4
      oemPrice = 850
      oemPartNum = 'EXH-77301-CAT'
      difficulty = 3
      diyHours = 3.5
      requiredTools = ['Oxygen Sensor Socket (22mm)', 'Exhaust Hanger Pliers', 'Penetrating Oil (PB Blaster)', 'Torque Wrench']
      safetyGear = ['Safety Glasses', 'Heat Resistant Gloves']
      skillWarning = 'Rusted flange bolts may require inductive heat torch or stud extractor.'
    } else if (comp.includes('oil') || comp.includes('gasket') || comp.includes('seal')) {
      baseLaborHours = 4.5
      oemPrice = 95
      oemPartNum = 'ENG-11204-GSK'
      difficulty = 3
      diyHours = 6.0
      requiredTools = ['Torx Socket Set', 'Gasket Scraper', 'Anaerobic Sealant', 'Inch-Pound Precision Torque Wrench']
      safetyGear = ['Nitrile Gloves', 'Eye Protection']
      skillWarning = 'Follow manufacturer spiral torque sequence on valve cover/oil pan bolts.'
    } else if (comp.includes('battery') || comp.includes('inverter') || comp.includes('ev')) {
      baseLaborHours = 3.8
      oemPrice = 2800
      oemPartNum = 'HV-BATT-800V-MOD'
      difficulty = 5
      diyHours = 6.0
      requiredTools = ['1000V Insulated Tool Set', 'High-Voltage Multimeter', 'Class 0 High Voltage Gloves', 'Lockout/Tagout Kit']
      safetyGear = ['1000V Rated Arc-Flash Visor', 'Insulated Rubber Matting']
      skillWarning = 'CRITICAL: Lethal 400V-800V DC bus. Service disconnect plug MUST be pulled before touching pack.'
    } else if (comp.includes('panel') || comp.includes('bumper') || comp.includes('fender')) {
      baseLaborHours = 2.5
      oemPrice = 520
      oemPartNum = 'BDY-22001-FND'
      difficulty = 2
      diyHours = 4.0
      requiredTools = ['Plastic Clip Pliers', 'Torx Drivers', 'Heat Gun', 'Panel Alignment Shims']
      safetyGear = ['Work Gloves', 'Eye Protection']
    }

    const oemQuote: PartSupplierQuote = {
      supplier: 'OEM Direct Dealership',
      partNumber: oemPartNum,
      brand: 'Genuine OEM Factory',
      tier: 'OEM',
      price: oemPrice,
      availability: 'IN_STOCK',
      warranty: '24 Months / Unlimited Miles',
      rating: 4.9,
    }

    const tier1Quote: PartSupplierQuote = {
      supplier: 'RockAuto / FCP Euro',
      partNumber: `${oemPartNum}-BOSCH`,
      brand: 'Bosch / Brembo Tier 1',
      tier: 'TIER_1_AFTERMARKET',
      price: Math.round(oemPrice * 0.62),
      availability: '2_DAY_DELIVERY',
      warranty: '36 Months Limited',
      rating: 4.8,
    }

    const budgetQuote: PartSupplierQuote = {
      supplier: 'AutoZone / Duralast',
      partNumber: `${oemPartNum}-ECON`,
      brand: 'Duralast Gold',
      tier: 'BUDGET',
      price: Math.round(oemPrice * 0.38),
      availability: 'IN_STOCK',
      warranty: '12 Months Replacement',
      rating: 4.2,
    }

    return {
      id: `quote-${damage.id}`,
      defectId: damage.id,
      componentName: damage.component,
      oemPartNumber: oemPartNum,
      laborBookHours: baseLaborHours,
      shopLaborRateHourly,
      oemQuote,
      aftermarketQuotes: [tier1Quote, budgetQuote],
      diy: {
        difficultyWrenches: difficulty,
        estimatedHoursDiy: diyHours,
        requiredTools,
        safetyEquipment: safetyGear,
        skillWarning,
      },
    }
  }

  public calculateTotals(quotes: PartQuoteItem[], preferredTier: 'OEM' | 'TIER_1_AFTERMARKET' | 'BUDGET' = 'TIER_1_AFTERMARKET') {
    let partsCost = 0
    let laborCost = 0
    let totalLaborHours = 0

    for (const q of quotes) {
      totalLaborHours += q.laborBookHours
      laborCost += q.laborBookHours * q.shopLaborRateHourly

      if (preferredTier === 'OEM') {
        partsCost += q.oemQuote.price
      } else if (preferredTier === 'TIER_1_AFTERMARKET') {
        const t1 = q.aftermarketQuotes.find((a) => a.tier === 'TIER_1_AFTERMARKET') || q.oemQuote
        partsCost += t1.price
      } else {
        const bud = q.aftermarketQuotes.find((a) => a.tier === 'BUDGET') || q.oemQuote
        partsCost += bud.price
      }
    }

    return {
      totalPartsCost: Math.round(partsCost),
      totalLaborCost: Math.round(laborCost),
      totalRepairCost: Math.round(partsCost + laborCost),
      totalLaborHours: Math.round(totalLaborHours * 10) / 10,
      estimatedDiySavings: Math.round(laborCost),
    }
  }
}

export const partSourcingService = new PartSourcingService()
