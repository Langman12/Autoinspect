import Link from "next/link";
import { ReactNode } from "react";

import { getPlatformData } from "@/lib/platform-data";

type AppShellProps = {
  children: ReactNode;
  currentPath: string;
  title: string;
  subtitle: string;
};

export function AppShell({
  children,
  currentPath,
  title,
  subtitle,
}: AppShellProps) {
  const data = getPlatformData();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-6 py-8 lg:px-10">
      <header className="glass rounded-[32px] px-6 py-6 sm:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-700 text-lg font-semibold text-white shadow-lg shadow-blue-950/50">
              TI
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-sky-200">
                  {data.brand.name}
                </span>
                <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                  Merge-ready app foundation
                </span>
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-white">
                  {title}
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                  {subtitle}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100">
              Launch inspection
            </button>
            <button className="rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
              Generate report
            </button>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="glass rounded-[30px] p-5">
          <div className="border-b border-white/10 pb-5">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-300">
              Platform modules
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-400">
              Shared navigation for the unified product that will absorb your
              existing GitHub apps once you send them over.
            </p>
          </div>

          <nav className="mt-5 space-y-3">
            {data.nav.map((item) => {
              const active = item.href === currentPath;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-[24px] border px-4 py-4 transition ${
                    active
                      ? "border-sky-400/25 bg-sky-400/10"
                      : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">
                      {item.label}
                    </p>
                    {active ? (
                      <span className="rounded-full border border-sky-400/20 bg-sky-400/15 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-sky-200">
                        Active
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {item.description}
                  </p>
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 rounded-[24px] border border-emerald-400/15 bg-emerald-400/10 p-4">
            <p className="text-sm font-semibold text-emerald-100">
              Ahead-of-market themes
            </p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-emerald-50/85">
              <li>AI damage review and anomaly detection</li>
              <li>VIN-aware workflow generation</li>
              <li>Recon cost and readiness intelligence</li>
            </ul>
          </div>
        </aside>

        <section className="space-y-6">{children}</section>
      </div>
    </div>
  );
}
