# OneFlow — Solution Proposal and User Guide

> Official demonstration: [https://oneflow.highrulez.com](https://oneflow.highrulez.com)  
> Status: Hackathon prototype using synthetic data  
> Primary document: [OneFlow_Project_Documentation.docx](OneFlow_Project_Documentation.docx)

## Executive summary

OneFlow is an employee lifecycle orchestration prototype. Workday remains the HR source system; OneFlow is the coordination and experience layer around onboarding and offboarding. It turns a lifecycle event into owned cross-functional work, employee actions, forms, notifications and readiness or clearance visibility.

The prototype demonstrates lifecycle cases, role-based dashboards, My Tasks, onboarding and offboarding journeys, Day 1 Readiness, Exit Clearance, forms, inbox messages, reports, email testing and automation simulation. It is not a live Workday integration or production system.

## Challenge and business problem

**The exact original hackathon question was not available in the repository.** Project materials support the business problem of coordinating employee lifecycle work across HR, IT, Finance, Facilities, managers, specialist teams and employees without replacing Workday.

| Problem | Impact | OneFlow response |
| --- | --- | --- |
| Fragmented follow-up | Teams chase status across email and separate tools. | Shared lifecycle cases and activity. |
| Unclear ownership | Work can be late or overlooked. | Role dashboards and task queues. |
| Readiness uncertainty | Employees can start before arrangements are ready. | Day 1 Readiness tracking. |
| Exit-control risk | Access, assets and clearance steps lack a shared view. | Exit Clearance tracking. |

## OneFlow concept and assessment

```text
Workday / HR source → lifecycle event → OneFlow → team responsibilities
→ tasks, forms and notifications → readiness / clearance → outcome
```

Workday is the source HR system. OneFlow is the employee lifecycle orchestration layer; it is not a Workday replacement.

| Requirement | Prototype response | Status | Production requirement |
| --- | --- | --- | --- |
| Central visibility | Cases, dashboards and reports | Demonstrated | Governed data and analytics |
| Cross-team ownership | Role dashboards and My Tasks | Demonstrated | Entra ID and RBAC |
| Onboarding / offboarding | Nabila and Hamdan journeys | Demonstrated | Workday integration |
| Notifications | Mock Inbox and optional SES testing | Partially Demonstrated | Microsoft 365 integration |
| Automation | Simulation records outcomes | Simulated | Power Automate |
| Workday integration | Workday mock with five synthetic records | Future Production Integration | Approved Workday APIs |
| Reporting / audit | Prototype reports and activity | Partially Demonstrated | Power BI and governed audit controls |

**Does OneFlow solve the challenge?** Yes at prototype level: it validates the workflow and orchestration approach. Production integrations, identity, persistence and operational controls remain future work.

## What was built

- Project hub, demo login, role-based dashboards and Workday mock.
- Employee directory, lifecycle cases, My Tasks, forms, inbox, reports and settings.
- Nabila onboarding journey and Day 1 Readiness.
- Hamdan offboarding journey and Exit Clearance.
- Email Delivery, recipient mapping, test-email controls and automation simulation.

## Benefits and users

| Benefit group | OneFlow improvement |
| --- | --- |
| HR | Consolidated lifecycle visibility, clearer ownership and escalation. |
| IT | Earlier provisioning and offboarding visibility with structured tasks. |
| Managers | Readiness, transition and action visibility. |
| Employees | One place for tasks, forms, messages and journey progress. |
| Management | Bottleneck, lifecycle and potential SLA visibility. |
| Organisation | Standardised process, traceability and automation potential. |

| Persona | What they do |
| --- | --- |
| OneFlow Admin | Monitor cases, priorities, reports, settings and simulation. |
| HR | Coordinate employee-facing milestones, forms and readiness. |
| Hiring Manager | Complete assigned transition and new-hire actions. |
| IT Security / Onsite IT | Complete access, equipment and technical work. |
| Finance / Facilities / Corporate Card | Complete operational setup, return and clearance work. |
| Quality / Product Stewardship | Complete specialist responsibilities. |
| Onboarding / Offboarding employee | Follow personal journey, tasks, forms and messages. |

## Workflow

### Onboarding

1. Employee enters Preboarding in Workday.
2. OneFlow receives or demonstrates the event and creates a case/responsibilities.
3. Teams see role-specific work; the employee sees personal actions and forms.
4. Progress contributes to Day 1 Readiness and risks can be escalated.

### Offboarding

1. An exit initiates or demonstrates an offboarding case.
2. Roles receive responsibilities; the manager completes transition work.
3. IT access removal, asset return and operational checks are tracked.
4. Exit Clearance exposes open risks until the case closes.

The prototype uses a Workday mock and simulated automation. Production would use approved Workday events and governed workflow automation.

## User manual

1. Open [oneflow.highrulez.com](https://oneflow.highrulez.com).
2. Select a quick-login demo role or synthetic employee account.
3. Use **Dashboard** for summary and priorities; use **My Tasks** for the actual work queue.
4. Open **Lifecycle Cases** for cross-functional progress and activity.
5. Use Nabila to demonstrate My Onboarding, Day 1 Readiness, forms and inbox.
6. Use Hamdan to demonstrate My Offboarding and Exit Clearance.
7. Use IT Security to demonstrate a role dashboard and task ownership.

All identities and data are synthetic `@ppg-demo.com` records.

## Prototype test-email guide

AWS SES is configured server-side for optional prototype test delivery. Administrators do not enter AWS credentials.

1. Login as **OneFlow Admin** and open **Settings** → **Email Delivery**.
2. Confirm delivery configuration.
3. Under **Recipient Mappings**, find a synthetic recipient such as `nabila.aziz@ppg-demo.com`.
4. Enter or update its approved Delivery Destination and save.
5. Select the simulated recipient and choose **Send Test Email**.
6. Check the mapped mailbox and review the delivery result/audit where available.

Never publish a real mapped destination, password, token or AWS credential. AWS SES is prototype-only; production should use Microsoft 365 / Outlook / Exchange Online through Power Automate, Microsoft Graph or an approved messaging integration.

| Issue | Check |
| --- | --- |
| Recipient does not receive email | Verify recipient mapping. |
| Settings do not persist | Verify application settings persistence/container storage. |
| Credential error | Credentials are server-side. |
| `SignatureDoesNotMatch` | Verify key/secret pair and region server-side. |
| Sender rejected | Verify SES sender identity/configuration. |

## Architecture and production direction

Current prototype: Browser → OneFlow / Workday mock → Next.js application → DataService/prototype persistence → simulated automation → optional AWS SES test delivery.

Proposed production architecture, **not implemented**: Workday → approved Integration/API → Dataverse → Power Automate → OneFlow, with Microsoft Entra ID, Microsoft 365 / Outlook, Power BI, Azure Key Vault and Azure Monitor / Application Insights.

| Capability | Prototype | Production direction |
| --- | --- | --- |
| HR source | Workday mock | Approved Workday integration |
| Authentication | Demo accounts | Microsoft Entra ID |
| Data | Prototype/local persistence | Dataverse / approved datastore |
| Automation | Simulated | Power Automate |
| Email | Mock Inbox + optional SES | Microsoft 365 / Outlook |
| Reporting | Prototype reports | Power BI |
| Secrets / monitoring | Server-side basics / logs | Key Vault / Azure Monitor / Application Insights |

## Investment, ROI, roadmap and limitations

Prototype incremental infrastructure cost may be low where existing hosting and open-source components are available. Production cost drivers include Microsoft licensing, Dataverse, Power Automate, Power BI, Azure, Workday integration, implementation, testing, security assessment, support, maintenance and change management. Actual enterprise pricing may differ substantially due to existing PPG agreements.

Measure success through onboarding completion before Day 1, readiness, task SLA, overdue work, manual follow-ups, offboarding closure by last working day, delayed account termination, case volume and stakeholder satisfaction.

1. Hackathon prototype — completed concept demonstration.
2. Enterprise validation — architecture, security and Workday integration review.
3. Production foundation — Entra ID, Dataverse, environments and security.
4. Integration and automation — Workday, Power Automate and Microsoft 365.
5. Reporting, controlled Malaysia pilot, then scale if successful.

Verified limitations: mock Workday, demo authentication, simulated automation, prototype persistence, prototype-only SES email, and no implemented Entra ID, Dataverse, Power Automate, Power BI or enterprise monitoring.

## Team

**Team Error 404:** Thamotharan, Renuka Malar; Ramachandran, Yuganeswary; Hairul Afizee; Bashari, Noorliana.
