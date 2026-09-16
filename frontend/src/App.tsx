import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import LandingPage from "./pages/LandingPage";
import DashboardPage from "./pages/DashboardPage";
import AnalyzePage from "./pages/AnalyzePage";
import HistoryPage from "./pages/HistoryPage";
import MissionPage from "./pages/MissionPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route element={<AppLayout />}>
          <Route path="/dashboard"        element={<DashboardPage />} />
          <Route path="/missions"         element={<MissionPage />} />
          <Route path="/analyze"          element={<AnalyzePage key="single"      presetMode="single" />} />
          <Route path="/change-detection" element={<AnalyzePage key="before_after" presetMode="before_after" />} />
          <Route path="/optical-sar"      element={<AnalyzePage key="optical_sar"  presetMode="optical_sar" />} />
          <Route path="/history"          element={<HistoryPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
