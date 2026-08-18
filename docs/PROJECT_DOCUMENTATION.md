# OneFlow Project Documentation

> **Project Status:** Hackathon Prototype / Phase 1
> **Last Updated:** 19 August 2026
> **Official demo:** https://oneflow.highrulez.com

The presentation-ready package is `OneFlow_Project_Documentation.docx`; this is its repository-friendly source summary.

## Project team

**Team Error 404**

| Team Member | Project |
|---|---|
| Thamotharan, Renuka Malar | OneFlow — PPG AEN Hackathon 2026 |
| Ramachandran, Yuganeswary | OneFlow — PPG AEN Hackathon 2026 |
| Hairul Afizee | OneFlow — PPG AEN Hackathon 2026 |
| Bashari, Noorliana | OneFlow — PPG AEN Hackathon 2026 |

## Overview

OneFlow is an employee-lifecycle orchestration prototype. A mock Workday worker change becomes a OneFlow case with role-based tasks, forms, progress, mock notifications, activity history, and operational reporting. It demonstrates a concept; it is not a live Workday integration or production system.

Users access the hackathon demo at https://oneflow.highrulez.com. Reverse-proxy and Docker ports are internal deployment details, not normal user access URLs.

| Problem | OneFlow capability | Prototype result |
|---|---|---|
| Fragmented communication | Lifecycle case and mock notifications | Demonstrated |
| Unclear ownership | Role-based task assignment and views | Demonstrated |
| Manual follow-up | Progress and automation simulation | Simulated |
| Limited visibility | Case progress and reports | Demonstrated |
| Offboarding risk | Clearance and task tracking | Demonstrated |
| Auditability | Activity history and task state | Demonstrated |

## Portals and capabilities

### PPG Workday Demo Portal

This is a mock HR source application, not real Workday. No production Workday API is connected. It supports worker/employee detail review, including department, position, location, start date, and lifecycle status (Active, Preboarding, Offboarding), plus supported demonstration changes.

### OneFlow Portal

OneFlow provides lifecycle case management, onboarding/offboarding journeys, role-specific responsibilities, assigned tasks, forms, completion tracking, mock notifications, activity history, progress visibility, reports, and automation simulation.

The prototype contains optional AWS SES-related configuration from earlier development. It is a **prototype/legacy optional capability and is not recommended for production**. Production notifications should use Microsoft 365, Outlook/Exchange Online, Microsoft Graph, and/or the Power Automate Microsoft 365 Outlook connector.

## Demo data and walkthroughs

The demonstration workforce contains exactly five workers, all at **Malaysia – UOA Business Park**:

| Worker | Status | Start date |
|---|---|---|
| Thamotharan, Renuka Malar | Active | 8 Nov 2021 |
| Aziz, Nabila | Preboarding | 10 business days ahead |
| Nagaraja, Umashangari | Active | 20 Feb 2023 |
| Ramachandran, Yuganeswary | Active | 15 Jan 2024 |
| Hamdan, Muhamad Asyraf Naqiyuddin | Offboarding | 13 Jun 2022 |

Nabila is the onboarding walkthrough employee: Workday Demo → Preboarding worker → OneFlow lifecycle case → role tasks → progress, mock notifications, and history → onboarding ready. Hamdan is the offboarding walkthrough employee: initiation → departmental clearance, access removal, equipment return, finance/manager actions → completion and audit trail. These are local Phase 1 behaviours; production needs approved Workday, identity/access, and Power Automate integration.

### User guide

1. Open https://oneflow.highrulez.com.
2. Use **Demo Account Quick Login** and choose a role.
3. Use the dashboard to find work and navigation.
4. Open **PPG Workday Demo** to inspect workers and lifecycle status.
5. Open a OneFlow case to review tasks, forms, progress, notifications, and history.
6. Complete permitted actions; case progress and history update.
7. Use reports and automation history for the operational demonstration.
8. Return to login/session controls to switch roles.

Roles include Admin, HR, Hiring Manager, Onsite IT, IT Security, Finance, Facilities, Quality, Product Stewardship, Onboarding Employee, and Offboarding Employee. Each role sees its relevant assigned work; Admin reviews the complete demo.

## Deployment

```text
User Browser
  ↓
https://oneflow.highrulez.com
  ↓
Cloudflare DNS / HTTPS
  ↓
Synology Reverse Proxy
  ↓
OneFlow Docker
  ↓
Next.js Application
```

Technical note: the reverse proxy forwards internally to Docker host port `3005`; Docker maps `3005:3000`; Next.js listens on container port `3000`. `NEXT_PUBLIC_APP_URL=https://oneflow.highrulez.com` is the public configuration value.

## Proposed Microsoft-first production direction

The proposed production architecture follows a Microsoft-first approach because the organisation already primarily uses Microsoft 365 and Azure services. Final platform selection remains subject to PPG enterprise architecture, cybersecurity, and licensing review.

```text
Workday API / Integration → Microsoft Dataverse → Power Automate → OneFlow
                                                    ├→ Microsoft 365 / Outlook / Teams
                                                    └→ Power BI Reporting
Microsoft Entra ID provides identity. Azure integration services, Key Vault,
Monitor, and Application Insights support the solution as required.
```

Workday remains the HR source system; OneFlow is the orchestration/experience layer. Microsoft 365/Outlook/Exchange Online and Microsoft Graph are the production communication direction; AWS SES is not.

## Cost assumptions

All values are **indicative planning estimates** from public Microsoft Malaysia pages checked 19 August 2026. They exclude tax, discounts, and enterprise-agreement treatment and use USD1 = RM4.25 only for illustrative conversion. Actual PPG cost may be materially lower or structured differently due to existing Microsoft enterprise licensing agreements.

Existing Microsoft 365, Outlook/Exchange Online, Entra ID, Azure tenant/services, and some Power Platform entitlement may be covered by an existing enterprise agreement; entitlement is to be confirmed and is not assumed free.

| Incremental component | Public planning indicator |
|---|---|
| Power Apps Premium | USD20/user/month ≈ RM85 |
| Power Automate Premium | USD15/user/month ≈ RM63.75 |
| Power Automate Process | USD150/bot/month ≈ RM637.50 |
| Dataverse database capacity | USD40/GB/month ≈ RM170 |
| Power BI Pro | USD14/user/month ≈ RM59.50 |
| Azure integration, Key Vault, Monitor, App Insights | Consumption / enterprise quote required |
| Workday integration/API | Contract / scope confirmation required |

Indicative implementation planning range: RM260,000–RM750,000. It covers discovery, integration, data model, SSO/security, workflow configuration, testing, reporting, training, change management, and transition; it is not a vendor quote.

Sources: [Power Apps](https://www.microsoft.com/en-my/power-platform/products/power-apps/pricing), [Power Automate](https://www.microsoft.com/en-my/power-platform/products/power-automate/pricing), [Power BI](https://www.microsoft.com/en-my/power-platform/products/power-bi), [Azure Pricing Calculator](https://azure.microsoft.com/pricing/calculator/).

## Security, privacy, and troubleshooting

The demo uses synthetic data and browser local storage. Production requires Entra ID SSO/MFA/RBAC, least privilege, Key Vault secrets, encryption, audit retention, secure SDLC, approved integration identities, data minimisation, retention/deletion controls, and privacy/security assessment.

For users: if the portal does not load, confirm internet access, verify https://oneflow.highrulez.com, refresh, then contact the demo administrator. For old data, use available reset/demo controls; clear site data only when appropriate. If a role cannot see a task, verify the Quick Login role and assignment.

For administrators: Docker host port `3005` and container port `3000` are internal implementation details, not user URLs. Verify reverse-proxy and container health as required.

## Conclusion

OneFlow addresses the employee-lifecycle coordination challenge by demonstrating onboarding and offboarding workflows with role ownership and central visibility. It does not replace Workday. A production implementation should align to PPG’s Microsoft/Azure ecosystem, use Microsoft 365 for enterprise communication, and evaluate Power Platform/Azure services against existing enterprise agreements before procurement.
