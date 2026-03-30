import { useState, useEffect, useMemo } from 'react'
import { fetchLeaveRequests, fetchLeaveTypes } from '../api'
import type { LeaveRequest, LeaveType } from '../types'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import { useToast } from '../components/Toast'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  // Monday=0 ... Sunday=6
  let startDow = firstDay.getDay() - 1
  if (startDow < 0) startDow = 6

  const days: (Date | null)[] = []
  // Pad start with nulls
  for (let i = 0; i < startDow; i++) days.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d))
  }
  // Pad end to fill last row
  while (days.length % 7 !== 0) days.push(null)
  return days
}

function dateToStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString('en-NZ', { month: 'long', year: 'numeric' })
}

interface DayAbsence {
  employeeName: string
  leaveTypeName: string
  color: string
}

export default function AbsenceCalendar() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const toast = useToast()

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetchLeaveRequests({ status: 'approved' }),
      fetchLeaveTypes(),
    ])
      .then(([requests, types]) => {
        setLeaveRequests(requests)
        setLeaveTypes(types)
      })
      .catch(() => toast.error('Failed to load leave data'))
      .finally(() => setLoading(false))
  }, [])

  const leaveTypeMap = useMemo(() => {
    const map: Record<string, LeaveType> = {}
    for (const lt of leaveTypes) map[lt.id] = lt
    return map
  }, [leaveTypes])

  // Build a map of date -> absences
  const absenceMap = useMemo(() => {
    const map: Record<string, DayAbsence[]> = {}
    for (const req of leaveRequests) {
      if (req.status !== 'approved') continue
      const start = new Date(req.start_date)
      const end = new Date(req.end_date)
      const lt = leaveTypeMap[req.leave_type_id]
      const color = lt?.color || '#3B82F6'
      const entry: DayAbsence = {
        employeeName: req.employee_name || 'Unknown',
        leaveTypeName: lt?.name || req.leave_type_name || 'Leave',
        color,
      }
      const cursor = new Date(start)
      while (cursor <= end) {
        const key = dateToStr(cursor)
        if (!map[key]) map[key] = []
        map[key].push(entry)
        cursor.setDate(cursor.getDate() + 1)
      }
    }
    return map
  }, [leaveRequests, leaveTypeMap])

  const days = getMonthDays(year, month)
  const todayStr = dateToStr(today)

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }

  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const goToday = () => {
    setYear(today.getFullYear())
    setMonth(today.getMonth())
  }

  const selectedAbsences = selectedDay ? absenceMap[selectedDay] || [] : []

  return (
    <div>
      <PageHeader title="Absence Calendar" />

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-lg font-semibold text-white min-w-[200px] text-center">
            {monthLabel(year, month)}
          </h2>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={goToday}
            className="ml-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          >
            Today
          </button>
        </div>

        {/* Legend */}
        <div className="hidden md:flex items-center gap-3">
          {leaveTypes.filter(lt => lt.is_active).map(lt => (
            <div key={lt.id} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: lt.color }} />
              <span className="text-xs text-gray-400">{lt.name}</span>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-7 gap-px bg-gray-800 rounded-lg overflow-hidden">
          {DAY_LABELS.map(d => (
            <div key={d} className="bg-gray-900 px-2 py-2 text-center text-xs font-medium text-gray-500">{d}</div>
          ))}
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="bg-gray-900 h-24 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-px bg-gray-800 rounded-lg overflow-hidden">
          {/* Day headers */}
          {DAY_LABELS.map(d => (
            <div key={d} className="bg-gray-900 px-2 py-2 text-center text-xs font-medium text-gray-500">{d}</div>
          ))}

          {/* Day cells */}
          {days.map((day, i) => {
            if (!day) {
              return <div key={`empty-${i}`} className="bg-gray-950/50 h-24" />
            }
            const key = dateToStr(day)
            const isToday = key === todayStr
            const absences = absenceMap[key] || []
            const isWeekend = day.getDay() === 0 || day.getDay() === 6

            return (
              <button
                key={key}
                onClick={() => absences.length > 0 && setSelectedDay(key)}
                className={`bg-gray-900 h-24 p-1.5 text-left transition-colors relative ${
                  absences.length > 0 ? 'hover:bg-gray-800 cursor-pointer' : 'cursor-default'
                } ${isWeekend ? 'bg-gray-950/30' : ''}`}
              >
                <span className={`text-xs font-medium ${
                  isToday ? 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center' : 'text-gray-400'
                }`}>
                  {day.getDate()}
                </span>
                {absences.length > 0 && (
                  <div className="mt-1 space-y-0.5 overflow-hidden">
                    {absences.slice(0, 3).map((a, j) => (
                      <div
                        key={j}
                        className="flex items-center gap-1 px-1 py-0.5 rounded text-[10px] truncate"
                        style={{ backgroundColor: `${a.color}20`, color: a.color }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
                        <span className="truncate">{a.employeeName}</span>
                      </div>
                    ))}
                    {absences.length > 3 && (
                      <span className="text-[10px] text-gray-500 pl-1">+{absences.length - 3} more</span>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Day detail modal */}
      <Modal
        open={!!selectedDay}
        onClose={() => setSelectedDay(null)}
        title={selectedDay ? `Absences on ${new Date(selectedDay + 'T00:00:00').toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}` : ''}
        size="sm"
      >
        {selectedAbsences.length === 0 ? (
          <p className="text-sm text-gray-500">No absences on this day</p>
        ) : (
          <div className="space-y-2">
            {selectedAbsences.map((a, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-gray-800/50">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
                <div>
                  <p className="text-sm text-white font-medium">{a.employeeName}</p>
                  <p className="text-xs text-gray-400">{a.leaveTypeName}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}
