import { AppShell } from "@/components/app-shell";
import { getPlatformData } from "@/lib/platform-data";

const toneClasses = {
  positive: "status-positive",
  warning: "status-warning",
  neutral: "status-neutral",
} as const;

const statusClasses = {
  "Ready for review":
    "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
  "In progress": "border-sky-400/20 bg-sky-400/10 text-sky-200",
  Flagged: "border-amber-400/20 bg-amber-400/10 text-amber-200",
  Scheduled: "border-slate-400/20 bg-slate-400/10 text-slate-200",
} as const;

export default function Home() {
  const data = getPlatformData();

  return (
    <AppShell
      currentPath="/"
      title="Command Center"
      subtitle={data.brand.slogan}
    >
      <section className="glass rounded-[30px] p-6 sm:p-8">
        <div className="space-y-5 border-b border-white/10 pb-6">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-sky-200/80">
            {data.hero.eyebrow}
          </p>
          <h2 className="max-w-4xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            {data.hero.title}
          </h2>
          <p className="max-w-4xl text-base leading-8 text-slate-300 sm:text-lg">
            {data.hero.subtitle}
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {data.kpis.map((item) => (
            <article key={item.label} className="surface-soft rounded-3xl p-5">
              <div className="mb-6 flex items-center gap-3">
                <span className={`status-dot ${toneClasses[item.tone]}`} />
                <p className="text-sm text-slate-300">{item.label}</p>
              </div>
              <p className="text-3xl font-semibold tracking-tight">{item.value}</p>
              <p className="mt-2 text-sm text-slate-400">{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.35fr_0.95fr]">
        <article className="glass rounded-[30px] p-6 sm:p-8">
          <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-300">
                Active inspections
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                Live workload across customers and field teams
              </h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-slate-400">
              This queue becomes the merge point for your existing inspection
              apps, shared photos, scoring logic, and report-generation code.
            </p>
          </div>

          <div className="mt-6 overflow-hidden rounded-[24px] border border-white/10">
            <div className="grid grid-cols-[1.1fr_1.2fr_0.9fr_0.85fr_0.7fr_0.7fr] gap-4 bg-white/[0.04] px-5 py-4 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
              <span>Inspection</span>
              <span>Vehicle</span>
              <span>Location</span>
              <span>Status</span>
              <span>Score</span>
              <span>AI flags</span>
            </div>
            <div className="divide-y divide-white/10">
              {data.inspections.map((inspection) => (
                <div
                  key={inspection.id}
                  className="grid grid-cols-1 gap-4 px-5 py-5 text-sm text-slate-200 md:grid-cols-[1.1fr_1.2fr_0.9fr_0.85fr_0.7fr_0.7fr]"
                >
                  <div>
                    <p className="font-semibold text-white">{inspection.id}</p>
                    <p className="mt-1 text-slate-400">
                      {inspection.customer}
                    </p>
                    <p className="mt-1 text-slate-500">
                      Inspector: {inspection.inspector}
                    </p>
                  </div>
                  <p>{inspection.vehicle}</p>
                  <p>{inspection.location}</p>
                  <div>
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusClasses[inspection.status]}`}
                    >
                      {inspection.status}
                    </span>
                  </div>
                  <p className="font-semibold text-white">
                    {inspection.score === 0 ? "--" : inspection.score}
                  </p>
                  <p>{inspection.aiFindings}</p>
                </div>
              ))}
            </div>
          </div>
        </article>

        <div className="space-y-6">
          <article className="glass-strong rounded-[30px] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-emerald-200/80">
                  AI review queue
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  Damage triage cockpit
                </h2>
              </div>
              <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200">
                Live model assist
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-white">
                    Panel severity clustering
                  </p>
                  <p className="text-xs text-emerald-200">Confidence 96%</p>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-[78%] rounded-full bg-gradient-to-r from-emerald-300 to-sky-400" />
                </div>
                <p className="mt-3 text-sm text-slate-400">
                  Automatically groups dent, scrape, paint, and glass findings
                  so reviewers focus on exceptions instead of raw uploads.
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-white">
                    Fraud and audit checks
                  </p>
                  <p className="text-xs text-amber-200">2 anomalies</p>
                </div>
                <ul className="mt-4 space-y-3 text-sm text-slate-300">
                  {data.alerts.map((alert) => (
                    <li
                      key={alert}
                      className="rounded-2xl border border-white/8 bg-white/[0.02] px-3 py-3"
                    >
                      {alert}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </article>

          <article className="glass rounded-[30px] p-6">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-300">
              Report engine
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              Dealer-grade reporting from the same workflow
            </h2>
            <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-300">
              {data.reportHighlights.map((item) => (
                <li
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
                >
                  {item}
                </li>
              ))}
            </ul>
          </article>

          <article className="glass rounded-[30px] p-6">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-300">
              Workflow layers
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              Features already planned into the merged app
            </h2>
            <div className="mt-5 grid gap-3">
              <div className="rounded-2xl border border-sky-400/15 bg-sky-400/10 p-4">
                <p className="text-sm font-semibold text-sky-100">
                  VIN decode + trim-aware checklist
                </p>
                <p className="mt-2 text-sm text-sky-50/80">
                  Tailors inspection steps to the exact make, model, trim, and
                  drivetrain before the inspector even starts.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm font-semibold text-white">
                  Reconditioning cost and readiness
                </p>
                <p className="mt-2 text-sm text-slate-300">
                  Turns findings into action items, cost estimates, and a
                  delivery-ready status for ops teams.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm font-semibold text-white">
                  Offline-first mobile inspection mode
                </p>
                <p className="mt-2 text-sm text-slate-300">
                  Built for field use where connectivity drops and media needs
                  to sync safely.
                </p>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="glass rounded-[30px] p-6 sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-300">
                Competitive edge
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                The moat this product is built around
              </h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-slate-400">
              These are the first differentiators to preserve when I merge your
              current repositories into this platform.
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {data.differentiators.map((item) => (
              <article
                key={item.title}
                className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5"
              >
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-slate-300">
                  {item.badge}
                </span>
                <h3 className="mt-4 text-xl font-semibold">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-400">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </article>

        <article className="glass rounded-[30px] p-6 sm:p-8">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-300">
            Delivery roadmap
          </p>
          <h2 className="mt-2 text-2xl font-semibold">
            What I would keep building next
          </h2>
          <div className="mt-6 space-y-4">
            {data.roadmap.map((item) => (
              <div
                key={item.title}
                className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5"
              >
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-lg font-semibold text-white">
                    {item.title}
                  </h3>
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200">
                    Planned
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-400">
                  {item.description}
                </p>
                <p className="mt-3 text-sm text-slate-300">{item.impact}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </AppShell>
  );
}
