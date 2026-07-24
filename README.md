# OneFlow Phase 1 Prototype

Visual prototype of two future Microsoft Power Apps applications sharing one local data service.

## Applications

| App | Route | Purpose |
| --- | --- | --- |
| **PPG Workday** (source system mockup) | `/workday` | HR worker directory, create/edit, employment status |
| **OneFlow Admin Dashboard** | `/oneflow` | New-hire onboarding checklist and progress |

Hub landing page: `/`

> **Phase 1 Prototype — Mock Workday and OneFlow Data**

This is **not** the real Workday product. No Workday logos or trademarks are used.

## Future Microsoft architecture

```
PPG Workday
  → Dataverse
  → Power Automate
  → OneFlow
  → Power BI
```

Phase 1 uses `localStorage` behind a `DataService` interface so Dataverse can replace storage later without redesigning the UI.

**Not in Phase 1:** Power Automate, real Dataverse, Power BI.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Email delivery (Mock Inbox + optional AWS SES)

Workflow notifications always write to the **Mock Inbox** (audit channel).

Optional real delivery uses server-side **AWS SES v2** (`EMAIL_MODE=mock|ses|both`).

| Mode | Behavior |
| --- | --- |
| `mock` (default) | Mock Inbox only |
| `ses` | SES send + delivery metadata |
| `both` | Mock Inbox + SES |

Configure via `.env.example` / Synology container env. Secrets never use `NEXT_PUBLIC_*`.

Admin UI: **Settings → Email Delivery (SES)** (`/oneflow/email-delivery`)

```bash
npm run test:email
```

Docker (Synology-friendly):

```bash
docker compose up --build
```

See [docs/SYNOLOGY_DEPLOYMENT.md](docs/SYNOLOGY_DEPLOYMENT.md) for Container Manager, reverse proxy, and production `.env` setup.

Outbound HTTPS to AWS SES is required; no inbound AWS ports.

## How to test the New Hire workflow

1. Open **PPG Workday** (`/workday`).
2. Either:
   - **Create worker** and set Employment status to **New Hire**, or
   - Open an existing worker → **Mark as New Hire** / edit status to New Hire.
3. Confirm the worker shows `requiresOnboarding` and an onboarding case number.
4. Open **OneFlow Admin** (`/oneflow`) → **New Hires** — the worker appears.
5. Open the case — exactly **14** tasks across four groups.
6. Change task status or tick complete — progress and activity update immediately and persist after refresh.
7. Mark the same worker New Hire again — **no duplicate** onboarding case is created.

## Checklist generation (14 tasks)

| Group | Tasks |
| --- | --- |
| HR Checklist | Send induction pack |
| IT Checklist | Create Network ID, Create Email, SailPoint Access, Laptop Assigned, Software Installed |
| Facilities Checklist | Access Card, Parking Access, Building Access, EHS Briefing |
| Hiring Manager Checklist | Buddy Assigned, Team Introduction, Training Plan Prepared, First Week Schedule Ready |

Generated only once per employee when status becomes **New Hire**.

## Sample Malaysian employees

1. Nur Aisyah binti Hassan — Finance — Active  
2. Rajesh a/l Subramaniam — IT — Active  
3. Amirul Hakim bin Ismail — Operations — Pre-Hire  
4. Chong Mei Xin — Marketing — Contract / Active  
5. Priya Lakshmi a/p Ganesan — HR — Offboarding  

## Data layer

- `src/data/types.ts` — `Employee`, `OnboardingCase`, `ChecklistTask`, `ActivityHistory`, `AssignmentRule`, `DataService`
- `src/data/repositories/` — `EmployeeRepository`, `OnboardingCaseRepository`, `ChecklistTaskRepository`, `ActivityRepository`, `AssignmentRuleRepository`
  - `LocalStorageRepository` — current implementation (`oneflow-phase1-v2`)
  - `DataverseRepository` — Phase 2 placeholders (TODO only; no fake API calls)
- `src/data/automation/` — `buildNewHireAutomationPayload`, `AutomationService` (simulation mode)
- UI uses `DataService` / `useData()` only — never `localStorage` directly

### Task ownership routing

| Responsible team | Tasks |
| --- | --- |
| HR Operations | Send induction pack |
| IT Security | Create Network ID, Create Email, SailPoint Access |
| Onsite IT Support | Laptop Assigned, Software Installed |
| Facilities / Building Management | Access Card, Parking Access, Building Access, EHS Briefing |
| Hiring Manager | Buddy Assigned, Team Introduction, Training Plan Prepared, First Week Schedule Ready (manager name/email from employee) |

### Routes (OneFlow)

- `/login` — Prototype authentication
- `/oneflow` — Overview (Admin)
- `/oneflow/new-hires` — New hire list (Admin)
- `/oneflow/checklist-templates` — Admin checklist template management
- `/oneflow/cases/[id]` — Case details
- `/oneflow/my-tasks` — Role-filtered assigned tasks
- `/oneflow/my-new-hires` — Hiring Manager new hires
- `/oneflow/inbox` — Mock Outlook inbox (`mockEmails` in localStorage)
- `/oneflow/automation-runs` — Mock Power Automate runs (Admin)

### Demo accounts (password `Demo123!`)

| Role | Email |
| --- | --- |
| Admin | admin@ppg-demo.com |
| HR | hr@ppg-demo.com |
| IT Security | itsecurity@ppg-demo.com |
| Onsite IT | itsupport@ppg-demo.com |
| Facilities | facilities@ppg-demo.com |
| Hiring Manager | manager@ppg-demo.com |
| Finance | finance@ppg-demo.com |
| Corporate Card Admin | corporatecard@ppg-demo.com |
| Administration (Access Card / exit clearance) | admin@ppg-demo.com |
| Offboarding Employee (Daniel Lim) | daniel.lim@ppg-demo.com |

Reset demo: Admin Overview → **Reset demo data** (clears cases/tasks/emails/runs; restores seed employees and Daniel exit form).


