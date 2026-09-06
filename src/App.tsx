import { useEffect } from 'react'
import { AgentWindow } from './components/AgentWindow'
import { ArSpatialOverlayView } from './components/ArSpatialOverlayView.tsx'
import { CameraView } from './components/CameraView'
import { DiagnosticMatrix } from './components/DiagnosticMatrix'
import { DigitalTwin3D } from './components/DigitalTwin3D.tsx'
import { EvBatteryDiagnostics } from './components/EvBatteryDiagnostics.tsx'
import { FleetInsights } from './components/FleetInsights'
import { GuardianView } from './components/GuardianView'
import { IntelligenceHub } from './components/IntelligenceHub'
import { Layout } from './components/Layout'
import { ObdStreamerView } from './components/ObdStreamerView.tsx'
import { PartSourcingMatrix } from './components/PartSourcingMatrix.tsx'
import { ReportView } from './components/ReportView'
import { TestLabView } from './components/TestLabView'
import { TradeInValuationView } from './components/TradeInValuationView.tsx'
import { TreadLaserProfiler } from './components/TreadLaserProfiler.tsx'
import { VehiclePassportView } from './components/VehiclePassportView.tsx'
import { VehicleTimeline } from './components/VehicleTimeline'
import { VoiceMechanicCopilot } from './components/VoiceMechanicCopilot.tsx'
import { useAutoGuardStore } from './store/useAutoGuardStore'
import type { InspectionReport, VehicleProfile } from './types'


const SAMPLE_VEHICLES: { label: string; profile: VehicleProfile }[] = [
  {
    label: '⚡ Tesla Model Y (EV)',
    profile: {
      year: '2023',
      makeModel: 'Tesla Model Y Long Range',
      vin: '5YJ3E1EB8NF123456',
      mileage: '32,000 km',
      fuelType: 'Electric (EV)',
      class: 'LUXURY',
    },
  },
  {
    label: '🛢️ Ford Ranger 3.2 (Diesel)',
    profile: {
      year: '2021',
      makeModel: 'Ford Ranger Wildtrak 3.2 TDCi',
      vin: '1FTFW1ED4MF987654',
      mileage: '85,000 km',
      fuelType: 'Diesel Turbo',
      class: 'COMMERCIAL',
    },
  },
  {
    label: '🏎️ BMW M3 Competition (Sport)',
    profile: {
      year: '2022',
      makeModel: 'BMW M3 Competition xDrive',
      vin: 'WBA33AY08NFP11223',
      mileage: '24,000 km',
      fuelType: 'Petrol (Sport)',
      class: 'EXOTIC',
    },
  },
]

export default function App() {
  const {
    activeView,
    setActiveView,
    vehicle,
    setVehicle,
    patchVehicle,
    history,
    currentReport,
    setCurrentReport,
    saveReport,
    loadReports,
  } = useAutoGuardStore()

  useEffect(() => {
    loadReports()
  }, [])

  const handleReportGenerated = async (report: InspectionReport) => {
    await saveReport(report)
  }

  const handleVehicleExtracted = (extracted: Partial<VehicleProfile>) => {
    patchVehicle(extracted)
  }

  const loadSample = (sample: VehicleProfile) => {
    setVehicle(sample)
  }

  return (
    <Layout view={activeView} setView={setActiveView}>
      {currentReport ? (
        <ReportView report={currentReport} onBack={() => setCurrentReport(null)} />
      ) : activeView === 'digitaltwin' ? (
        <DigitalTwin3D />
      ) : activeView === 'guardian' ? (
        <GuardianView />
      ) : activeView === 'obd' ? (
        <ObdStreamerView />
      ) : activeView === 'evbattery' ? (
        <EvBatteryDiagnostics />
      ) : activeView === 'matrix' ? (
        <DiagnosticMatrix />
      ) : activeView === 'parts' ? (
        <PartSourcingMatrix />
      ) : activeView === 'valuation' ? (
        <TradeInValuationView />
      ) : activeView === 'passport' ? (
        <VehiclePassportView />
      ) : activeView === 'tread' ? (
        <TreadLaserProfiler />
      ) : activeView === 'ar' ? (
        <ArSpatialOverlayView />
      ) : activeView === 'hub' ? (
        <IntelligenceHub history={history} onOpenReport={setCurrentReport} />
      ) : activeView === 'insights' ? (
        <div className="space-y-8">
          <FleetInsights history={history} onOpenReport={setCurrentReport} />
          <VehicleTimeline history={history} onOpenReport={setCurrentReport} />
        </div>
      ) : activeView === 'testlab' ? (
        <TestLabView />
      ) : (

        <div className="max-w-6xl mx-auto space-y-6">
          {/* Vehicle Profile Setup Card */}
          <section className="glass-card rounded-3xl border border-slate-800 p-5 md:p-6 space-y-4 shadow-2xl glass-glow-cyan">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-cyan-400 font-black font-mono">
                  STEP 1: VEHICLE DIAGNOSTICS TARGET
                </p>
                <h2 className="text-xl font-black text-white tracking-tight">Target Dossier & Forensic Calibration</h2>
              </div>

              {/* Sample Profile Loaders */}
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_VEHICLES.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => loadSample(s.profile)}
                    className="px-2.5 py-1 rounded-xl bg-slate-950 hover:bg-slate-800 text-[11px] font-bold text-cyan-300 border border-slate-800 transition-all font-mono shadow-sm active:scale-95"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              <div>
                <label className="text-[10px] uppercase text-slate-400 font-bold block mb-1 font-mono">Model Year</label>
                <input
                  value={vehicle.year || ''}
                  onChange={(e) => setVehicle({ ...vehicle, year: e.target.value })}
                  placeholder="e.g. 2023"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-white text-xs font-mono outline-none focus:border-cyan-400 shadow-inner"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] uppercase text-slate-400 font-bold block mb-1 font-mono">Make & Model</label>
                <input
                  value={vehicle.makeModel}
                  onChange={(e) => setVehicle({ ...vehicle, makeModel: e.target.value })}
                  placeholder="e.g. Toyota Hilux 2.8 GD-6 / Tesla Model 3"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-white text-xs font-sans font-bold outline-none focus:border-cyan-400 shadow-inner"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase text-slate-400 font-bold block mb-1 font-mono">17-Digit VIN</label>
                <input
                  value={vehicle.vin || ''}
                  onChange={(e) => setVehicle({ ...vehicle, vin: e.target.value.toUpperCase() })}
                  placeholder="17-character VIN"
                  maxLength={17}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-cyan-300 text-xs font-mono font-bold outline-none focus:border-cyan-400 shadow-inner tracking-wider"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase text-slate-400 font-bold block mb-1 font-mono">Odometer</label>
                <input
                  value={vehicle.mileage || ''}
                  onChange={(e) => setVehicle({ ...vehicle, mileage: e.target.value })}
                  placeholder="e.g. 45,000 km"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-white text-xs font-mono outline-none focus:border-cyan-400 shadow-inner"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase text-slate-400 font-bold block mb-1 font-mono">Powertrain</label>
                <select
                  value={vehicle.fuelType || 'Petrol (Gasoline)'}
                  onChange={(e) => setVehicle({ ...vehicle, fuelType: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-white text-xs font-mono outline-none focus:border-cyan-400"
                >
                  <option value="Petrol (Gasoline)">Petrol (Gasoline)</option>
                  <option value="Petrol (Sport)">Petrol (Sport / High RPM)</option>
                  <option value="Diesel Turbo">Diesel Turbo (Heavy Duty)</option>
                  <option value="Electric (EV)">Electric (EV Battery Pack)</option>
                  <option value="Hybrid (HEV/PHEV)">Hybrid (HEV / PHEV)</option>
                </select>
              </div>

              <div className="sm:col-span-2 md:col-span-3">
                <label className="text-[10px] uppercase text-slate-400 font-bold block mb-1 font-mono">Forensic Class & Labor Model</label>
                <select
                  value={vehicle.class || 'ECONOMY'}
                  onChange={(e) =>
                    setVehicle({ ...vehicle, class: e.target.value as VehicleProfile['class'] })
                  }
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-white text-xs font-mono outline-none focus:border-cyan-400"
                >
                  <option value="ECONOMY">Economy (Standard parts rate / typical corrosion)</option>
                  <option value="LUXURY">Luxury (OEM spec / ADAS complexity / 1.5x labor)</option>
                  <option value="EXOTIC">Exotic / Track (Carbon fiber integrity / 3x parts rate)</option>
                  <option value="COMMERCIAL">Commercial (DOT compliance / Chassis payload stress)</option>
                </select>
              </div>
            </div>
          </section>

          {/* Camera / Audio Capture Module */}
          <CameraView
            vehicle={vehicle}
            onReportGenerated={handleReportGenerated}
            onVehicleExtracted={handleVehicleExtracted}
          />

          {/* Recent Inspections Quick Grid */}
          {history.length > 0 && (
            <div className="space-y-3 pt-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Recent Forensic Audits ({history.length})
                </h3>
                <button
                  onClick={() => setActiveView('insights')}
                  className="text-xs font-black text-cyan-400 hover:text-cyan-300 uppercase tracking-wider"
                >
                  View Full Analytics →
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {history.slice(0, 6).map((report) => (
                  <button
                    key={report.id}
                    onClick={() => setCurrentReport(report)}
                    className={`p-4 rounded-2xl border text-left hover:scale-[1.02] transition-all shadow-lg ${
                      report.overallHealth >= 80
                        ? 'border-emerald-700 bg-emerald-950/30'
                        : report.overallHealth >= 60
                          ? 'border-amber-700 bg-amber-950/30'
                          : 'border-red-700 bg-red-950/30'
                    }`}
                  >
                    <div className="text-[10px] font-mono text-slate-400 uppercase">
                      {new Date(report.timestamp).toLocaleDateString()}
                    </div>
                    <div className="font-black text-white text-sm truncate mt-1">
                      {report.vehicle.makeModel || 'Vehicle'}
                    </div>
                    <div className="text-xs text-slate-400 font-mono truncate">{report.vehicle.vin || 'No VIN'}</div>
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800">
                      <span className="text-lg font-black font-mono text-white">{report.overallHealth}%</span>
                      <span
                        className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                          report.riskAssessment.finalDecision === 'SAFE TO DRIVE'
                            ? 'text-emerald-400 bg-emerald-950 border border-emerald-800'
                            : 'text-red-400 bg-red-950 border border-red-800'
                        }`}
                      >
                        {report.riskAssessment.finalDecision === 'SAFE TO DRIVE' ? 'SAFE' : 'TOW'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      <AgentWindow activeVehicle={vehicle} />
      <VoiceMechanicCopilot onNavigate={(view) => setActiveView(view as any)} />
    </Layout>
  )
}

