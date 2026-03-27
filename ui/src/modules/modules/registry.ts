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
    description: 'Review cycles, reviews, and goals',
    enabledKey: 'modules_performance_enabled',
    navGroups: ['Performance'],
  },
]
