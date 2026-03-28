import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// ─── Mock the auth context ──────────────────────────────────────────────────

const mockUser = {
  id: '1',
  name: 'Test User',
  role: 'admin',
  email: 'test@example.com',
  permissions: [],
  is_super_admin: true,
}

vi.mock('../auth', () => ({
  useAuth: () => ({
    user: mockUser,
    jwt: 'fake-jwt',
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    hasPermission: () => true,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ModuleGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// ─── Mock the Toast context ─────────────────────────────────────────────────

vi.mock('../components/Toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// ─── Mock all API calls ─────────────────────────────────────────────────────

vi.mock('../api', () => ({
  BASE: '/api',
  authHeaders: () => ({ Authorization: 'Bearer fake' }),
  authFetch: vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }),
  jsonPost: vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }),
  jsonPut: vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }),
  jsonDelete: vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }),
  requestLoginLink: vi.fn(),
  verifyToken: vi.fn(),
  fetchSettings: vi.fn().mockResolvedValue({}),
  updateSettings: vi.fn(),
  fetchUsers: vi.fn().mockResolvedValue([]),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  fetchDashboard: vi.fn().mockResolvedValue({
    total_employees: 10,
    active_employees: 8,
    pending_leave_requests: 2,
    open_positions: 3,
    active_review_cycles: 1,
    recent_hires: [],
    upcoming_leave: [],
  }),
  fetchEmployees: vi.fn().mockResolvedValue({ employees: [], total: 0, page: 1, per_page: 50 }),
  fetchEmployee: vi.fn().mockResolvedValue({}),
  createEmployee: vi.fn(),
  updateEmployee: vi.fn(),
  fetchDepartments: vi.fn().mockResolvedValue([]),
  createDepartment: vi.fn(),
  updateDepartment: vi.fn(),
  deleteDepartment: vi.fn(),
  fetchPositions: vi.fn().mockResolvedValue([]),
  createPosition: vi.fn(),
  updatePosition: vi.fn(),
  deletePosition: vi.fn(),
  fetchLeaveTypes: vi.fn().mockResolvedValue([]),
  fetchLeaveRequests: vi.fn().mockResolvedValue([]),
  createLeaveRequest: vi.fn(),
  updateLeaveRequestStatus: vi.fn(),
  fetchLeaveBalances: vi.fn().mockResolvedValue([]),
  fetchTimeEntries: vi.fn().mockResolvedValue([]),
  createTimeEntry: vi.fn(),
  updateTimeEntry: vi.fn(),
  deleteTimeEntry: vi.fn(),
  fetchJobPostings: vi.fn().mockResolvedValue([]),
  fetchJobPosting: vi.fn().mockResolvedValue({}),
  createJobPosting: vi.fn(),
  updateJobPosting: vi.fn(),
  fetchApplicants: vi.fn().mockResolvedValue([]),
  fetchApplicant: vi.fn().mockResolvedValue({}),
  createApplicant: vi.fn(),
  updateApplicant: vi.fn(),
  updateApplicantStage: vi.fn(),
  fetchReviewCycles: vi.fn().mockResolvedValue([]),
  createReviewCycle: vi.fn(),
  fetchReviews: vi.fn().mockResolvedValue([]),
  createReview: vi.fn(),
  updateReview: vi.fn(),
  fetchGoals: vi.fn().mockResolvedValue([]),
  createGoal: vi.fn(),
  updateGoal: vi.fn(),
  deleteGoal: vi.fn(),
  fetchCompensation: vi.fn().mockResolvedValue([]),
  fetchCurrentCompensation: vi.fn().mockResolvedValue({}),
  createCompensation: vi.fn(),
  updateCompensation: vi.fn(),
  fetchBenefitPlans: vi.fn().mockResolvedValue([]),
  createBenefitPlan: vi.fn(),
  updateBenefitPlan: vi.fn(),
  fetchBenefitEnrollments: vi.fn().mockResolvedValue([]),
  createBenefitEnrollment: vi.fn(),
  updateBenefitEnrollment: vi.fn(),
  fetchSuccessionPlans: vi.fn().mockResolvedValue([]),
  createSuccessionPlan: vi.fn(),
  updateSuccessionPlan: vi.fn(),
  fetchSuccessionCandidates: vi.fn().mockResolvedValue([]),
  addSuccessionCandidate: vi.fn(),
  updateSuccessionCandidate: vi.fn(),
  removeSuccessionCandidate: vi.fn(),
  fetchOnboardingTemplates: vi.fn().mockResolvedValue([]),
  createOnboardingTemplate: vi.fn(),
  updateOnboardingTemplate: vi.fn(),
  fetchTemplateTasks: vi.fn().mockResolvedValue([]),
  createTemplateTask: vi.fn(),
  updateTemplateTask: vi.fn(),
  deleteTemplateTask: vi.fn(),
  fetchOnboardingChecklists: vi.fn().mockResolvedValue([]),
  createOnboardingChecklist: vi.fn(),
  updateOnboardingTask: vi.fn(),
  fetchDocuments: vi.fn().mockResolvedValue([]),
  createDocument: vi.fn(),
  updateDocument: vi.fn(),
  deleteDocument: vi.fn(),
  fetchExpiringDocuments: vi.fn().mockResolvedValue([]),
  fetchMyProfile: vi.fn().mockResolvedValue({}),
  updateMyProfile: vi.fn(),
  fetchMyLeave: vi.fn().mockResolvedValue([]),
  submitMyLeave: vi.fn(),
  fetchMyLeaveBalances: vi.fn().mockResolvedValue([]),
  fetchMyTime: vi.fn().mockResolvedValue([]),
  submitMyTime: vi.fn(),
  fetchMyDocuments: vi.fn().mockResolvedValue([]),
  fetchMyOnboarding: vi.fn().mockResolvedValue(null),
  fetchHeadcountReport: vi.fn().mockResolvedValue({}),
  fetchTurnoverReport: vi.fn().mockResolvedValue({}),
  fetchLeaveUtilizationReport: vi.fn().mockResolvedValue({}),
  fetchTimeSummaryReport: vi.fn().mockResolvedValue({}),
  fetchCompensationReport: vi.fn().mockResolvedValue({}),
  fetchRecruitmentReport: vi.fn().mockResolvedValue({}),
  fetchDiversityReport: vi.fn().mockResolvedValue({}),
  fetchAuditLog: vi.fn().mockResolvedValue({ entries: [], total: 0 }),
  fetchWorkflowDefinitions: vi.fn().mockResolvedValue([]),
  createWorkflowDefinition: vi.fn(),
  updateWorkflowDefinition: vi.fn(),
  fetchWorkflowSteps: vi.fn().mockResolvedValue([]),
  createWorkflowStep: vi.fn(),
  updateWorkflowStep: vi.fn(),
  deleteWorkflowStep: vi.fn(),
  fetchWorkflowInstances: vi.fn().mockResolvedValue({ instances: [], total: 0 }),
  fetchMyApprovals: vi.fn().mockResolvedValue([]),
  approveWorkflow: vi.fn(),
  rejectWorkflow: vi.fn(),
  fetchSurveys: vi.fn().mockResolvedValue([]),
  createSurvey: vi.fn(),
  updateSurvey: vi.fn(),
  fetchSurveyQuestions: vi.fn().mockResolvedValue([]),
  createSurveyQuestion: vi.fn(),
  updateSurveyQuestion: vi.fn(),
  deleteSurveyQuestion: vi.fn(),
  submitSurveyResponses: vi.fn(),
  fetchSurveyResults: vi.fn().mockResolvedValue({}),
  fetchPayHeroStatus: vi.fn().mockResolvedValue({}),
  testPayHeroConnection: vi.fn(),
  syncPayHero: vi.fn(),
  importPayHero: vi.fn(),
  fetchAzureADStatus: vi.fn().mockResolvedValue({}),
  disconnectAzureAD: vi.fn(),
  syncAzureAD: vi.fn(),
  importAzureAD: vi.fn(),
  pushToAzureAD: vi.fn(),
  fetchSlackStatus: vi.fn().mockResolvedValue({}),
  testSlackConnection: vi.fn(),
  sendSlackNotification: vi.fn(),
  fetchTeamsStatus: vi.fn().mockResolvedValue({}),
  testTeamsConnection: vi.fn(),
  sendTeamsNotification: vi.fn(),
  fetchXeroStatus: vi.fn().mockResolvedValue({}),
  testXeroConnection: vi.fn(),
  syncXero: vi.fn(),
  pushToXero: vi.fn(),
  fetchDeputyStatus: vi.fn().mockResolvedValue({}),
  testDeputyConnection: vi.fn(),
  syncDeputy: vi.fn(),
  importDeputy: vi.fn(),
  fetchSmartRecruitersStatus: vi.fn().mockResolvedValue({}),
  testSmartRecruitersConnection: vi.fn(),
  syncSmartRecruiters: vi.fn(),
  importSmartRecruiters: vi.fn(),
  pushSmartRecruiters: vi.fn(),
  fetchEmploymentHeroStatus: vi.fn().mockResolvedValue({}),
  testEmploymentHeroConnection: vi.fn(),
  syncEmploymentHero: vi.fn(),
  importEmploymentHero: vi.fn(),
  pushEmploymentHero: vi.fn(),
  fetchGoogleStatus: vi.fn().mockResolvedValue({}),
  testGoogleConnection: vi.fn(),
  syncGoogle: vi.fn(),
  importGoogle: vi.fn(),
  pushGoogle: vi.fn(),
  fetchOktaStatus: vi.fn().mockResolvedValue({}),
  testOktaConnection: vi.fn(),
  syncOkta: vi.fn(),
  importOkta: vi.fn(),
  pushOkta: vi.fn(),
  microsoftSSOLogin: vi.fn(),
}))

// ─── Import pages ───────────────────────────────────────────────────────────

import Dashboard from '../pages/Dashboard'
import Employees from '../pages/Employees'

function renderWithRouter(component: React.ReactElement) {
  return render(<MemoryRouter>{component}</MemoryRouter>)
}

// ─── Smoke Tests ────────────────────────────────────────────────────────────

describe('Page smoke tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Dashboard renders without crashing', async () => {
    renderWithRouter(<Dashboard />)
    await waitFor(() => {
      // After loading, the greeting + dashboard data should appear
      expect(screen.getByText(/good morning|good afternoon|good evening/i)).toBeInTheDocument()
    })
  })

  it('Employees renders without crashing', async () => {
    renderWithRouter(<Employees />)
    await waitFor(() => {
      // Page header should render
      expect(screen.getByText('Employee Directory')).toBeInTheDocument()
    })
  })
})
