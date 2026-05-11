import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { deleteRun, listRuns } from "../api/client";
import StatusBadge from "../components/StatusBadge";

export default function RunsListPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["runs"], queryFn: listRuns, refetchInterval: 5000 });
  const del = useMutation({
    mutationFn: deleteRun,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["runs"] }),
  });

  return (
    <div className="rounded-lg border bg-white p-6">
      <h1 className="text-xl font-semibold text-slate-900">All runs</h1>
      {q.isLoading ? (
        <div className="mt-4 text-sm text-slate-500">Loading…</div>
      ) : (
        <>
          {del.isError ? (
            <div className="mt-4 text-sm text-rose-700">{(del.error as Error).message}</div>
          ) : null}
          <table className="mt-4 min-w-full text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="text-left py-2">Task</th>
                <th className="text-left py-2">Status</th>
                <th className="text-left py-2">Model</th>
                <th className="text-left py-2">Episodes</th>
                <th className="text-left py-2">Created</th>
                <th className="text-right py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(q.data ?? []).map((r) => (
                <tr key={r.run_id} className="border-t hover:bg-slate-50">
                  <td className="py-2 font-medium">
                    <Link to={`/runs/${r.run_id}`} className="hover:underline">
                      {r.task_name}
                    </Link>
                  </td>
                  <td className="py-2">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="py-2 text-slate-600">{r.model}</td>
                  <td className="py-2 text-slate-600">
                    {r.golden_count} golden / {r.failure_count} failure
                  </td>
                  <td className="py-2 text-slate-500">{r.created_at}</td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      disabled={del.isPending}
                      className="text-xs rounded border border-rose-200 px-2 py-1 text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                      onClick={() => {
                        if (
                          !confirm(
                            `Delete run "${r.task_name}" and all stored files for this run? This cannot be undone.`,
                          )
                        ) {
                          return;
                        }
                        del.mutate(r.run_id);
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
