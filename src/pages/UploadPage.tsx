import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { listRuns, uploadZip } from "../api/client";
import Dropzone from "../components/Dropzone";
import FolderLayoutDiagram from "../components/FolderLayoutDiagram";
import StatusBadge from "../components/StatusBadge";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const nav = useNavigate();

  const upload = useMutation({
    mutationFn: uploadZip,
    onSuccess: ({ run_id }) => nav(`/runs/${run_id}`),
  });

  const recent = useQuery({ queryKey: ["runs"], queryFn: listRuns });

  return (
    <div className="space-y-8">
      <div className="rounded-lg border bg-white p-6">
        <h1 className="text-xl font-semibold text-slate-900">Upload a trajectory bundle</h1>
        <p className="mt-1 text-sm text-slate-600">
          One zip per task. Golden + failure episodes are routed by folder name, not by{" "}
          <code>reward.txt</code>.
        </p>
        <div className="mt-5">
          <Dropzone file={file} onFile={setFile} disabled={upload.isPending} />
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={() => file && upload.mutate(file)}
            disabled={!file || upload.isPending}
            className="rounded bg-slate-900 px-4 py-2 text-white text-sm font-medium disabled:opacity-40"
          >
            {upload.isPending ? "Uploading…" : "Upload"}
          </button>
          {upload.error ? (
            <span className="text-rose-700 text-sm">{(upload.error as Error).message}</span>
          ) : null}
        </div>
      </div>

      <FolderLayoutDiagram />

      <div className="rounded-lg border bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Recent runs</h2>
        </div>
        <div className="mt-4 overflow-x-auto">
          {recent.isLoading ? (
            <div className="text-sm text-slate-500">Loading…</div>
          ) : recent.data && recent.data.length > 0 ? (
            <table className="min-w-full text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="text-left py-2">Task</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Episodes</th>
                  <th className="text-left py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {recent.data.map((r) => (
                  <tr
                    key={r.run_id}
                    className="border-t cursor-pointer hover:bg-slate-50"
                    onClick={() => nav(`/runs/${r.run_id}`)}
                  >
                    <td className="py-2 font-medium">{r.task_name}</td>
                    <td className="py-2">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="py-2 text-slate-600">
                      {r.golden_count} golden / {r.failure_count} failure
                    </td>
                    <td className="py-2 text-slate-500">{r.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-sm text-slate-500">No runs yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
