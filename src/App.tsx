import { Navigate, Route, Routes } from "react-router-dom";
import { MvpReadinessPage } from "./pages/MvpReadinessPage";
import { MvpMetricsPage } from "./pages/MvpMetricsPage";
import { PrTrackerPage } from "./pages/PrTrackerPage";
import { ConnectorReadinessPage } from "./pages/ConnectorReadinessPage";

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
      <Route path="/connector-readiness" element={<ConnectorReadinessPage />} />
      {/* old path kept so existing links and bookmarks do not 404 */}
      <Route path="/pr-readiness" element={<Navigate to="/connector-readiness" replace />} />
      <Route path="*" element={<Navigate to="/mvp" replace />} />
    </Routes>
  );
}
