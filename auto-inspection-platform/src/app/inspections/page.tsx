import { AppShell } from "@/components/app-shell";
import { getPlatformData } from "@/lib/platform-data";

const statusClasses = {
  "Ready for review":
    "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
  "In progress": "border-sky-400/20 bg-sky-400/10 text-sky-200",
  Flagged: "border-amber-400/20 bg-amber-400/10 text-amber-200",
  Scheduled: "border-slate-400/20 bg-slate-400/10 text-slate-200",
} as const;

export default function InspectionsPage() {
  const data = getPlatformData();

  return (
    <AppShell
      currentPath="/inspections"
      title="Inspection Workflows"
      subtitle="The field-ready queue for intake, condition grading, AI review, exception handling, and client delivery."
    >
      <section className="glass rounded-[30px] p-6 sm:p-8">
        <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-300">
              Live queue
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              Standardize every inspection workflow in one place
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate-400">
            This page is where I will merge the strongest inspection flows from
            your GitHub apps: mobile capture, checklist logic, AI analysis, and
            approval routing.
          </p>
        </div>

        <div className="mt-6 grid gap-4">
          {data.inspections.map((inspection) => (
            <article
              key={inspection.id}
              className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-lg font-semibold text-white">
                      {inspection.id}
                    </p>
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusClasses[inspection.status]}`}
                    >
                      {inspection.status}
                    </span>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                      {inspection.workflow}
                    </span>
                  </div>
                  <div>
                    <p className="text-base font-medium text-slate-100">
                      {inspection.vehicle}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      {inspection.customer} · {inspection.location}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      VIN {inspection.vin} · Inspector {inspection.inspector}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="surface-soft rounded-2xl px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                      Condition score
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-white">
                      {inspection.score === 0 ? "--" : inspection.score}
                    </p>
                  </div>
                  <div className="surface-soft rounded-2xl px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                      AI findings
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-white">
                      {inspection.aiFindings}
                    </p>
                  </div>
                  <div className="surface-soft rounded-2xl px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                      Next step
                    </p>
                    <p className="mt-2 text-sm font-medium leading-6 text-slate-200">
                      {inspection.nextStep}
                    </p>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <article className="glass rounded-[30px] p-6">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-300">
            Feature lane
          </p>
          <h3 className="mt-2 text-xl font-semibold">
            VIN-aware checklist generation
          </h3>
          <p className="mt-4 text-sm leading-7 text-slate-400">
            Tailor each inspection to the exact make, model, trim, drivetrain,
            and customer rule set before the technician starts capture.
          </p>
        </article>

        <article className="glass rounded-[30px] p-6">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-300">
            Feature lane
          </p>
          <h3 className="mt-2 text-xl font-semibold">
            Offline-first field execution
          </h3>
          <p className="mt-4 text-sm leading-7 text-slate-400">
            Prepare the app for weak connectivity by caching inspections,
            compressing media, and syncing cleanly after reconnect.
          </p>
        </article>

        <article className="glass rounded-[30px] p-6">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-300">
            Feature lane
          </p>
          <h3 className="mt-2 text-xl font-semibold">
            AI exception handling
          </h3>
          <p className="mt-4 text-sm leading-7 text-slate-400">
            Highlight confidence, repeated retakes, anomaly patterns, and
            structural alerts so reviewers only touch what matters.
          </p>
        </article>
      </section>
    </AppShell>
  );
}
