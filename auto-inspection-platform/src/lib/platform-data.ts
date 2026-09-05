export type NavItem = {
  href: string;
  label: string;
  description: string;
};

export type Kpi = {
  label: string;
  value: string;
  detail: string;
  tone: "positive" | "neutral" | "warning";
};

export type InspectionStatus =
  | "In progress"
  | "Ready for review"
  | "Flagged"
  | "Scheduled";

export type Inspection = {
  id: string;
  customer: string;
  vehicle: string;
  vin: string;
  location: string;
  inspector: string;
  status: InspectionStatus;
  score: number;
  aiFindings: number;
  workflow: string;
  nextStep: string;
};

export type Vehicle = {
  stockId: string;
  vehicle: string;
  vin: string;
  mileage: string;
  readiness: string;
  risk: string;
  reconEstimate: string;
};

export type Report = {
  id: string;
  customer: string;
  template: string;
  delivery: string;
  eta: string;
  summary: string;
};

export type FeatureCard = {
  title: string;
  description: string;
  badge: string;
};

export type Automation = {
  title: string;
  description: string;
  impact: string;
};

export type TeamMember = {
  name: string;
  role: string;
  focus: string;
  utilization: string;
};

export type SettingCategory = {
  title: string;
  description: string;
  values: string[];
};

export type PlatformData = {
  brand: {
    name: string;
    slogan: string;
  };
  nav: NavItem[];
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
  };
  kpis: Kpi[];
  alerts: string[];
  inspections: Inspection[];
  vehicles: Vehicle[];
  reports: Report[];
  reportHighlights: string[];
  differentiators: FeatureCard[];
  automations: Automation[];
  team: TeamMember[];
  settings: SettingCategory[];
  roadmap: Automation[];
};

const platformData: PlatformData = {
  brand: {
    name: "TorqueInspect",
    slogan:
      "A premium operating system for vehicle inspection, AI review, reconditioning, and client reporting.",
  },
  nav: [
    {
      href: "/",
      label: "Dashboard",
      description: "Executive visibility, KPIs, and live operational health.",
    },
    {
      href: "/inspections",
      label: "Inspections",
      description: "Mobile-first workflows, queues, and AI exception review.",
    },
    {
      href: "/vehicles",
      label: "Vehicles",
      description: "VIN-aware inventory, readiness, and recon intelligence.",
    },
    {
      href: "/reports",
      label: "Reports",
      description: "Branded PDFs, client delivery, and portfolio-level insights.",
    },
    {
      href: "/settings",
      label: "Settings",
      description: "Templates, automation rules, integrations, and team controls.",
    },
  ],
  hero: {
    eyebrow: "Unified vehicle inspection platform",
    title:
      "Build one product that feels premium, moves faster, and absorbs every strong idea from your existing apps.",
    subtitle:
      "The foundation is already positioned around the features that matter most: AI photo triage, VIN-driven workflows, fraud and audit signals, offline-friendly field operations, branded reporting, and recon cost intelligence.",
  },
  kpis: [
    {
      label: "Inspections completed",
      value: "1,284",
      detail: "+18.4% month over month",
      tone: "positive",
    },
    {
      label: "Average turnaround",
      value: "14m",
      detail: "Reduced by AI-assisted triage",
      tone: "positive",
    },
    {
      label: "Critical flags",
      value: "37",
      detail: "6 need manager review",
      tone: "warning",
    },
    {
      label: "Client delivery SLA",
      value: "98.7%",
      detail: "Reports out in under 5 minutes",
      tone: "neutral",
    },
  ],
  alerts: [
    "Three inspections have recurring glare issues that may need retakes.",
    "Two vehicles show odometer-to-condition mismatches worth manual review.",
    "Brake severity is trending up for Southwest fleet accounts this week.",
  ],
  inspections: [
    {
      id: "INSP-4821",
      customer: "North Ridge Auto Group",
      vehicle: "2024 Ford F-150 Lariat",
      vin: "1FTFW1E89RFA11842",
      location: "Dallas, TX",
      inspector: "Maya Chen",
      status: "Ready for review",
      score: 91,
      aiFindings: 4,
      workflow: "Dealer intake",
      nextStep: "Publish branded report",
    },
    {
      id: "INSP-4819",
      customer: "Summit Fleet Services",
      vehicle: "2023 Tesla Model Y Long Range",
      vin: "7SAYGDEE6PF221944",
      location: "Phoenix, AZ",
      inspector: "Andre Collins",
      status: "In progress",
      score: 84,
      aiFindings: 7,
      workflow: "Lease return",
      nextStep: "Finish underbody capture",
    },
    {
      id: "INSP-4817",
      customer: "BlueLine Auctions",
      vehicle: "2022 Toyota Camry SE",
      vin: "4T1G11AK5NU645204",
      location: "Atlanta, GA",
      inspector: "Riley James",
      status: "Flagged",
      score: 68,
      aiFindings: 11,
      workflow: "Auction intake",
      nextStep: "Manager review for structural alert",
    },
    {
      id: "INSP-4815",
      customer: "Prime Dealer Network",
      vehicle: "2024 BMW X5 xDrive40i",
      vin: "5UXCR6C06R9S18742",
      location: "Chicago, IL",
      inspector: "Noah Patel",
      status: "Scheduled",
      score: 0,
      aiFindings: 0,
      workflow: "Retail delivery",
      nextStep: "Dispatch field inspector",
    },
  ],
  vehicles: [
    {
      stockId: "STK-1042",
      vehicle: "2024 Ford F-150 Lariat",
      vin: "1FTFW1E89RFA11842",
      mileage: "12,402 mi",
      readiness: "Retail ready",
      risk: "Low",
      reconEstimate: "$480",
    },
    {
      stockId: "STK-1177",
      vehicle: "2023 Tesla Model Y Long Range",
      vin: "7SAYGDEE6PF221944",
      mileage: "29,188 mi",
      readiness: "Awaiting detail",
      risk: "Medium",
      reconEstimate: "$1,240",
    },
    {
      stockId: "STK-1210",
      vehicle: "2022 Toyota Camry SE",
      vin: "4T1G11AK5NU645204",
      mileage: "41,320 mi",
      readiness: "Blocked by repair",
      risk: "High",
      reconEstimate: "$3,860",
    },
    {
      stockId: "STK-1264",
      vehicle: "2024 BMW X5 xDrive40i",
      vin: "5UXCR6C06R9S18742",
      mileage: "8,044 mi",
      readiness: "Inspection pending",
      risk: "Low",
      reconEstimate: "$0",
    },
  ],
  reports: [
    {
      id: "RPT-944",
      customer: "North Ridge Auto Group",
      template: "Dealer Premium PDF",
      delivery: "Shared link + PDF",
      eta: "Sent 4m after approval",
      summary: "Executive summary, severity breakdown, and media annotations.",
    },
    {
      id: "RPT-941",
      customer: "Summit Fleet Services",
      template: "Fleet Return Packet",
      delivery: "Portal + webhook",
      eta: "Queued for publish",
      summary: "Condition grade, damages, compliance notes, and return charges.",
    },
    {
      id: "RPT-938",
      customer: "BlueLine Auctions",
      template: "Auction Condition Sheet",
      delivery: "Batch export",
      eta: "Manager approval required",
      summary: "Lane-ready disposition summary with photo references.",
    },
  ],
  reportHighlights: [
    "Executive summary with severity, readiness, and estimated reconditioning cost.",
    "Panel-by-panel media gallery with AI annotations and inspector notes.",
    "White-label exports for dealers, fleets, and auction partners.",
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
  automations: [
    {
      title: "AI damage clustering",
      description:
        "Groups dents, scrapes, paint issues, and glass findings by panel so reviewers see exceptions instead of raw photo dumps.",
      impact: "Cuts review time and makes the product feel smarter than checklist-only competitors.",
    },
    {
      title: "VIN-driven checklist generation",
      description:
        "Adapts checklists based on make, model, trim, fuel type, drivetrain, and account-specific requirements.",
      impact: "Prevents generic inspections and reduces missed steps.",
    },
    {
      title: "Fraud and audit monitoring",
      description:
        "Flags timestamp anomalies, retake spikes, geolocation mismatches, and media metadata issues.",
      impact: "Builds enterprise trust for claims, auctions, and fleet programs.",
    },
  ],
  team: [
    {
      name: "Maya Chen",
      role: "Regional lead inspector",
      focus: "Dealer intake quality",
      utilization: "92%",
    },
    {
      name: "Andre Collins",
      role: "Fleet specialist",
      focus: "Lease return workflows",
      utilization: "87%",
    },
    {
      name: "Riley James",
      role: "Auction review manager",
      focus: "Exception handling",
      utilization: "76%",
    },
  ],
  settings: [
    {
      title: "Inspection templates",
      description:
        "Choose how workflows adapt by customer, vehicle type, or market segment.",
      values: [
        "Dealer intake and front-line retail",
        "Auction lane and disposition",
        "Fleet, rental, and lease return",
      ],
    },
    {
      title: "Automation rules",
      description:
        "Decide what gets auto-approved, escalated, or converted into recon work.",
      values: [
        "Escalate structural, frame, and airbag events",
        "Create recon actions from severity thresholds",
        "Auto-publish green inspections to clients",
      ],
    },
    {
      title: "Connected systems",
      description:
        "Reserve space for DMS, CRM, claims, auctions, and storage integrations.",
      values: [
        "Dealer management and inventory feeds",
        "Auction and remarketing exports",
        "Claims, auth, and client webhooks",
      ],
    },
  ],
  roadmap: [
    {
      title: "Offline-first field mode",
      description:
        "Queue inspections locally, compress photos on device, and sync once the connection returns.",
      impact: "Critical for field inspectors and rural/facility work.",
    },
    {
      title: "Customer portal and approvals",
      description:
        "Give clients secure share links, report approvals, and status visibility without back-and-forth emails.",
      impact: "Improves close rate and looks more polished than legacy tools.",
    },
    {
      title: "Recon marketplace handoff",
      description:
        "Convert findings into parts, labor, vendor assignment, and readiness timelines.",
      impact: "Moves the product from inspection software to operational command center.",
    },
  ],
};

export function getPlatformData() {
  return platformData;
}
