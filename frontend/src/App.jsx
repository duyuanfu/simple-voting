import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Admin Views
import AdminLayout from './views/admin/AdminLayout';
import Login from './views/admin/Login';
import Register from './views/admin/Register';
import CampaignList from './views/admin/CampaignList';
import CampaignWizard from './views/admin/CampaignWizard';
import CampaignDashboard from './views/admin/CampaignDashboard';
import CampaignEdit from './views/admin/CampaignEdit';
import VoteAudit from './views/admin/VoteAudit';

// Voter Public View
import VoterPage from './views/voter/VoterPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Voter Entry */}
          <Route path="/v/:code" element={<VoterPage />} />

          {/* Admin Auth */}
          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin/register" element={<Register />} />

          {/* Admin Protected Workspace */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/campaigns" replace />} />
            <Route path="campaigns" element={<CampaignList />} />
            <Route path="campaigns/new" element={<CampaignWizard />} />
            <Route path="campaigns/:id/edit" element={<CampaignEdit />} />
            <Route path="campaigns/:id/dashboard" element={<CampaignDashboard />} />
            <Route path="campaigns/:id/audit" element={<VoteAudit />} />
          </Route>

          {/* Default fallback */}
          <Route path="/" element={<Navigate to="/admin/campaigns" replace />} />
          <Route path="*" element={<Navigate to="/admin/campaigns" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
