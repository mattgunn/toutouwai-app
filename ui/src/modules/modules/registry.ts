export interface ModuleDef {
  key: string
  label: string
  description: string
  enabledKey: string
  navGroups: string[]
}

export const MODULES: ModuleDef[] = [
  {
    key: 'core_hr',
    label: 'Core HR',
    description: 'Employee directory, org chart, departments, and positions',
    enabledKey: 'modules_core_hr_enabled',
    navGroups: ['People'],
  },
  {
    key: 'time_leave',
    label: 'Time & Leave',
    description: 'Timesheets, leave requests, and leave balances',
    enabledKey: 'modules_time_leave_enabled',
    navGroups: ['Time & Leave'],
  },
  {
    key: 'recruitment',
    label: 'Recruitment',
    description: 'Job postings, applicants, and hiring pipeline',
    enabledKey: 'modules_recruitment_enabled',
    navGroups: ['Recruitment'],
  },
  {
    key: 'performance',
    label: 'Performance',
    description: 'Review cycles, reviews, goals, and surveys',
    enabledKey: 'modules_performance_enabled',
    navGroups: ['Performance'],
  },
  {
    key: 'compensation',
    label: 'Compensation',
    description: 'Salary management, benefits, and succession planning',
    enabledKey: 'modules_compensation_enabled',
    navGroups: ['Compensation'],
  },
  {
    key: 'onboarding',
    label: 'Onboarding & Documents',
    description: 'New hire checklists, templates, and document management',
    enabledKey: 'modules_onboarding_enabled',
    navGroups: [],
  },
  {
    key: 'admin',
    label: 'Administration',
    description: 'Audit log, workflow engine, and approval chains',
    enabledKey: 'modules_admin_enabled',
    navGroups: ['Admin'],
  },
]
