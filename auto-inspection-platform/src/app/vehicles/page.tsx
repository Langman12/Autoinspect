import { AppShell } from "@/components/app-shell";
import { getPlatformData } from "@/lib/platform-data";

export default function VehiclesPage() {
  const data = getPlatformData();

  return (
    <AppShell
      currentPath="/vehicles"
      title="Vehicle Inventory"
      subtitle="Track readiness, recon cost, and risk across every unit so inspection data drives operational decisions."
    >
      <section className="glass rounded-[30px] p-6 sm:p-8">
        <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-300">
              Vehicle intelligence
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              Turn inspections into inventory readiness
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate-400">
            This is where the merged app starts feeling bigger than a checklist
            tool by connecting inspection findings to inventory, recon, and
            downstream operational action.
          </p>
        </div>

        <div className="mt-6 overflow-hidden rounded-[24px] border border-white/10">
          <div className="grid grid-cols-[0.8fr_1.2fr_1.1fr_0.8fr_0.8fr_0.8fr] gap-4 bg-white/[0.04] px-5 py-4 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
            <span>Stock</span>
            <span>Vehicle</span>
            <span>VIN</span>
            <span>Mileage</span>
            <span>Readiness</span>
            <span>Recon</span>
          </div>
          <div className="divide-y divide-white/10">
            {data.vehicles.map((vehicle) => (
              <div
                key={vehicle.stockId}
                className="grid grid-cols-1 gap-4 px-5 py-5 text-sm text-slate-200 md:grid-cols-[0.8fr_1.2fr_1.1fr_0.8fr_0.8fr_0.8fr]"
              >
                <p className="font-semibold text-white">{vehicle.stockId}</p>
                <div>
                  <p>{vehicle.vehicle}</p>
                  <p className="mt-1 text-slate-500">Risk {vehicle.risk}</p>
                </div>
                <p>{vehicle.vin}</p>
                <p>{vehicle.mileage}</p>
                <p>{vehicle.readiness}</p>
                <p className="font-semibold text-white">
                  {vehicle.reconEstimate}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="glass rounded-[30px] p-6">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-300">
            Why it matters
          </p>
          <h3 className="mt-2 text-xl font-semibold">
            Recon intelligence becomes a real differentiator
          </h3>
          <div className="mt-5 space-y-3 text-sm leading-7 text-slate-400">
            <p>
              Most inspection tools stop at finding defects. This product should
              translate condition into labor, parts, cost, readiness, and
              revenue impact.
            </p>
            <p>
              When your GitHub repos arrive, I’ll use this page as the merge
              point for any existing inventory logic, stock records, or damage
              categorization code.
            </p>
          </div>
        </article>

        <article className="glass rounded-[30px] p-6">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-300">
            Planned expansion
          </p>
          <h3 className="mt-2 text-xl font-semibold">
            Dealer, fleet, and auction overlays
          </h3>
          <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-300">
            <li className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              Market-specific readiness scoring by account or channel
            </li>
            <li className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              Cost thresholds that auto-route units to recon or approval
            </li>
            <li className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              Portfolio-level risk views for high-mileage or high-severity units
            </li>
          </ul>
        </article>
      </section>
    </AppShell>
  );
}
