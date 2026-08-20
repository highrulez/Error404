# Synology deployment — OneFlow / PPG Workday

This guide deploys the Next.js app with **Docker** and **Synology Container Manager**.

Local development is unchanged:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use `.env.local` on your workstation. Docker is **not** required for local development.

Production URL: [https://oneflow.highrulez.com](https://oneflow.highrulez.com)

---

## 1. Push the reviewed project to GitHub

After review, push the repository from your workstation. Do **not** commit `.env`, `.env.local`, or real AWS credentials.

---

## 2. Clone or download on the NAS

Place the project at:

```text
/volume1/docker/oneflow
```

Example:

```bash
cd /volume1/docker
git clone <YOUR_GITHUB_REPO_URL> oneflow
cd oneflow
```

Or download a release ZIP and extract it to that path.

---

## 3. Create the NAS environment file

Create:

```text
/volume1/docker/oneflow/.env
```

This file is read by Docker Compose / Container Manager. It must **never** be committed to Git.

---

## 4. Add production environment variables

Use this minimal template. AWS credentials stay on the NAS only; delivery and
sender defaults can subsequently be managed in the Admin UI.

```env
NEXT_PUBLIC_APP_URL=https://oneflow.highrulez.com

# Optional initial defaults; saved Admin settings take precedence.
EMAIL_MODE=mock
AWS_REGION=ap-southeast-1
SES_FROM_EMAIL=
SES_FROM_NAME=OneFlow

# Required only when SES delivery is enabled.
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
```

Notes:

- `EMAIL_MODE=mock` is safe for smoke tests without AWS credentials.
- `EMAIL_MODE=ses` or `both` requires valid AWS credentials and a verified SES sender.
- Admin **Settings → Email Delivery** manages delivery mode, sender configuration,
  application URL, and recipient mappings. Those saved settings take precedence
  over the non-secret environment defaults above and persist in `./data` on the NAS.
- AWS credentials remain server-side and are never stored in the Settings UI.

---

## 5–10. Synology Container Manager

1. Open **Synology Container Manager**.
2. Go to **Project**.
3. Create a project named **`oneflow`**.
4. Select path: `/volume1/docker/oneflow`.
5. Use compose file: **`compose.yaml`**.
6. Before the first start, create the persistent data directory and give it to
   OneFlow's non-root container user (UID/GID `10001:10001`):

   ```bash
   sudo mkdir -p /volume1/docker/oneflow/data
   sudo chown -R 10001:10001 /volume1/docker/oneflow/data
   sudo chmod 750 /volume1/docker/oneflow/data
   ```

7. Build and start the project.

The service listens on container port **3000** (`HOSTNAME=0.0.0.0`).
The bind mount maps `/volume1/docker/oneflow/data` to `/app/data`; therefore
`email-settings.json` survives restarts, rebuilds, and project recreation.

---

## 11. Internal smoke test

From the LAN:

```text
http://NAS-IP:3000
```

Confirm the landing page and OneFlow login load.

---

## 12. Reverse proxy

In **Control Panel → Login Portal → Advanced → Reverse Proxy** (or equivalent):

**Source**

| Field | Value |
| --- | --- |
| Protocol | HTTPS |
| Hostname | `oneflow.highrulez.com` |
| Port | `443` |

**Destination**

| Field | Value |
| --- | --- |
| Protocol | HTTP |
| Hostname | `localhost` |
| Port | `3000` |

### 13. If `localhost` does not work

Use the NAS LAN IP as the destination hostname instead of `localhost`.

---

## 14. TLS certificate

Configure a **Let's Encrypt** certificate for:

```text
oneflow.highrulez.com
```

Attach it to the reverse proxy / web service that terminates HTTPS.

---

## 15. Ports that must not be exposed publicly

Do **not** publish these to the internet:

| Port | Reason |
| --- | --- |
| 3000 | App (proxy only) |
| 5000 / 5001 | DSM |
| 22 | SSH |

Keep port 3000 reachable on the LAN (or via reverse proxy) only as needed.

---

## 16. Test AWS SES after deployment

1. Sign in as Admin.
2. Open **Settings → Email Delivery (SES)** (`/oneflow/email-delivery`).
3. Confirm mode, credentials status, and **masked** recipient mappings.
4. Send the **test email**.
5. Confirm delivery metadata (MessageId) without exposing full real addresses in the browser.

Outbound HTTPS from the NAS to AWS SES is required. No inbound AWS ports are needed.

---

## 17. Updating the site later

On the NAS:

```bash
cd /volume1/docker/oneflow
git pull
```

Then in Container Manager → Project **oneflow** → **Build** / **Restart** (rebuild so the new image is used).

Keep the same `/volume1/docker/oneflow/.env`; do not overwrite it from Git.

---

## 18. Local development vs Docker

| Environment | How to run | Config |
| --- | --- | --- |
| Workstation | `npm run dev` | `.env.local` |
| Synology | Container Manager + `compose.yaml` | `/volume1/docker/oneflow/.env` |

Docker is optional for developers. Application features, demo data, and workflows are identical.

---

## 19–20. Secrets policy

- Docker deployment uses the **NAS `.env` file** (or Container Manager environment UI).
- **Never commit** `.env` / `.env.local` or real AWS credentials.
- The Docker image does **not** embed AWS keys or saved recipient addresses.
- Only `.env.example` (placeholders) belongs in Git.
- GitHub Actions **validates** (lint/build/optional image build) and does **not** deploy to Synology.
