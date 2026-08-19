# OneFlow Project Documentation

> Official hackathon demo: [https://oneflow.highrulez.com](https://oneflow.highrulez.com)
> Status: Hackathon prototype using synthetic data
> Primary presentation document: `docs/OneFlow_Project_Documentation.docx`

## Purpose

OneFlow is an employee lifecycle orchestration prototype. Workday remains the HR source system; OneFlow coordinates the downstream work across HR, IT, Facilities, Finance, managers and employees. It provides lifecycle cases, role ownership, readiness or clearance visibility, tasks, forms, notifications, activity and reports. It is not a live Workday integration or production system.

| Business problem | OneFlow capability | Benefit |
| --- | --- | --- |
| Fragmented lifecycle follow-up | Lifecycle cases, activity and notifications | Shared operational view |
| Unclear ownership | Role dashboards and task queues | Clear accountable teams |
| Late readiness checks | Day 1 and clearance progress | Earlier intervention |
| Offboarding risk | Access, asset and clearance tracking | More visible controls |

## Access and roles

Open [https://oneflow.highrulez.com](https://oneflow.highrulez.com). Use manual sign-in with a supplied demo account or choose a full quick-login card. The accounts and all underlying data are synthetic.

| Group | Demo accounts |
| --- | --- |
| Administration | OneFlow Admin |
| People & Management | Soh, Shi Rui Sherry; Sarah Tan |
| Technology | Mohd Azli, Amirul Mukhlis; Zulfikar Zikri, Nuqman Haziq |
| Operations | Nur Aisyah; Bashari, Noorliana (MAL); Michael Wong |
| Specialist Functions | Quality Representative; Product Stewardship Representative |
| Employee Journeys | Aziz, Nabila; Hamdan, Muhamad Asyraf Naqiyuddin |

The role dashboard is a summary of priorities, journeys and upcoming work. **My Tasks** is the actual operational queue. Admin can monitor the complete demonstration, review cases, reports, settings, notifications and automation simulation. Other roles see their relevant responsibilities.

## Current user manual

- **Admin Dashboard:** monitors lifecycle health, readiness or clearance progress, blocked or overdue work, responsible teams and upcoming lifecycle events.
- **Employees:** shows the synthetic workforce directory and lifecycle statuses.
- **Lifecycle Cases:** opens onboarding and offboarding cases for tasks, ownership, progress and activity.
- **My Tasks:** the role-based queue for due dates, status and permitted actions.
- **Reports:** lifecycle, readiness and bottleneck reporting views.
- **Settings:** administrative configuration, including Email Delivery and supported reset controls.
- **Mock Inbox:** safe in-app notification record for the prototype.
- **Automation:** prototype automation simulation; it is not live Power Automate.
- **My Onboarding / My Offboarding:** employee-facing journey, actions, messages and forms.
- **My Forms / My Profile:** form progress and synthetic employee information.

## How to send a test email

AWS SES is a prototype test-delivery capability. AWS credentials are configured server-side. Administrators do not enter access keys or secret keys in the browser.

1. Sign in as **OneFlow Admin** at [https://oneflow.highrulez.com](https://oneflow.highrulez.com).
2. Open **Settings**, then **Email Delivery**.
3. Review delivery configuration, AWS region, sender details, application URL and the server-side credential status.
4. Under **Recipient Mappings**, find the synthetic identity to test, such as `nabila.aziz@ppg-demo.com`.
5. Enter the administrator-approved test mailbox as its **Delivery Destination** and save the mapping.
6. In the test-email controls, select the simulated recipient and choose **Send Test Email**.
7. Check the mapped mailbox and the resulting OneFlow delivery or mock-notification record where available.

OneFlow identities remain synthetic. The mapped delivery destination determines the actual SES test mailbox. Do not document real destinations unless they are intentionally safe test addresses.

| Synthetic identity examples | Typical walkthrough |
| --- | --- |
| `admin@ppg-demo.com`, `sherry.soh@ppg-demo.com` | Administrator and HR |
| `amirul.azli@ppg-demo.com`, `nuqman.zulfikar@ppg-demo.com` | IT Security and Onsite IT |
| `noorliana.bashari@ppg-demo.com` | Finance |
| `nabila.aziz@ppg-demo.com` | Onboarding employee |
| `muhamad.asyraf.hamdan@ppg-demo.com` | Offboarding employee |

### Email troubleshooting

| Problem | Check |
| --- | --- |
| Recipient did not receive email | Confirm the mapping exists and the delivery destination is correct. |
| Credentials not configured | Confirm server-side AWS credentials; never enter credentials in the UI. |
| `SignatureDoesNotMatch` | Confirm the server-side key/secret pair and AWS region. |
| Sender rejected | Confirm the SES sender identity and sender configuration. |
| Settings cannot save | Check persistent Docker storage and data-directory permissions, then application logs. |

AWS SES is used only for prototype testing. A PPG production implementation should use the approved Microsoft 365 / Outlook / Exchange Online direction, potentially through Microsoft Graph, Power Automate and approved Microsoft/Azure integration.

## Employee walkthroughs

### Aziz, Nabila - onboarding

Aziz, Nabila is the preboarding walkthrough. **My Onboarding** shows Day 1 readiness, countdown, next action, remaining actions and journey progress. **My Tasks**, **My Inbox**, **My Forms** and **My Profile** give the employee a single place to understand due work, messages, forms and readiness.

### Hamdan, Muhamad Asyraf Naqiyuddin - offboarding

Hamdan is the offboarding walkthrough. **My Offboarding** shows exit progress, exit-clearance actions, forms and messages. Administrators and responsible departments can follow the same lifecycle case for access removal, asset return and clearance tasks.

## Workday demo data

PPG Workday Demo is a mock source application; no real Workday API is connected. The synthetic workforce contains exactly five workers, all at Malaysia - UOA Business Park.

| Worker | Lifecycle status |
| --- | --- |
| Thamotharan, Renuka Malar | Active |
| Aziz, Nabila | Preboarding |
| Nagaraja, Umashangari | Active |
| Ramachandran, Yuganeswary | Active |
| Hamdan, Muhamad Asyraf Naqiyuddin | Offboarding |

## Current prototype vs production

| Area | Current prototype | Proposed production |
| --- | --- | --- |
| HR source | Mock Workday | Approved Workday integration |
| Identity | Demo login accounts | Microsoft Entra ID, SSO and RBAC |
| Data | Browser/local prototype data | Dataverse or approved persistence |
| Automation | Simulation | Power Automate and approved integrations |
| Email | Mock Inbox and AWS SES test delivery | Microsoft 365 / Outlook / Exchange Online |
| Operations | Demo visibility | Azure Monitor, Application Insights and governance |

## Deployment

```text
User Browser
  -> https://oneflow.highrulez.com
  -> Cloudflare DNS / HTTPS
  -> Reverse Proxy
  -> OneFlow Docker
  -> Next.js
```

Normal users access the public URL only. Docker, internal ports and credentials are deployment concerns. Email configuration and recipient mappings are maintained in OneFlow Settings; recipient mappings are not a normal `.env` administration task. Docker persists saved settings at `/volume1/docker/oneflow/data/email-settings.json`, mounted inside the application at `/app/data/email-settings.json`.

## Demo guide

1. Open OneFlow and introduce it as the orchestration layer, not a Workday replacement.
2. Use OneFlow Admin to show lifecycle visibility, Employees and Lifecycle Cases.
3. Open Nabila's case, then switch to Nabila's employee journey.
4. Switch to Hamdan to show exit clearance and offboarding progress.
5. Use IT Security or another role to contrast its dashboard with My Tasks.
6. Show Email Delivery, recipient mapping and Send Test Email.
7. Close with Reports, Automation and the Microsoft-first production direction.

## Team

**Team Error 404:** Thamotharan, Renuka Malar; Ramachandran, Yuganeswary; Hairul Afizee; Bashari, Noorliana.
