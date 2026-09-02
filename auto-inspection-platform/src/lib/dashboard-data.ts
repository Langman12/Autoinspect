export type Kpi = {
  label: string;
  value: string;
  change: string;
  tone: "positive" | "neutral" | "warning";
};

export type Inspection = {
  id: string;
  customer: string;
  vehicle: string;
  location: string;
  inspector: string;
  status: "In progress" | "Ready for review" | "Flagged" | "Scheduled";
  score: number;
  aiFindings: number;
};

export type FeatureCard = {
  title: string;
  description: string;
  badge: string;
};

export type TimelineItem = {
  title: string;
  description: string;
  eta: string;
};

export type DashboardData = {
  brand: {
    name: string;
    slogan: string;
  };
  hero: {
    title: string;
    subtitle: string;
  };
  kpis: Kpi[];
  inspections: Inspection[];
  differentiators: FeatureCard[];
  roadmap: TimelineItem[];
  alerts: string[];
  reportHighlights: string[];
};

const dashboardData: DashboardData = {
  brand: {
    name: "TorqueInspect",
    slogan: "Premium vehicle inspection operations, AI triage, and dealer-grade reporting in one command center.",
  },
  hero: {
    title: "One modern inspection platform for dealers, fleets, auctions, and field teams.",
    subtitle:
      "This foundation combines mobile-friendly inspections, photo-first damage review, VIN-aware workflows, fraud signals, and branded reporting so the merged product can outperform generic checklist tools.",
  },
  kpis: [
    {
      label: "Inspections completed",
      value: "1,284",
      change: "+18.4% this month",
      tone: "positive",
    },
    {
      label: "Average turnaround",
      value: "14m",
      change: "-22% after AI triage",
      tone: "positive",
    },
    {
      label: "Critical flags",
      value: "37",
      change: "6 need manager review",
      tone: "warning",
    },
    {
      label: "Report delivery SLA",
      value: "98.7%",
      change: "Dealer-ready in under 5 minutes",
      tone: "neutral",
    },
  ],
  inspections: [
    {
      id: "INSP-4821",
      customer: "North Ridge Auto Group",
      vehicle: "2024 Ford F-150 Lariat",
      location: "Dallas, TX",
      inspector: "Maya Chen",
      status: "Ready for review",
      score: 91,
      aiFindings: 4,
    },
    {
      id: "INSP-4819",
      customer: "Summit Fleet Services",
      vehicle: "2023 Tesla Model Y Long Range",
      location: "Phoenix, AZ",
      inspector: "Andre Collins",
      status: "In progress",
      score: 84,
      aiFindings: 7,
    },
    {
      id: "INSP-4817",
      customer: "BlueLine Auctions",
      vehicle: "2022 Toyota Camry SE",
      location: "Atlanta, GA",
      inspector: "Riley James",
      status: "Flagged",
      score: 68,
      aiFindings: 11,
    },
    {
      id: "INSP-4815",
      customer: "Prime Dealer Network",
      vehicle: "2024 BMW X5 xDrive40i",
      location: "Chicago, IL",
      inspector: "Noah Patel",
      status: "Scheduled",
      score: 0,
      aiFindings: 0,
    },
  ],
  differentiators: [
    {
      title: "AI damage detection",
      description:
        "Cluster damage by panel, severity, and repair confidence so teams review exceptions instead of every photo.",
      badge: "Ahead of market",
    },
    {
      title: "VIN-aware workflows",
      description:
        "Decode trim, options, and service context to automatically adapt the checklist to the exact vehicle.",
      badge: "Faster inspections",
    },
    {
      title: "Fraud and audit signals",
      description:
        "Time stamp anomalies, geolocation mismatches, retake counts, and image metadata checks protect claim quality.",
      badge: "Enterprise trust",
    },
    {
      title: "Reconditioning intelligence",
      description:
        "Convert findings into parts, labor, and readiness estimates so operations teams can move from defect to action.",
      badge: "Revenue impact",
    },
  ],
  roadmap: [
    {
      title: "Offline-first field mode",
      description:
        "Queue inspections locally, compress media, and sync cleanly once the device regains connectivity.",
      eta: "Phase 2",
    },
    {
      title: "Client portal and share links",
      description:
        "Deliver branded reports, summary clips, and approval actions through secure share links and customer accounts.",
      eta: "Phase 2",
    },
    {
      title: "Insurance and auction integrations",
      description:
        "Push approved findings into downstream claims, disposition, and remarketing systems.",
      eta: "Phase 3",
    },
  ],
  alerts: [
    "3 inspections have repeated glare warnings that may need photo retakes.",
    "2 vehicles show odometer-to-condition mismatch patterns worth manual review.",
    "Brake severity spikes are trending up in the Southwest region this week.",
  ],
  reportHighlights: [
    "Executive summary with severity, readiness, and estimated reconditioning cost.",
    "Panel-by-panel media gallery with AI annotations and inspector notes.",
    "White-label exports for dealers, fleets, and auction partners.",
  ],
};

export function getDashboardData() {
  return dashboardData;
}
