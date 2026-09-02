import { AppShell } from "@/components/app-shell";
import { getPlatformData } from "@/lib/platform-data";

export default function SettingsPage() {
  const data = getPlatformData();

  return (
    <AppShell
      currentPath="/settings"
      title="Settings and Automations"
      subtitle="Configure the workflows, templates, permissions, and integrations that make the unified app adaptable to every account."
    >
      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="glass rounded-[30px] p-6 sm:p-8">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-300">
            Platform configuration
          </p>
          <h2 className="mt-2 text-2xl font-semibold">
            Settings that prepare the product for enterprise use
          </h2>
          <div className="mt-6 space-y-4">
            {data.settings.map((section) => (
              <div
                key={section.title}
                className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5"
              >
                <h3 className="text-lg font-semibold text-white">
                  {section.title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-400">
                  {section.description}
                </p>
                <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-300">
                  {section.values.map((value) => (
                    <li
                      key={value}
                      className="rounded-2xl border border-white/8 bg-white/[0.02] px-3 py-2"
                    >
                      {value}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </article>

        <div className="space-y-6">
          <article className="glass rounded-[30px] p-6">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-300">
              Automation rules
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              Features that make the app feel ahead of competitors
            </h2>
            <div className="mt-5 space-y-4">
              {data.automations.map((item) => (
                <div
                  key={item.title}
                  className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5"
                >
                  <h3 className="text-lg font-semibold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-slate-400">
                    {item.description}
                  </p>
                  <p className="mt-3 text-sm text-slate-300">{item.impact}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="glass rounded-[30px] p-6">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-300">
              Team utilization
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              People and accountability
            </h2>
            <div className="mt-5 space-y-3">
              {data.team.map((member) => (
                <div
                  key={member.name}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-white">{member.name}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {member.role}
                      </p>
                    </div>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                      {member.utilization}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-300">
                    Focus: {member.focus}
                  </p>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>
    </AppShell>
  );
}
