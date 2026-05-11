export default function FolderLayoutDiagram() {
  return (
    <div className="rounded-lg border bg-white p-5">
      <h3 className="text-sm font-semibold text-slate-900">Expected zip layout</h3>
      <pre className="mt-3 text-xs leading-relaxed text-slate-700 font-mono whitespace-pre">
{`task_name.zip
├── Golden_trajectories/
│   ├── episode1/
│   │   └── agent/trajectory.json   (or just trajectory.json)
│   ├── episode2/
│   └── episodeN/
└── Failure_trajectories/
    ├── episode1/
    └── episodeN/`}
      </pre>
      <ul className="mt-4 text-xs text-slate-600 space-y-1 list-disc list-inside">
        <li>Each episode must contain at least one <code>trajectory.json</code>.</li>
        <li>Optional <code>result.json</code> / <code>config.json</code> beside it for agent + model metadata.</li>
        <li>Files outside <code>Golden_trajectories/</code> and <code>Failure_trajectories/</code> are ignored.</li>
      </ul>
    </div>
  );
}
