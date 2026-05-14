// Both values are read from Vite env at build time. In dev, the proxy in
// vite.config.ts handles /api -> http://localhost:8000, so leave BASE empty.
// In prod, set VITE_API_BASE_URL to the deployed backend URL (no trailing slash).
const BASE = ((import.meta as any).env?.VITE_API_BASE_URL || "").replace(/\/$/, "");
const TOKEN = (import.meta as any).env?.VITE_API_TOKEN || "";

function url(path: string): string {
  return `${BASE}${path}`;
}

function headers(extra: Record<string, string> = {}): Record<string, string> {
  const h: Record<string, string> = { ...extra };
  if (TOKEN) h["Authorization"] = `Bearer ${TOKEN}`;
  return h;
}

export type IndexEntry = {
  run_id: string;
  task_name: string;
  uploaded_filename: string;
  model: string;
  status: "queued" | "running" | "pausing" | "paused" | "done" | "failed";
  pause_requested?: boolean;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  total_episodes: number;
  golden_count: number;
  failure_count: number;
};

export type Episode = {
  episode_id: string;
  category: "golden" | "failure";
  name: string;
  trajectory_key: string;
  result_key: string;
  status: "pending" | "running" | "done" | "error";
  error_message: string;
  summary: Record<string, any>;
  started_at: string | null;
  finished_at: string | null;
  has_explorer: boolean;
};

export type RunManifest = IndexEntry & {
  episodes: Episode[];
  error_message: string;
};

export async function listRuns(): Promise<IndexEntry[]> {
  const r = await fetch(url("/api/runs"), { headers: headers() });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getRun(runId: string): Promise<RunManifest> {
  const r = await fetch(url(`/api/runs/${runId}`), { headers: headers() });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getEpisodeResult(runId: string, episodeId: string) {
  const r = await fetch(url(`/api/runs/${runId}/episodes/${episodeId}`), { headers: headers() });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function uploadZip(file: File): Promise<{ run_id: string }> {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch(url("/api/runs"), { method: "POST", headers: headers(), body: fd });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function deleteRun(runId: string): Promise<{ deleted: string }> {
  const r = await fetch(url(`/api/runs/${runId}`), { method: "DELETE", headers: headers() });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function pauseRun(runId: string): Promise<{ run_id: string; status: string }> {
  const r = await fetch(url(`/api/runs/${runId}/pause`), { method: "POST", headers: headers() });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function resumeRun(runId: string): Promise<{ run_id: string; status: string }> {
  const r = await fetch(url(`/api/runs/${runId}/resume`), { method: "POST", headers: headers() });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export function downloadUrl(runId: string, kind: "golden" | "failure"): string {
  const path = kind === "golden"
    ? `/api/runs/${runId}/golden_summary.csv`
    : `/api/runs/${runId}/failure_summary.xlsx`;
  return url(path);
}

export function episodeExplorerUrl(runId: string, episodeId: string): string {
  return url(`/api/runs/${runId}/episodes/${encodeURIComponent(episodeId)}/explorer.html`);
}

export function explorersZipUrl(runId: string): string {
  return url(`/api/runs/${runId}/explorers.zip`);
}
