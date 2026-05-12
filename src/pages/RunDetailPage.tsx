import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteRun, downloadUrl, Episode, getRun, pauseRun, resumeRun } from "../api/client";
import StatusBadge from "../components/StatusBadge";

const GOLDEN_COLS = [
  "Task",
  "Agent",
  "Model",
  "GT Class(AI)",
  "GT Justification(AI)",
  "Success Criteria (AI)",
  "GT Class(Human)",
  "Success Criteria (Human)",
  "HITL Remarks",
  "Task name",
  "Trajectory name",
];

const FAILURE_COLS = [
  "agent",
  "benchmark",
  "trial_id",
  "status",
  "GT Class(AI)",
  "GT Justification(AI)",
  "failure_type",
  "reason",
  "root_cause",
  "fix",
];

export default function RunDetailPage() {
  const { runId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"golden" | "failure">("golden");

  const q = useQuery({
    queryKey: ["run", runId],
    queryFn: () => getRun(runId!),
    refetchInterval: (query) => {
      const data: any = query.state.data;
      const status = data?.status;
      // Keep polling while the run is in motion OR transitioning.
      const live = new Set(["running", "queued", "pausing"]);
      return live.has(status) ? 3000 : false;
    },
  });

  const del = useMutation({
    mutationFn: deleteRun,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["runs"] });
      navigate("/runs");
    },
  });

  const pause = useMutation({
    mutationFn: pauseRun,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["run", runId] });
      await qc.invalidateQueries({ queryKey: ["runs"] });
    },
  });

  const resume = useMutation({
    mutationFn: resumeRun,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["run", runId] });
      await qc.invalidateQueries({ queryKey: ["runs"] });
    },
  });

  if (q.isLoading) return <div className="text-sm text-slate-500">Loading…</div>;
  if (q.error) return <div className="text-sm text-rose-700">{(q.error as Error).message}</div>;
  const m = q.data!;
  const goldenEps = m.episodes.filter((e) => e.category === "golden");
  const failureEps = m.episodes.filter((e) => e.category === "failure");

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold">{m.task_name}</h1>
            <div className="mt-1 flex items-center gap-3 text-sm text-slate-600">
              <StatusBadge status={m.status} />
              <span>model: {m.model}</span>
              <span>
                {m.golden_count} golden / {m.failure_count} failure
              </span>
            </div>
            {m.error_message ? (
              <pre className="mt-3 text-xs text-rose-700 whitespace-pre-wrap">{m.error_message}</pre>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 justify-end">
            <a
              href={downloadUrl(m.run_id, "golden")}
              className="text-xs rounded border px-3 py-1.5 hover:bg-slate-50"
            >
              golden_summary.csv
            </a>
            <a
              href={downloadUrl(m.run_id, "failure")}
              className="text-xs rounded border px-3 py-1.5 hover:bg-slate-50"
            >
              failure_summary.xlsx
            </a>
            {(m.status === "running" || m.status === "queued") ? (
              <button
                type="button"
                disabled={pause.isPending}
                className="text-xs rounded border border-amber-300 px-3 py-1.5 text-amber-800 hover:bg-amber-50 disabled:opacity-50"
                onClick={() => pause.mutate(m.run_id)}
              >
                {pause.isPending ? "Pausing…" : "Pause"}
              </button>
            ) : null}
            {(m.status === "paused" || m.status === "pausing") ? (
              <button
                type="button"
                disabled={resume.isPending}
                className="text-xs rounded border border-blue-300 px-3 py-1.5 text-blue-800 hover:bg-blue-50 disabled:opacity-50"
                onClick={() => resume.mutate(m.run_id)}
              >
                {resume.isPending ? "Resuming…" : "Resume"}
              </button>
            ) : null}
            <button
              type="button"
              disabled={del.isPending}
              className="text-xs rounded border border-rose-200 px-3 py-1.5 text-rose-700 hover:bg-rose-50 disabled:opacity-50"
              onClick={() => {
                if (
                  !confirm(
                    `Delete this run and all stored files? This cannot be undone.`,
                  )
                ) {
                  return;
                }
                del.mutate(m.run_id);
              }}
            >
              Delete run
            </button>
          </div>
        </div>
        {del.isError ? (
          <p className="mt-3 text-sm text-rose-700">{(del.error as Error).message}</p>
        ) : null}
        {pause.isError ? (
          <p className="mt-3 text-sm text-rose-700">{(pause.error as Error).message}</p>
        ) : null}
        {resume.isError ? (
          <p className="mt-3 text-sm text-rose-700">{(resume.error as Error).message}</p>
        ) : null}
      </div>

      <div className="rounded-lg border bg-white">
        <div className="flex border-b">
          <button
            onClick={() => setTab("golden")}
            className={`px-5 py-3 text-sm font-medium ${
              tab === "golden"
                ? "border-b-2 border-slate-900 text-slate-900"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Golden Episodes ({goldenEps.length})
          </button>
          <button
            onClick={() => setTab("failure")}
            className={`px-5 py-3 text-sm font-medium ${
              tab === "failure"
                ? "border-b-2 border-slate-900 text-slate-900"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Failure Episodes ({failureEps.length})
          </button>
        </div>
        <div className="p-4 overflow-x-auto">
          {tab === "golden" ? (
            <EpisodeTable eps={goldenEps} cols={GOLDEN_COLS} />
          ) : (
            <EpisodeTable eps={failureEps} cols={FAILURE_COLS} />
          )}
        </div>
      </div>
    </div>
  );
}

function EpisodeTable({ eps, cols }: { eps: Episode[]; cols: string[] }) {
  if (eps.length === 0) return <div className="text-sm text-slate-500">No episodes.</div>;
  return (
    <table className="min-w-full text-xs">
      <thead className="text-slate-500">
        <tr>
          <th className="text-left py-2 px-2">Episode</th>
          <th className="text-left py-2 px-2">Status</th>
          {cols.map((c) => (
            <th key={c} className="text-left py-2 px-2 whitespace-nowrap">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {eps.map((ep) => (
          <tr key={ep.episode_id} className="border-t align-top">
            <td className="py-2 px-2 font-medium whitespace-nowrap">{ep.name}</td>
            <td className="py-2 px-2">
              <StatusBadge status={ep.status} />
              {ep.error_message ? (
                <div className="text-rose-700 mt-1">{ep.error_message}</div>
              ) : null}
            </td>
            {cols.map((c) => (
              <td key={c} className="py-2 px-2 max-w-[16rem] truncate" title={String(ep.summary?.[c] ?? "")}>
                {String(ep.summary?.[c] ?? "")}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
