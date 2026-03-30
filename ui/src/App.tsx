import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute, ModuleGuard } from './auth'
import Layout from './components/Layout'
import PageTransition from './components/PageTransition'
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
import Compensation from './pages/Compensation'
import Benefits from './pages/Benefits'
import Succession from './pages/Succession'
import Onboarding from './pages/Onboarding'
import Documents from './pages/Documents'
import MyProfile from './pages/MyProfile'
import AuditLog from './pages/AuditLog'
import Workflows from './pages/Workflows'
import Surveys from './pages/Surveys'
import Learning from './pages/Learning'
import AbsenceCalendar from './pages/AbsenceCalendar'
import Locations from './pages/Locations'
import Skills from './pages/Skills'
import Assets from './pages/Assets'
import DisciplinaryActions from './pages/DisciplinaryActions'
import Grievances from './pages/Grievances'
import Announcements from './pages/Announcements'
import Probation from './pages/Probation'
import NoticePeriods from './pages/NoticePeriods'
import JobRequisitions from './pages/JobRequisitions'
import CostCenters from './pages/CostCenters'
import Delegations from './pages/Delegations'
import BenefitLifeEvents from './pages/BenefitLifeEvents'
import CustomFields from './pages/CustomFields'
import CompensationComponents from './pages/CompensationComponents'
import LeaveAccrualPolicies from './pages/LeaveAccrualPolicies'
import Notifications from './pages/Notifications'
import EmergencyContacts from './pages/EmergencyContacts'
import Dependents from './pages/Dependents'
import JobHistory from './pages/JobHistory'
import TrainingPrerequisites from './pages/TrainingPrerequisites'
import Help from './pages/Help'

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
            <PageTransition>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<ModuleGuard module="dashboard"><Dashboard /></ModuleGuard>} />
              <Route path="/employees" element={<ModuleGuard module="employees"><Employees /></ModuleGuard>} />
              <Route path="/org-chart" element={<ModuleGuard module="employees"><OrgChart /></ModuleGuard>} />
              <Route path="/departments" element={<ModuleGuard module="departments"><Departments /></ModuleGuard>} />
              <Route path="/positions" element={<ModuleGuard module="positions"><Positions /></ModuleGuard>} />
              <Route path="/onboarding" element={<ModuleGuard module="employees"><Onboarding /></ModuleGuard>} />
              <Route path="/documents" element={<ModuleGuard module="employees"><Documents /></ModuleGuard>} />
              <Route path="/timesheets" element={<ModuleGuard module="timesheets"><Timesheets /></ModuleGuard>} />
              <Route path="/leave-requests" element={<ModuleGuard module="leave"><LeaveRequests /></ModuleGuard>} />
              <Route path="/leave-balances" element={<ModuleGuard module="leave"><LeaveBalances /></ModuleGuard>} />
              <Route path="/absence-calendar" element={<ModuleGuard module="leave"><AbsenceCalendar /></ModuleGuard>} />
              <Route path="/compensation" element={<ModuleGuard module="compensation"><Compensation /></ModuleGuard>} />
              <Route path="/benefits" element={<ModuleGuard module="benefits"><Benefits /></ModuleGuard>} />
              <Route path="/succession" element={<ModuleGuard module="succession"><Succession /></ModuleGuard>} />
              <Route path="/job-postings" element={<ModuleGuard module="recruitment"><JobPostings /></ModuleGuard>} />
              <Route path="/applicants" element={<ModuleGuard module="recruitment"><Applicants /></ModuleGuard>} />
              <Route path="/pipeline" element={<ModuleGuard module="recruitment"><Pipeline /></ModuleGuard>} />
              <Route path="/reviews" element={<ModuleGuard module="performance"><Reviews /></ModuleGuard>} />
              <Route path="/goals" element={<ModuleGuard module="performance"><Goals /></ModuleGuard>} />
              <Route path="/surveys" element={<ModuleGuard module="performance"><Surveys /></ModuleGuard>} />
              <Route path="/learning" element={<ModuleGuard module="performance"><Learning /></ModuleGuard>} />
              <Route path="/reports" element={<ModuleGuard module="reports"><Reports /></ModuleGuard>} />
              <Route path="/audit" element={<ModuleGuard module="settings"><AuditLog /></ModuleGuard>} />
              <Route path="/workflows" element={<ModuleGuard module="settings"><Workflows /></ModuleGuard>} />
              <Route path="/settings" element={<ModuleGuard module="settings"><Settings /></ModuleGuard>} />
              <Route path="/locations" element={<ModuleGuard module="locations"><Locations /></ModuleGuard>} />
              <Route path="/skills" element={<ModuleGuard module="skills"><Skills /></ModuleGuard>} />
              <Route path="/assets" element={<ModuleGuard module="assets"><Assets /></ModuleGuard>} />
              <Route path="/disciplinary" element={<ModuleGuard module="disciplinary"><DisciplinaryActions /></ModuleGuard>} />
              <Route path="/grievances" element={<ModuleGuard module="grievances"><Grievances /></ModuleGuard>} />
              <Route path="/announcements" element={<ModuleGuard module="announcements"><Announcements /></ModuleGuard>} />
              <Route path="/probation" element={<ModuleGuard module="employees"><Probation /></ModuleGuard>} />
              <Route path="/notice-periods" element={<ModuleGuard module="employees"><NoticePeriods /></ModuleGuard>} />
              <Route path="/requisitions" element={<ModuleGuard module="recruitment"><JobRequisitions /></ModuleGuard>} />
              <Route path="/cost-centers" element={<ModuleGuard module="settings"><CostCenters /></ModuleGuard>} />
              <Route path="/delegations" element={<ModuleGuard module="settings"><Delegations /></ModuleGuard>} />
              <Route path="/life-events" element={<ModuleGuard module="benefits"><BenefitLifeEvents /></ModuleGuard>} />
              <Route path="/custom-fields" element={<ModuleGuard module="settings"><CustomFields /></ModuleGuard>} />
              <Route path="/comp-components" element={<ModuleGuard module="compensation"><CompensationComponents /></ModuleGuard>} />
              <Route path="/leave-accrual" element={<ModuleGuard module="leave"><LeaveAccrualPolicies /></ModuleGuard>} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/emergency-contacts" element={<ModuleGuard module="employees"><EmergencyContacts /></ModuleGuard>} />
              <Route path="/dependents" element={<ModuleGuard module="employees"><Dependents /></ModuleGuard>} />
              <Route path="/job-history" element={<ModuleGuard module="employees"><JobHistory /></ModuleGuard>} />
              <Route path="/training-prerequisites" element={<ModuleGuard module="performance"><TrainingPrerequisites /></ModuleGuard>} />
              <Route path="/my-profile" element={<MyProfile />} />
              <Route path="/help" element={<Help />} />
            </Routes>
            </PageTransition>
          </Layout>
        </ProtectedRoute>
      } />
    </Routes>
  )
}
