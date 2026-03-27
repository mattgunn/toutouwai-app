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
import EmptyState from '../components/EmptyState'

type Tab = 'headcount' | 'turnover' | 'leave' | 'time' | 'compensation' | 'recruitment'

const TABS: { key: Tab; label: string }[] = [
  { key: 'headcount', label: 'Headcount' },
  { key: 'turnover', label: 'Turnover' },
  { key: 'leave', label: 'Leave' },
  { key: 'time', label: 'Time' },
  { key: 'compensation', label: 'Compensation' },
  { key: 'recruitment', label: 'Recruitment' },
]

export default function Reports() {
  const [tab, setTab] = useState<Tab>('headcount')

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-4">Reports</h1>

      <div className="flex gap-1 mb-6 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm rounded transition-colors whitespace-nowrap ${
              tab === t.key
                ? 'bg-blue-600/20 text-blue-400'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'headcount' && <HeadcountTab />}
      {tab === 'turnover' && <TurnoverTab />}
      {tab === 'leave' && <LeaveTab />}
      {tab === 'time' && <TimeTab />}
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

  // Aggregate by department
  const deptMap = new Map<string, Record<string, number>>()
  for (const row of data.by_department) {
    const dept = row.department || 'Unassigned'
    if (!deptMap.has(dept)) deptMap.set(dept, {})
    deptMap.get(dept)![row.status] = row.count
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Employees" value={totalAll} />
        <StatCard label="Active" value={totalActive} color="green" />
        <StatCard label="Departments" value={deptMap.size} color="blue" />
        <StatCard label="Positions" value={data.by_position.length} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-white mb-3">By Department</h2>
          {deptMap.size === 0 ? <EmptyState message="No data" /> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 text-xs uppercase">
                  <th className="pb-2">Department</th>
                  <th className="pb-2">Active</th>
                  <th className="pb-2">On Leave</th>
                  <th className="pb-2">Terminated</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(deptMap.entries()).map(([dept, counts]) => (
                  <tr key={dept} className="border-t border-gray-800">
                    <td className="py-2 text-white">{dept}</td>
                    <td className="py-2 text-emerald-400">{counts.active || 0}</td>
                    <td className="py-2 text-amber-400">{counts.on_leave || 0}</td>
                    <td className="py-2 text-red-400">{counts.terminated || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-white mb-3">By Position</h2>
          {data.by_position.length === 0 ? <EmptyState message="No data" /> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 text-xs uppercase">
                  <th className="pb-2">Position</th>
                  <th className="pb-2">Count</th>
                </tr>
              </thead>
              <tbody>
                {data.by_position.map((row, i) => (
                  <tr key={i} className="border-t border-gray-800">
                    <td className="py-2 text-white">{row.position || 'Unassigned'}</td>
                    <td className="py-2 text-gray-400">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}

function TurnoverTab() {
  const [data, setData] = useState<TurnoverReport | null>(null)
  useEffect(() => { fetchTurnoverReport().then(setData).catch(() => {}) }, [])
  if (!data) return <div className="text-gray-500 text-sm">Loading...</div>

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Active Employees" value={data.total_active} color="green" />
        <StatCard label="Terminated" value={data.total_terminated} color="red" />
        <StatCard label="Turnover Rate" value={`${data.turnover_rate}%`} color={data.turnover_rate > 15 ? 'red' : 'default'} />
        <StatCard label="Periods Tracked" value={data.by_period.length} />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <h2 className="text-sm font-semibold text-white mb-3">Terminations by Period</h2>
        {data.by_period.length === 0 ? <EmptyState message="No termination data" /> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 text-xs uppercase">
                <th className="pb-2">Period</th>
                <th className="pb-2">Terminations</th>
              </tr>
            </thead>
            <tbody>
              {data.by_period.map((row, i) => (
                <tr key={i} className="border-t border-gray-800">
                  <td className="py-2 text-white">{row.period || 'Unknown'}</td>
                  <td className="py-2 text-red-400">{row.terminations}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Days Used" value={totalDaysUsed} color="blue" />
        <StatCard label="Leave Types" value={new Set(data.by_type.map(r => r.leave_type)).size} />
        <StatCard label="Departments" value={new Set(data.by_department.map(r => r.department)).size} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-white mb-3">Usage by Type</h2>
          {approvedByType.length === 0 ? <EmptyState message="No leave data" /> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 text-xs uppercase">
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Requests</th>
                  <th className="pb-2">Days</th>
                </tr>
              </thead>
              <tbody>
                {approvedByType.map((row, i) => (
                  <tr key={i} className="border-t border-gray-800">
                    <td className="py-2 text-white">{row.leave_type}</td>
                    <td className="py-2 text-gray-400">{row.request_count}</td>
                    <td className="py-2 text-blue-400">{row.total_days}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-white mb-3">Usage by Department</h2>
          {data.by_department.length === 0 ? <EmptyState message="No data" /> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 text-xs uppercase">
                  <th className="pb-2">Department</th>
                  <th className="pb-2">Leave Type</th>
                  <th className="pb-2">Days Used</th>
                </tr>
              </thead>
              <tbody>
                {data.by_department.filter(r => r.days_used > 0).map((row, i) => (
                  <tr key={i} className="border-t border-gray-800">
                    <td className="py-2 text-white">{row.department || 'Unassigned'}</td>
                    <td className="py-2 text-gray-400">{row.leave_type}</td>
                    <td className="py-2 text-blue-400">{row.days_used}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}

function TimeTab() {
  const [data, setData] = useState<TimeSummaryReport | null>(null)
  useEffect(() => { fetchTimeSummaryReport().then(setData).catch(() => {}) }, [])
  if (!data) return <div className="text-gray-500 text-sm">Loading...</div>

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Hours" value={data.total_hours} color="blue" />
        <StatCard label="Total Entries" value={data.total_entries} />
        <StatCard label="Projects" value={data.by_project.length} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-white mb-3">Hours by Employee</h2>
          {data.by_employee.length === 0 ? <EmptyState message="No time entries" /> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 text-xs uppercase">
                  <th className="pb-2">Employee</th>
                  <th className="pb-2">Hours</th>
                  <th className="pb-2">Entries</th>
                </tr>
              </thead>
              <tbody>
                {data.by_employee.filter(r => r.total_hours > 0).map((row, i) => (
                  <tr key={i} className="border-t border-gray-800">
                    <td className="py-2 text-white">{row.employee_name}</td>
                    <td className="py-2 text-blue-400">{row.total_hours}</td>
                    <td className="py-2 text-gray-400">{row.entry_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-white mb-3">Hours by Project</h2>
          {data.by_project.length === 0 ? <EmptyState message="No project data" /> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 text-xs uppercase">
                  <th className="pb-2">Project</th>
                  <th className="pb-2">Hours</th>
                  <th className="pb-2">Entries</th>
                </tr>
              </thead>
              <tbody>
                {data.by_project.map((row, i) => (
                  <tr key={i} className="border-t border-gray-800">
                    <td className="py-2 text-white">{row.project}</td>
                    <td className="py-2 text-blue-400">{row.total_hours}</td>
                    <td className="py-2 text-gray-400">{row.entry_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Active Employees" value={totalEmployees} color="green" />
        <StatCard label="Positions" value={data.by_position.length} />
        <StatCard label="Departments" value={new Set(data.by_department.map(r => r.department)).size} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-white mb-3">By Department &amp; Level</h2>
          {data.by_department.length === 0 ? <EmptyState message="No data" /> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 text-xs uppercase">
                  <th className="pb-2">Department</th>
                  <th className="pb-2">Level</th>
                  <th className="pb-2">Count</th>
                </tr>
              </thead>
              <tbody>
                {data.by_department.map((row, i) => (
                  <tr key={i} className="border-t border-gray-800">
                    <td className="py-2 text-white">{row.department || 'Unassigned'}</td>
                    <td className="py-2 text-gray-400">{row.position_level || '\u2014'}</td>
                    <td className="py-2 text-gray-400">{row.employee_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-white mb-3">By Position</h2>
          {data.by_position.length === 0 ? <EmptyState message="No data" /> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 text-xs uppercase">
                  <th className="pb-2">Position</th>
                  <th className="pb-2">Level</th>
                  <th className="pb-2">Count</th>
                </tr>
              </thead>
              <tbody>
                {data.by_position.map((row, i) => (
                  <tr key={i} className="border-t border-gray-800">
                    <td className="py-2 text-white">{row.position || 'Unassigned'}</td>
                    <td className="py-2 text-gray-400">{row.level || '\u2014'}</td>
                    <td className="py-2 text-gray-400">{row.employee_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}

function RecruitmentTab() {
  const [data, setData] = useState<RecruitmentReport | null>(null)
  useEffect(() => { fetchRecruitmentReport().then(setData).catch(() => {}) }, [])
  if (!data) return <div className="text-gray-500 text-sm">Loading...</div>

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Postings" value={data.total_postings} />
        <StatCard label="Total Applicants" value={data.total_applicants} color="blue" />
        <StatCard label="Hired" value={data.total_hired} color="green" />
        <StatCard label="Conversion Rate" value={`${data.conversion_rate}%`} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-white mb-3">Postings by Status</h2>
          {data.postings_by_status.length === 0 ? <EmptyState message="No postings" /> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 text-xs uppercase">
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Count</th>
                </tr>
              </thead>
              <tbody>
                {data.postings_by_status.map((row, i) => (
                  <tr key={i} className="border-t border-gray-800">
                    <td className="py-2 text-white capitalize">{row.status}</td>
                    <td className="py-2 text-gray-400">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-white mb-3">Applicants by Stage</h2>
          {data.applicants_by_stage.length === 0 ? <EmptyState message="No applicants" /> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 text-xs uppercase">
                  <th className="pb-2">Stage</th>
                  <th className="pb-2">Count</th>
                </tr>
              </thead>
              <tbody>
                {data.applicants_by_stage.map((row, i) => (
                  <tr key={i} className="border-t border-gray-800">
                    <td className="py-2 text-white capitalize">{row.stage}</td>
                    <td className="py-2 text-gray-400">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
