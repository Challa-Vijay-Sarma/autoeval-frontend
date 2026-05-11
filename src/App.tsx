import { Routes, Route, Link, useLocation } from "react-router-dom";
import UploadPage from "./pages/UploadPage";
import RunsListPage from "./pages/RunsListPage";
import RunDetailPage from "./pages/RunDetailPage";

export default function App() {
  const loc = useLocation();
  return (
    <div className="min-h-screen">
      <header className="border-b bg-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-6">
          <Link to="/" className="text-lg font-semibold text-slate-900">
            Autoeval Platform
          </Link>
          <nav className="flex gap-4 text-sm text-slate-600">
            <Link
              to="/"
              className={loc.pathname === "/" ? "text-slate-900 font-medium" : "hover:text-slate-900"}
            >
              Upload
            </Link>
            <Link
              to="/runs"
              className={
                loc.pathname.startsWith("/runs")
                  ? "text-slate-900 font-medium"
                  : "hover:text-slate-900"
              }
            >
              Runs
            </Link>
          </nav>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8">
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/runs" element={<RunsListPage />} />
          <Route path="/runs/:runId" element={<RunDetailPage />} />
        </Routes>
      </main>
    </div>
  );
}
