import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import OnboardingLayout from './pages/onboarding/Layout';
import Act1 from './pages/onboarding/Act1';
import Act1_5 from './pages/onboarding/Act1_5';
import Act2 from './pages/onboarding/Act2';
import Act3 from './pages/onboarding/Act3';
import Act4 from './pages/onboarding/Act4';
import AppShell from './components/AppShell';
import QuantCanvas from './pages/quant/index';
import AppEntry from './components/AppEntry';
import ProviderSimulator from './pages/provider/Simulator';
import Act0 from './pages/auth/Act0';
import RequireAuth from './components/RequireAuth';

export default function App() {
  return (
    <Router>
      <AnimatePresence mode="wait">
        <Routes>
          {/* Root — smart entry, detects user type */}
          <Route path="/" element={<AppEntry />} />

          {/* Act 0 — login / signup terminal (no shell, no guard) */}
          <Route path="/auth" element={<Act0 />} />

          {/* Onboarding — full-screen immersive, requires auth */}
          <Route path="/onboarding" element={<RequireAuth><OnboardingLayout /></RequireAuth>}>
            <Route index element={<Navigate to="act-1" replace />} />
            <Route path="act-1" element={<Act1 />} />
            <Route path="act-1-5" element={<Act1_5 />} />
            <Route path="act-2" element={<Act2 />} />
            <Route path="act-3" element={<Act3 />} />
            <Route path="act-4" element={<Act4 />} />
          </Route>

          {/* Main App — unified shell with TopBar tab switching */}
          <Route path="/app" element={<RequireAuth><AppShell /></RequireAuth>} />

          {/* Quant Canvas */}
          <Route path="/dashboard" element={<RequireAuth><QuantCanvas /></RequireAuth>} />

          {/* Simulator — standalone full-screen tool */}
          <Route path="/provider/simulator/:agentId?" element={<RequireAuth><ProviderSimulator /></RequireAuth>} />

          {/* Legacy redirects */}
          <Route path="/marketplace" element={<Navigate to="/app" replace />} />
          <Route path="/provider"    element={<Navigate to="/app" replace />} />
        </Routes>
      </AnimatePresence>
    </Router>
  );
}
