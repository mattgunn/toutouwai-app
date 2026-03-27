import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute, ModuleGuard } from './auth'
import Layout from './components/Layout'
import Login from './pages/Login'
import LinkSent from './pages/LinkSent'
import Verify from './pages/Verify'
import Dashboard from './pages/Dashboard'
import Employees from './pages/Employees'
import OrgChart from './pages/OrgChart'
import Departments from './pages/Departments'
import Positions from './pages/Positions'
import Timesheets from './pages/Timesheets'
import LeaveRequests from './pages/LeaveRequests'
import LeaveBalances from './pages/LeaveBalances'
import JobPostings from './pages/JobPostings'
import Applicants from './pages/Applicants'
import Pipeline from './pages/Pipeline'
import Reviews from './pages/Reviews'
import Goals from './pages/Goals'
import Settings from './pages/Settings'
import Reports from './pages/Reports'

export default function App() {
  return (
    <Routes>
      {/* Public auth routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/link-sent" element={<LinkSent />} />
      <Route path="/verify" element={<Verify />} />

      {/* Protected routes */}
      <Route path="/*" element={
        <ProtectedRoute>
          <Layout>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<ModuleGuard module="dashboard"><Dashboard /></ModuleGuard>} />
              <Route path="/employees" element={<ModuleGuard module="employees"><Employees /></ModuleGuard>} />
              <Route path="/org-chart" element={<ModuleGuard module="employees"><OrgChart /></ModuleGuard>} />
              <Route path="/departments" element={<ModuleGuard module="departments"><Departments /></ModuleGuard>} />
              <Route path="/positions" element={<ModuleGuard module="positions"><Positions /></ModuleGuard>} />
              <Route path="/timesheets" element={<ModuleGuard module="timesheets"><Timesheets /></ModuleGuard>} />
              <Route path="/leave-requests" element={<ModuleGuard module="leave"><LeaveRequests /></ModuleGuard>} />
              <Route path="/leave-balances" element={<ModuleGuard module="leave"><LeaveBalances /></ModuleGuard>} />
              <Route path="/job-postings" element={<ModuleGuard module="recruitment"><JobPostings /></ModuleGuard>} />
              <Route path="/applicants" element={<ModuleGuard module="recruitment"><Applicants /></ModuleGuard>} />
              <Route path="/pipeline" element={<ModuleGuard module="recruitment"><Pipeline /></ModuleGuard>} />
              <Route path="/reviews" element={<ModuleGuard module="performance"><Reviews /></ModuleGuard>} />
              <Route path="/goals" element={<ModuleGuard module="performance"><Goals /></ModuleGuard>} />
              <Route path="/reports" element={<ModuleGuard module="reports"><Reports /></ModuleGuard>} />
              <Route path="/settings" element={<ModuleGuard module="settings"><Settings /></ModuleGuard>} />
            </Routes>
          </Layout>
        </ProtectedRoute>
      } />
    </Routes>
  )
}
