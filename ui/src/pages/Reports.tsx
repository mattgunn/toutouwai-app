import { useState, useEffect } from 'react'
import {
  fetchHeadcountReport,
  fetchTurnoverReport,
  fetchLeaveUtilizationReport,
  fetchTimeSummaryReport,
  fetchCompensationReport,
  fetchRecruitmentReport,
} from '../modules/reports/api'
import type {
  HeadcountReport,
  TurnoverReport,
  LeaveUtilizationReport,
  TimeSummaryReport,
  CompensationReport,
  RecruitmentReport,
} from '../modules/reports/types'
import StatCard from '../components/StatCard'
import PageHeader from '../components/PageHeader'
import Tabs from '../components/Tabs'
import DataTable from '../components/DataTable'
import Button from '../components/Button'
import { Input } from '../components/FormField'

type Tab = 'headcount' | 'turnover' | 'leave' | 'time' | 'compensation' | 'recruitment'

const TABS: { key: Tab; label: string }[] = [
  { key: 'headcount', label: 'Headcount' },
  { key: 'turnover', label: 'Turnover' },
  { key: 'leave', label: 'Leave' },
  { key: 'time', label: 'Time' },
  { key: 'compensation', label: 'Compensation' },
  { key: 'recruitment', label: 'Recruitment' },
]

function exportTableCSV(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export default function Reports() {
  const [tab, setTab] = useState<Tab>('headcount')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  return (
    <div>
      <PageHeader title="Reports" subtitle="Analytics and insights" />

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Tabs
          variant="pills"
          tabs={TABS}
          active={tab}
          onChange={(k) => setTab(k as Tab)}
        />
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            className="w-auto"
            placeholder="From"
          />
          <span className="text-gray-500 text-sm">to</span>
          <Input
            type="date"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            className="w-auto"
            placeholder="To"
          />
        </div>
      </div>

      {tab === 'headcount' && <HeadcountTab />}
      {tab === 'turnover' && <TurnoverTab />}
      {tab === 'leave' && <LeaveTab />}
      {tab === 'time' && <TimeTab fromDate={fromDate} toDate={toDate} />}
      {tab === 'compensation' && <CompensationTab />}
      {tab === 'recruitment' && <RecruitmentTab />}
    </div>
  )
}

function HeadcountTab() {
  const [data, setData] = useState<HeadcountReport | null>(null)
  useEffect(() => { fetchHeadcountReport().then(setData).catch(() => {}) }, [])
  if (!data) return <div className="text-gray-500 text-sm">Loading...</div>

  const totalActive = data.totals.find(t => t.status === 'active')?.count || 0
  const totalAll = data.totals.reduce((s, t) => s + t.count, 0)

  const deptMap = new Map<string, Record<string, number>>()
  for (const row of data.by_department) {
    const dept = row.department || 'Unassigned'
    if (!deptMap.has(dept)) deptMap.set(dept, {})
    deptMap.get(dept)![row.status] = row.count
  }

  const deptRows = Array.from(deptMap.entries()).map(([dept, counts]) => ({
    department: dept,
    active: counts.active || 0,
    on_leave: counts.on_leave || 0,
    terminated: counts.terminated || 0,
  }))

  const handleExport = () => {
    exportTableCSV(
      `headcount-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Department', 'Active', 'On Leave', 'Terminated'],
      deptRows.map(r => [r.department, r.active, r.on_leave, r.terminated])
    )
  }

  const deptColumns = [
    { key: 'department', header: 'Department', render: (row: typeof deptRows[number]) => <span className="text-white">{row.department}</span> },
    { key: 'active', header: 'Active', render: (row: typeof deptRows[number]) => <span className="text-emerald-400">{row.active}</span> },
    { key: 'on_leave', header: 'On Leave', render: (row: typeof deptRows[number]) => <span className="text-amber-400">{row.on_leave}</span> },
    { key: 'terminated', header: 'Terminated', render: (row: typeof deptRows[number]) => <span className="text-red-400">{row.terminated}</span> },
  ]

  const positionColumns = [
    { key: 'position', header: 'Position', render: (row: typeof data.by_position[number]) => <span className="text-white">{row.position || 'Unassigned'}</span> },
    { key: 'count', header: 'Count', render: (row: typeof data.by_position[number]) => <span className="text-gray-400">{row.count}</span> },
  ]

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button variant="secondary" size="sm" onClick={handleExport}>Export CSV</Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Employees" value={totalAll} />
        <StatCard label="Active" value={totalActive} color="green" />
        <StatCard label="Departments" value={deptMap.size} color="blue" />
        <StatCard label="Positions" value={data.by_position.length} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-sm font-semibold text-white mb-3">By Department</h2>
          <DataTable columns={deptColumns} data={deptRows} keyField="department" emptyMessage="No data" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white mb-3">By Position</h2>
          <DataTable columns={positionColumns} data={data.by_position} keyField="position" emptyMessage="No data" />
        </div>
      </div>
    </>
  )
}

function TurnoverTab() {
  const [data, setData] = useState<TurnoverReport | null>(null)
  useEffect(() => { fetchTurnoverReport().then(setData).catch(() => {}) }, [])
  if (!data) return <div className="text-gray-500 text-sm">Loading...</div>

  const handleExport = () => {
    exportTableCSV(
      `turnover-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Period', 'Terminations'],
      data.by_period.map(r => [r.period, r.terminations])
    )
  }

  const periodColumns = [
    { key: 'period', header: 'Period', render: (row: typeof data.by_period[number]) => <span className="text-white">{row.period || 'Unknown'}</span> },
    { key: 'terminations', header: 'Terminations', render: (row: typeof data.by_period[number]) => <span className="text-red-400">{row.terminations}</span> },
  ]

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button variant="secondary" size="sm" onClick={handleExport}>Export CSV</Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Active Employees" value={data.total_active} color="green" />
        <StatCard label="Terminated" value={data.total_terminated} color="red" />
        <StatCard label="Turnover Rate" value={`${data.turnover_rate}%`} color={data.turnover_rate > 15 ? 'red' : 'default'} />
        <StatCard label="Periods Tracked" value={data.by_period.length} />
      </div>
      <div>
        <h2 className="text-sm font-semibold text-white mb-3">Terminations by Period</h2>
        <DataTable columns={periodColumns} data={data.by_period} keyField="period" emptyMessage="No termination data" />
      </div>
    </>
  )
}

function LeaveTab() {
  const [data, setData] = useState<LeaveUtilizationReport | null>(null)
  useEffect(() => { fetchLeaveUtilizationReport().then(setData).catch(() => {}) }, [])
  if (!data) return <div className="text-gray-500 text-sm">Loading...</div>

  const approvedByType = data.by_type.filter(r => r.status === 'approved')
  const totalDaysUsed = approvedByType.reduce((s, r) => s + r.total_days, 0)
  const deptRows = data.by_department.filter(r => r.days_used > 0)

  const handleExport = () => {
    exportTableCSV(
      `leave-utilization-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Leave Type', 'Requests', 'Days'],
      approvedByType.map(r => [r.leave_type, r.request_count, r.total_days])
    )
  }

  const typeColumns = [
    { key: 'leave_type', header: 'Type', render: (row: typeof approvedByType[number]) => <span className="text-white">{row.leave_type}</span> },
    { key: 'request_count', header: 'Requests', render: (row: typeof approvedByType[number]) => <span className="text-gray-400">{row.request_count}</span> },
    { key: 'total_days', header: 'Days', render: (row: typeof approvedByType[number]) => <span className="text-blue-400">{row.total_days}</span> },
  ]

  const deptColumns = [
    { key: 'department', header: 'Department', render: (row: typeof deptRows[number]) => <span className="text-white">{row.department || 'Unassigned'}</span> },
    { key: 'leave_type', header: 'Leave Type', render: (row: typeof deptRows[number]) => <span className="text-gray-400">{row.leave_type}</span> },
    { key: 'days_used', header: 'Days Used', render: (row: typeof deptRows[number]) => <span className="text-blue-400">{row.days_used}</span> },
  ]

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button variant="secondary" size="sm" onClick={handleExport}>Export CSV</Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Days Used" value={totalDaysUsed} color="blue" />
        <StatCard label="Leave Types" value={new Set(data.by_type.map(r => r.leave_type)).size} />
        <StatCard label="Departments" value={new Set(data.by_department.map(r => r.department)).size} />
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-sm font-semibold text-white mb-3">Usage by Type</h2>
          <DataTable columns={typeColumns} data={approvedByType} keyField="leave_type" emptyMessage="No leave data" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white mb-3">Usage by Department</h2>
          <DataTable columns={deptColumns} data={deptRows} keyField="department" emptyMessage="No data" />
        </div>
      </div>
    </>
  )
}

function TimeTab({ fromDate, toDate }: { fromDate: string; toDate: string }) {
  const [data, setData] = useState<TimeSummaryReport | null>(null)
  useEffect(() => {
    const params: Record<string, string> = {}
    if (fromDate) params.from_date = fromDate
    if (toDate) params.to_date = toDate
    fetchTimeSummaryReport(params).then(setData).catch(() => {})
  }, [fromDate, toDate])
  if (!data) return <div className="text-gray-500 text-sm">Loading...</div>

  const employeeRows = data.by_employee.filter(r => r.total_hours > 0)

  const handleExport = () => {
    exportTableCSV(
      `time-summary-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Employee', 'Hours', 'Entries'],
      employeeRows.map(r => [r.employee_name, r.total_hours, r.entry_count])
    )
  }

  const employeeColumns = [
    { key: 'employee_name', header: 'Employee', render: (row: typeof employeeRows[number]) => <span className="text-white">{row.employee_name}</span> },
    { key: 'total_hours', header: 'Hours', render: (row: typeof employeeRows[number]) => <span className="text-blue-400">{row.total_hours}</span> },
    { key: 'entry_count', header: 'Entries', render: (row: typeof employeeRows[number]) => <span className="text-gray-400">{row.entry_count}</span> },
  ]

  const projectColumns = [
    { key: 'project', header: 'Project', render: (row: typeof data.by_project[number]) => <span className="text-white">{row.project}</span> },
    { key: 'total_hours', header: 'Hours', render: (row: typeof data.by_project[number]) => <span className="text-blue-400">{row.total_hours}</span> },
    { key: 'entry_count', header: 'Entries', render: (row: typeof data.by_project[number]) => <span className="text-gray-400">{row.entry_count}</span> },
  ]

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button variant="secondary" size="sm" onClick={handleExport}>Export CSV</Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Hours" value={data.total_hours} color="blue" />
        <StatCard label="Total Entries" value={data.total_entries} />
        <StatCard label="Projects" value={data.by_project.length} />
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-sm font-semibold text-white mb-3">Hours by Employee</h2>
          <DataTable columns={employeeColumns} data={employeeRows} keyField="employee_name" emptyMessage="No time entries" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white mb-3">Hours by Project</h2>
          <DataTable columns={projectColumns} data={data.by_project} keyField="project" emptyMessage="No project data" />
        </div>
      </div>
    </>
  )
}

function CompensationTab() {
  const [data, setData] = useState<CompensationReport | null>(null)
  useEffect(() => { fetchCompensationReport().then(setData).catch(() => {}) }, [])
  if (!data) return <div className="text-gray-500 text-sm">Loading...</div>

  const totalEmployees = data.by_position.reduce((s, r) => s + r.employee_count, 0)

  const handleExport = () => {
    exportTableCSV(
      `compensation-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Department', 'Level', 'Count'],
      data.by_department.map(r => [r.department || 'Unassigned', r.position_level || '', r.employee_count])
    )
  }

  const deptColumns = [
    { key: 'department', header: 'Department', render: (row: typeof data.by_department[number]) => <span className="text-white">{row.department || 'Unassigned'}</span> },
    { key: 'position_level', header: 'Level', render: (row: typeof data.by_department[number]) => <span className="text-gray-400">{row.position_level || '\u2014'}</span> },
    { key: 'employee_count', header: 'Count', render: (row: typeof data.by_department[number]) => <span className="text-gray-400">{row.employee_count}</span> },
  ]

  const posColumns = [
    { key: 'position', header: 'Position', render: (row: typeof data.by_position[number]) => <span className="text-white">{row.position || 'Unassigned'}</span> },
    { key: 'level', header: 'Level', render: (row: typeof data.by_position[number]) => <span className="text-gray-400">{row.level || '\u2014'}</span> },
    { key: 'employee_count', header: 'Count', render: (row: typeof data.by_position[number]) => <span className="text-gray-400">{row.employee_count}</span> },
  ]

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button variant="secondary" size="sm" onClick={handleExport}>Export CSV</Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Active Employees" value={totalEmployees} color="green" />
        <StatCard label="Positions" value={data.by_position.length} />
        <StatCard label="Departments" value={new Set(data.by_department.map(r => r.department)).size} />
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-sm font-semibold text-white mb-3">By Department &amp; Level</h2>
          <DataTable columns={deptColumns} data={data.by_department} keyField="department" emptyMessage="No data" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white mb-3">By Position</h2>
          <DataTable columns={posColumns} data={data.by_position} keyField="position" emptyMessage="No data" />
        </div>
      </div>
    </>
  )
}

function RecruitmentTab() {
  const [data, setData] = useState<RecruitmentReport | null>(null)
  useEffect(() => { fetchRecruitmentReport().then(setData).catch(() => {}) }, [])
  if (!data) return <div className="text-gray-500 text-sm">Loading...</div>

  const handleExport = () => {
    const headers = ['Status/Stage', 'Type', 'Count']
    const rows: (string | number)[][] = [
      ...data.postings_by_status.map(r => [r.status, 'Posting', r.count]),
      ...data.applicants_by_stage.map(r => [r.stage, 'Applicant', r.count]),
    ]
    exportTableCSV(`recruitment-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows)
  }

  const statusColumns = [
    { key: 'status', header: 'Status', render: (row: typeof data.postings_by_status[number]) => <span className="text-white capitalize">{row.status}</span> },
    { key: 'count', header: 'Count', render: (row: typeof data.postings_by_status[number]) => <span className="text-gray-400">{row.count}</span> },
  ]

  const stageColumns = [
    { key: 'stage', header: 'Stage', render: (row: typeof data.applicants_by_stage[number]) => <span className="text-white capitalize">{row.stage}</span> },
    { key: 'count', header: 'Count', render: (row: typeof data.applicants_by_stage[number]) => <span className="text-gray-400">{row.count}</span> },
  ]

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button variant="secondary" size="sm" onClick={handleExport}>Export CSV</Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Postings" value={data.total_postings} />
        <StatCard label="Total Applicants" value={data.total_applicants} color="blue" />
        <StatCard label="Hired" value={data.total_hired} color="green" />
        <StatCard label="Conversion Rate" value={`${data.conversion_rate}%`} />
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-sm font-semibold text-white mb-3">Postings by Status</h2>
          <DataTable columns={statusColumns} data={data.postings_by_status} keyField="status" emptyMessage="No postings" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white mb-3">Applicants by Stage</h2>
          <DataTable columns={stageColumns} data={data.applicants_by_stage} keyField="stage" emptyMessage="No applicants" />
        </div>
      </div>
    </>
  )
}
