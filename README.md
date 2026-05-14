# Frontend — Autoeval SPA

Single-page app for the Autoeval platform. Drag a `task_name.zip` onto the
upload card, watch episodes evaluate live, download the summaries.

Stack:

- **React 18** + **TypeScript** + **Vite 5** (fast dev, sub-second HMR)
- **TanStack Query** for fetching, caching, and polling
- **React Router 6** for client-side routes
- **Tailwind CSS** for styling
- **react-dropzone** for the upload control

Built bundle is static — served by nginx in production. **Client-side rendered** end to end; the backend never returns HTML.

---

## Layout

```
frontend/
├── .env.example
├── Dockerfile                # multi-stage: Node build → nginx
├── nginx.conf                # SPA fallback + asset caching
├── index.html
├── package.json
├── vite.config.ts            # dev proxy /api → :8000
├── tailwind.config.ts
├── postcss.config.js
├── tsconfig.json
└── src/
    ├── main.tsx              # React entry
    ├── App.tsx               # layout + routes
    ├── index.css             # tailwind directives
    ├── api/
    │   └── client.ts         # typed fetch wrapper
    ├── components/
    │   ├── Dropzone.tsx
    │   ├── FolderLayoutDiagram.tsx
    │   └── StatusBadge.tsx
    └── pages/
        ├── UploadPage.tsx
        ├── RunsListPage.tsx
        └── RunDetailPage.tsx
```

---

## Environment variables

All are read at **build time** by Vite (bakes them into the JS bundle). See [`.env.example`](.env.example).

| Var | Default | Notes |
|---|---|---|
| `VITE_API_BASE_URL` | `""` (empty) | Absolute URL of the backend. **Leave empty in dev** so the Vite proxy handles `/api` → `:8000`. In prod, set to the backend's Cloud Run URL. No trailing slash. |
| `VITE_API_TOKEN` | `""` (empty) | Sent as `Authorization: Bearer <token>` on every request. Only set when the backend has `API_TOKEN` configured. |

> Vite reads `.env` only at startup. If you change it while `npm run dev` is running, kill and restart Vite.

---

## Local dev

```bash
cd frontend
cp .env.example .env       # leave both vars empty for local dev
npm install
npm run dev                # http://localhost:5173
```

The Vite dev server proxies `/api/*` requests to `http://localhost:8000` (see [`vite.config.ts`](vite.config.ts)), so the SPA and the API feel like one origin even though they're two processes. Start the API first — for localhost, **`docker compose up --build -d`** from [`../backend/`](../backend/) is the default workflow; see [`../backend/README.md`](../backend/README.md) → *Local dev*.

---

## Pages

### `/` — Upload page
- Drag-and-drop (react-dropzone) for `.zip` files
- Inline diagram of the required folder layout
- Recent-runs preview table (clickable rows → run detail)

### `/runs` — Runs list
- Table of all runs with status badges, model, episode counts, timestamps
- Delete button per row (confirm prompt) — cascades through `DELETE /api/runs/{id}`
- Auto-refresh every 5 s

### `/runs/:id` — Run detail
- Header with task name, status badge, model, counts, error (if any)
- Download buttons for `golden_summary.csv` and `failure_summary.xlsx`
- **Pause / Resume buttons** (visible only in the matching state):
  - **Pause** shows when status is `running` or `queued`. Tells the backend to stop scheduling new episodes; in-flight calls finish, then the run lands in `paused`.
  - **Resume** shows when status is `paused` or `pausing`. Tells the backend to re-schedule the worker and pick up remaining `pending` episodes.
- **Delete-run** button (returns to `/runs` on success)
- Two tabs:
  - **Golden Episodes** — columns include `GT Class(AI)`, `GT Justification(AI)`, `Success Criteria (AI)`, and human-review placeholders
  - **Failure Episodes** — columns include `GT Class(AI)`, `GT Justification(AI)`, `failure_type`, `reason`, `root_cause`, `fix`
- While the run status is `queued`, `running`, or `pausing`, the page auto-refetches every 3 s. `paused`, `done`, and `failed` stop the polling.

---

## API client

[`src/api/client.ts`](src/api/client.ts) is a small typed `fetch` wrapper:

```ts
import {
  listRuns, getRun, uploadZip,
  pauseRun, resumeRun, deleteRun,
  downloadUrl,
} from "./api/client";
```

Functions:

| Export | Method + path |
|---|---|
| `listRuns()` | `GET /api/runs` |
| `getRun(id)` | `GET /api/runs/{id}` |
| `uploadZip(file)` | `POST /api/runs` (multipart) |
| `pauseRun(id)` | `POST /api/runs/{id}/pause` |
| `resumeRun(id)` | `POST /api/runs/{id}/resume` |
| `deleteRun(id)` | `DELETE /api/runs/{id}` |
| `downloadUrl(id, kind)` | builds the CSV/XLSX URL (uses Bearer if needed) |

Behaviour:

- Reads `VITE_API_BASE_URL` once and prepends it to every path.
- Reads `VITE_API_TOKEN` once and attaches it as a Bearer header when present.
- Errors throw an `Error` whose `.message` is the response body — used directly by `useQuery` / `useMutation` to surface in the UI.

No CORS or auth logic in the components; everything goes through this module.

---

## Build for production

```bash
cd frontend
npm run build         # → frontend/dist/
```

That's an immutable static bundle (HTML shell + hashed assets + the inlined env values). Anything that serves it as static files works — nginx (what the Dockerfile uses), Cloud Storage, Firebase Hosting, etc.

If you change `VITE_API_BASE_URL`, you must rebuild — env values are baked in.

---

## Deploy to Cloud Run

The Dockerfile is multi-stage: `node:20-slim` builds the SPA, then `nginx:1.27-alpine` serves the `dist/`. Build context is `frontend/`.

The frontend bundle bakes in the backend URL at build time, so deploy the backend first, capture its URL, then build/deploy the frontend.

```bash
export PROJECT_ID=...
export REGION=us-central1
export BACKEND_URL=https://autoeval-backend-<hash>-<region>.a.run.app

# Build (context = frontend/)
gcloud builds submit frontend \
  --tag $REGION-docker.pkg.dev/$PROJECT_ID/autoeval/frontend:latest \
  --substitutions=_BACKEND_URL=$BACKEND_URL

# Deploy
gcloud run deploy autoeval-frontend \
  --image=$REGION-docker.pkg.dev/$PROJECT_ID/autoeval/frontend:latest \
  --region=$REGION \
  --allow-unauthenticated \
  --cpu=1 --memory=256Mi
```

After the frontend's URL is known, open CORS on the backend:

```bash
gcloud run services update autoeval-backend \
  --region=$REGION \
  --update-env-vars="CORS_ALLOW_ORIGINS=https://autoeval-frontend-<hash>-<region>.a.run.app"
```

For end-to-end CI builds (one push → both services deployed), see [`../cloudbuild.yaml`](../cloudbuild.yaml). It builds and deploys both services in dependency order.

---

## nginx behaviour

[`nginx.conf`](nginx.conf):

- Serves `index.html` for any unknown path (so React Router's deep links work on refresh).
- Caches `/assets/*` (Vite outputs hashed filenames) for 1 year, `immutable`.
- Never caches the HTML shell.
- Cloud Run sets `$PORT`; the container start command rewrites the nginx `listen` directive before launching.

---

## Status badges

The `StatusBadge` component renders a coloured pill for every value the backend can return:

| Status | Colour | When |
|---|---|---|
| `queued` / `pending` | slate | Run / episode not started yet |
| `running` | blue | Worker actively processing |
| `pausing` | amber | Pause requested; in-flight calls finishing |
| `paused` | dark slate | No work in flight; resume to continue |
| `done` | emerald | Successful completion |
| `failed` / `error` | rose | Catastrophic failure |

---

## Common gotchas

- **CORS error in browser console** — backend's `CORS_ALLOW_ORIGINS` doesn't include the frontend's origin. Update env on the backend Cloud Run service.
- **`401 invalid or missing bearer token`** — backend's `API_TOKEN` is set but `VITE_API_TOKEN` isn't (or doesn't match). Either clear the backend token or rebuild the frontend with the right value.
- **Stale UI after `.env` edit** — Vite reads env only at startup. Restart `npm run dev`. For production, you must rebuild.
- **`Network request failed`** — backend isn't running, or `VITE_API_BASE_URL` points somewhere wrong.
- **Pause button doesn't immediately flip status to `paused`** — expected. In-flight OpenAI calls have to finish first; the status sits at `pausing` until they do (up to ~60 s for `gpt-5.1`).

---

## Stack notes

- No SSR, no Next.js, no SPA framework beyond React. Adding heavier rendering (Next.js, Remix) is a big migration; if you ever need SEO or per-route data loading, that's the trigger.
- No state library — TanStack Query handles all server state. Local UI state is `useState`.
- No component library (shadcn/MUI etc.). Tailwind utilities + a few hand-rolled components are enough at this scope.
