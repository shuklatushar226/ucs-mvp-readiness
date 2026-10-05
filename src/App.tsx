import { Navigate, Route, Routes } from "react-router-dom";
import { MvpReadinessPage } from "./pages/MvpReadinessPage";
import { MvpMetricsPage } from "./pages/MvpMetricsPage";
import { PrTrackerPage } from "./pages/PrTrackerPage";
import { PrReadinessPage } from "./pages/PrReadinessPage";

/**
 * App shell. Routes:
 *   /mvp         — MvpReadinessPage (connector x MVP capability matrix)
 *   /mvp/metrics — MvpMetricsPage (numeric rollup of the matrix)
 *   /tracker     — PrTrackerPage (in progress, blocked, in review, merged)
 *
 * Everything else redirects to /mvp. Deep links survive a hard refresh via
 * public/_redirects, which rewrites all paths to index.html.
 */
export function App() {
  return (
    <Routes>
      <Route path="/mvp" element={<MvpReadinessPage />} />
      <Route path="/mvp/metrics" element={<MvpMetricsPage />} />
      <Route path="/tracker" element={<PrTrackerPage />} />
      <Route path="/pr-readiness" element={<PrReadinessPage />} />
      <Route path="*" element={<Navigate to="/mvp" replace />} />
    </Routes>
  );
}
