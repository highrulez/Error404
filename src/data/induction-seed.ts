import type {
  InductionChecklistForm,
  InductionChecklistItem,
  InductionSection,
  InductionSectionId,
} from "./induction-types";
import {
  INDUCTION_SECTION_IDS,
  INDUCTION_SECTION_NAMES,
  isSectionCleared,
  isSectionRequired,
  normalizeInductionSectionName,
  resolveInductionSectionId,
} from "./induction-types";
import type { ResponsibleTeam } from "./types";

function item(id: string, label: string, sortOrder: number): InductionChecklistItem {
  return { id, label, sortOrder, coverage: "Pending" };
}

export interface InductionSectionDefinition {
  id: InductionSectionId;
  sectionName: string;
  responsibleRole: string;
  assignedEmail: string;
  presenterName: string;
  responsibleTeam: ResponsibleTeam;
  required: boolean;
  sortOrder: number;
  labels: string[];
}

/** Canonical ownership for each induction section. */
export const INDUCTION_SECTION_DEFINITIONS: InductionSectionDefinition[] = [
  {
    id: INDUCTION_SECTION_IDS.hr,
    sectionName: INDUCTION_SECTION_NAMES[INDUCTION_SECTION_IDS.hr],
    responsibleRole: "Admin",
    assignedEmail: "admin@ppg-demo.com",
    presenterName: "Admin",
    responsibleTeam: "Administration",
    required: true,
    sortOrder: 1,
    labels: [
      "Short introduction to PPG Industries via short video clip or other approved video clips from PPG HQ",
      "Introduction to PPG Coatings Malaysia and its business units",
      "Introduction to the Human Resources department, its members and its functions within PPG Coatings Malaysia",
      "Clarification of questions relating to offer letter and terms of service",
      "Office working hours",
      "Security identification such as name tags and punch cards, where applicable",
      "Company hospitalization and insurance scheme",
      "Leave entitlement and application",
      "Types of leave and who to inform when sick or unable to report for work",
      "Map of PJ plant and PJX, where applicable",
      "Long service awards",
      "Performance Review Process",
      "Salary payment timing, administrator and deductions",
      "Bonus plan",
      "Allowances and other benefits",
    ],
  },
  {
    id: INDUCTION_SECTION_IDS.ethics,
    sectionName: INDUCTION_SECTION_NAMES[INDUCTION_SECTION_IDS.ethics],
    responsibleRole: "Admin",
    assignedEmail: "admin@ppg-demo.com",
    presenterName: "Admin",
    responsibleTeam: "Administration",
    required: true,
    sortOrder: 2,
    labels: ["Briefing on Global Code of Ethics"],
  },
  {
    id: INDUCTION_SECTION_IDS.it,
    sectionName: INDUCTION_SECTION_NAMES[INDUCTION_SECTION_IDS.it],
    responsibleRole: "Onsite IT Support",
    assignedEmail: "itsecurity@ppg-demo.com",
    presenterName: "Onsite IT Support",
    responsibleTeam: "Onsite IT Support",
    required: true,
    sortOrder: 3,
    labels: [
      "PPG Email Policy",
      "PPG Electronic and Telephonic Communication",
    ],
  },
  {
    id: INDUCTION_SECTION_IDS.ehs,
    sectionName: INDUCTION_SECTION_NAMES[INDUCTION_SECTION_IDS.ehs],
    responsibleRole: "Admin",
    assignedEmail: "admin@ppg-demo.com",
    presenterName: "Admin",
    responsibleTeam: "Administration",
    required: true,
    sortOrder: 4,
    labels: [
      "Safety and briefing on Fire Drill and Alarm",
      "Location of exits in plant and PJX office",
      "Fire Assembly Area",
      "EHS Guidelines and Factory Rules, where necessary",
    ],
  },
  {
    id: INDUCTION_SECTION_IDS.finance,
    sectionName: INDUCTION_SECTION_NAMES[INDUCTION_SECTION_IDS.finance],
    responsibleRole: "Admin",
    assignedEmail: "admin@ppg-demo.com",
    presenterName: "Admin",
    responsibleTeam: "Administration",
    required: true,
    sortOrder: 5,
    labels: [
      "Travel and Expense Policy of PPG",
      "Introduction to using the CONCUR system",
    ],
  },
  {
    id: INDUCTION_SECTION_IDS.quality,
    sectionName: INDUCTION_SECTION_NAMES[INDUCTION_SECTION_IDS.quality],
    responsibleRole: "Admin",
    assignedEmail: "admin@ppg-demo.com",
    presenterName: "Admin",
    responsibleTeam: "Administration",
    required: true,
    sortOrder: 6,
    labels: [
      "Briefing on PPG Malaysia Quality Overview",
      "Briefing on PPG ISO 9001 and relevant quality standards",
    ],
  },
  {
    id: INDUCTION_SECTION_IDS.productStewardship,
    sectionName:
      INDUCTION_SECTION_NAMES[INDUCTION_SECTION_IDS.productStewardship],
    responsibleRole: "Admin",
    assignedEmail: "admin@ppg-demo.com",
    presenterName: "Admin",
    responsibleTeam: "Administration",
    required: true,
    sortOrder: 7,
    labels: [
      "Introduction to product stewardship",
      "Role of product stewardship in the product lifecycle",
      "Product and inventory compliance",
      "TDG-related responsibilities, where applicable",
    ],
  },
];

function buildSectionFromDef(def: InductionSectionDefinition): InductionSection {
  return {
    id: def.id,
    sectionName: def.sectionName,
    items: def.labels.map((label, i) =>
      item(`${def.id}-item-${i + 1}`, label, i + 1)
    ),
    completedOn: null,
    presenterName: "",
    presenterInitials: "",
    presenterSignatureStatus: "Not Signed",
    employeeAcknowledged: false,
    remarks: "",
    required: def.required,
    status: "Pending",
    responsibleRole: def.responsibleRole,
    assignedEmail: def.assignedEmail,
    presenterUserId: null,
    presenterEmail: "",
    presenterRemarks: "",
    confirmedAt: null,
    linkedTaskId: null,
    sortOrder: def.sortOrder,
    applicabilityRule: null,
    requiredForEmployee: def.required,
    notRequiredReason: "",
  };
}

export function buildDefaultInductionSections(): InductionSection[] {
  return INDUCTION_SECTION_DEFINITIONS.map(buildSectionFromDef);
}

export function getInductionSectionDefinition(
  sectionIdOrName: string
): InductionSectionDefinition | undefined {
  return INDUCTION_SECTION_DEFINITIONS.find(
    (d) =>
      d.id === sectionIdOrName ||
      normalizeInductionSectionName(d.sectionName) ===
        normalizeInductionSectionName(sectionIdOrName)
  );
}

/**
 * Collapse duplicate sections by stable ID / normalized name.
 * Keeps the most complete instance (completed > has presenter > has remarks).
 */
export function dedupeInductionSections(
  sections: InductionSection[]
): { sections: InductionSection[]; removed: number } {
  const byKey = new Map<string, InductionSection>();
  let removed = 0;

  const score = (s: InductionSection) => {
    let n = 0;
    if (isSectionCleared(s)) n += 100;
    if (s.status === "In Progress") n += 40;
    if (s.completedOn) n += 20;
    if (s.presenterName?.trim()) n += 10;
    if (s.presenterInitials?.trim()) n += 5;
    if (s.confirmedAt) n += 5;
    if (s.remarks?.trim() || s.presenterRemarks?.trim()) n += 3;
    if (s.linkedTaskId) n += 2;
    n += (s.items?.length || 0) * 0.01;
    return n;
  };

  for (const raw of sections) {
    const id = resolveInductionSectionId(raw);
    const def = getInductionSectionDefinition(id);
    const key = id;
    const normalized: InductionSection = {
      ...buildSectionFromDef(def || INDUCTION_SECTION_DEFINITIONS[0]),
      ...raw,
      id,
      sectionName: def?.sectionName || raw.sectionName,
      responsibleRole: raw.responsibleRole || def?.responsibleRole,
      assignedEmail: raw.assignedEmail || def?.assignedEmail,
      sortOrder: raw.sortOrder ?? def?.sortOrder,
      status:
        raw.status ||
        (raw.presenterSignatureStatus === "Signed"
          ? "Completed"
          : raw.presenterSignatureStatus === "Not Required"
            ? "Not Required"
            : "Pending"),
      required: raw.required ?? def?.required ?? true,
      requiredForEmployee: raw.requiredForEmployee ?? raw.required ?? def?.required ?? true,
      items:
        raw.items?.length
          ? raw.items.map((it, i) => ({
              ...it,
              coverage: it.coverage || "Pending",
              sortOrder: it.sortOrder || i + 1,
            }))
          : def
            ? buildSectionFromDef(def).items
            : raw.items,
    };

    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, normalized);
    } else {
      removed += 1;
      byKey.set(key, score(normalized) >= score(existing) ? normalized : existing);
    }
  }

  // Ensure all canonical sections exist
  for (const def of INDUCTION_SECTION_DEFINITIONS) {
    if (!byKey.has(def.id)) {
      byKey.set(def.id, buildSectionFromDef(def));
    }
  }

  const result = [...byKey.values()].sort(
    (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)
  );
  return { sections: result, removed };
}

export function createBlankInductionForm(args: {
  id?: string;
  lifecycleCaseId: string;
  lifecycleType: "Onboarding" | "Offboarding";
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  jobTitle: string;
  department: string;
  dueDate?: string | null;
}): InductionChecklistForm {
  const ts = new Date().toISOString();
  const id =
    args.id ||
    `ind-form-${args.employeeId}-${Date.now().toString(36)}`;
  return {
    id,
    lifecycleCaseId: args.lifecycleCaseId,
    lifecycleType: args.lifecycleType,
    employeeId: args.employeeId,
    employeeName: args.employeeName,
    employeeEmail: args.employeeEmail,
    jobTitle: args.jobTitle,
    department: args.department,
    formStatus: "Not Sent",
    inductionSections: buildDefaultInductionSections(),
    employeeDeclaration: false,
    typedSignature: "",
    acknowledgementDate: null,
    hrReceivedDate: null,
    hrRemarks: "",
    submittedAt: null,
    reviewedAt: null,
    reviewedBy: null,
    linkedEmployeeTaskId: null,
    linkedReviewTaskId: null,
    formDueDate: args.dueDate ?? null,
    initialEmailId: null,
    createdAt: ts,
    updatedAt: ts,
  };
}

export function fileNameForInduction(employeeName: string): string {
  return `${employeeName.replace(/\s+/g, "_")}_Induction_Checklist.pdf`;
}

/**
 * Unique required sections that still need presenter completion.
 * Dedupes by stable section ID so validation never lists repeats.
 */
export function incompleteRequiredInductionSections(
  form: InductionChecklistForm
): InductionSection[] {
  const { sections } = dedupeInductionSections(form.inductionSections);
  const seen = new Set<string>();
  const out: InductionSection[] = [];
  for (const s of sections) {
    const id = resolveInductionSectionId(s);
    if (seen.has(id)) continue;
    seen.add(id);
    if (!isSectionRequired(s)) continue;
    if (isSectionCleared(s)) continue;
    out.push({ ...s, id });
  }
  return out;
}

export function inductionSectionProgress(form: InductionChecklistForm): {
  required: number;
  cleared: number;
  pending: InductionSection[];
  percent: number;
} {
  const { sections } = dedupeInductionSections(form.inductionSections);
  const requiredSections = sections.filter(isSectionRequired);
  const cleared = requiredSections.filter(isSectionCleared);
  const pending = requiredSections.filter((s) => !isSectionCleared(s));
  const percent = requiredSections.length
    ? Math.round((cleared.length / requiredSections.length) * 100)
    : 0;
  return {
    required: requiredSections.length,
    cleared: cleared.length,
    pending,
    percent,
  };
}

export function inductionFormProgress(form: InductionChecklistForm): number {
  const sec = inductionSectionProgress(form);
  let pct = Math.round(sec.percent * 0.8);
  if (form.employeeDeclaration && form.typedSignature.trim()) {
    pct = Math.min(95, pct + 15);
  }
  if (
    ["Submitted", "Under HR Review", "Completed"].includes(form.formStatus)
  ) {
    pct = form.formStatus === "Completed" ? 100 : 90;
  }
  return pct;
}

export function deriveInductionFormStatus(
  form: InductionChecklistForm
): InductionChecklistForm["formStatus"] {
  if (
    ["Completed", "Under HR Review", "Returned for Correction", "Submitted"].includes(
      form.formStatus
    )
  ) {
    return form.formStatus;
  }
  const sec = inductionSectionProgress(form);
  if (sec.cleared === 0 && form.formStatus === "Sent") return "Sent";
  if (sec.pending.length === 0 && sec.required > 0) {
    return "Ready for Employee Acknowledgement";
  }
  if (sec.cleared > 0) return "Sessions In Progress";
  if (form.formStatus === "Opened" || form.formStatus === "Draft") {
    return form.formStatus;
  }
  return form.formStatus === "Not Sent" ? "Not Sent" : "Sent";
}
