import { AppShell } from "@/components/app-shell";
import { getPlatformData } from "@/lib/platform-data";

export default function ReportsPage() {
  const data = getPlatformData();

  return (
    <AppShell
      currentPath="/reports"
      title="Reporting Engine"
      subtitle="Deliver premium, branded outputs that make the platform feel polished to dealers, fleets, auctions, and enterprise clients."
    >
      <section className="glass rounded-[30px] p-6 sm:p-8">
        <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-300">
              Client delivery
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              Reporting that looks custom-built instead of exported
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate-400">
            A lot of competitors feel generic at the moment of delivery. This
            platform should feel strongest when clients actually receive the
            finished inspection output.
          </p>
        </div>

        <div className="mt-6 grid gap-4">
          {data.reports.map((report) => (
            <article
              key={report.id}
              className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-lg font-semibold text-white">
                      {report.id}
                    </p>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                      {report.template}
                    </span>
                  </div>
                  <p className="mt-3 text-base font-medium text-slate-100">
                    {report.customer}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {report.summary}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="surface-soft rounded-2xl px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                      Delivery
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-200">
                      {report.delivery}
                    </p>
                  </div>
                  <div className="surface-soft rounded-2xl px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                      Status
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-200">
                      {report.eta}
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
          <h3 className="mt-2 text-xl font-semibold">White-label branding</h3>
          <p className="mt-4 text-sm leading-7 text-slate-400">
            Support per-client logos, colors, exports, and share links so every
            account feels like the platform was built for them.
          </p>
        </article>

        <article className="glass rounded-[30px] p-6">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-300">
            Feature lane
          </p>
          <h3 className="mt-2 text-xl font-semibold">
            Executive summary generation
          </h3>
          <p className="mt-4 text-sm leading-7 text-slate-400">
            Lead each report with severity, readiness, estimated recon cost, and
            key risks so customers see value instantly.
          </p>
        </article>

        <article className="glass rounded-[30px] p-6">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-300">
            Feature lane
          </p>
          <h3 className="mt-2 text-xl font-semibold">
            Share links and approval actions
          </h3>
          <p className="mt-4 text-sm leading-7 text-slate-400">
            Give clients secure review flows with comments, approvals, and
            status updates instead of sending static attachments only.
          </p>
        </article>
      </section>
    </AppShell>
  );
}
