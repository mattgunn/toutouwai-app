import { useState, useEffect } from 'react'
import {
  fetchMyProfile, updateMyProfile, fetchMyLeave,
  fetchMyLeaveBalances, fetchMyTime, fetchMyDocuments, fetchMyOnboarding,
} from '../modules/self_service/api'
import type { Employee } from '../types'
import type { LeaveRequest, LeaveBalance } from '../modules/leave/types'
import type { TimeEntry } from '../modules/time/types'
import type { Document } from '../modules/documents/types'
import type { OnboardingChecklist } from '../modules/onboarding/types'
import StatusBadge from '../components/StatusBadge'
import EmptyState from '../components/EmptyState'

type Section = 'profile' | 'leave' | 'time' | 'documents' | 'onboarding'

export default function MyProfile() {
  const [section, setSection] = useState<Section>('profile')
  const [profile, setProfile] = useState<Employee | null>(null)
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([])
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [onboarding, setOnboarding] = useState<OnboardingChecklist[]>([])
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchMyProfile().then(setProfile).catch(e => setError(e.message))
  }, [])

  useEffect(() => {
    if (section === 'leave') {
      fetchMyLeave().then(setLeaveRequests).catch(() => {})
      fetchMyLeaveBalances().then(setLeaveBalances).catch(() => {})
    } else if (section === 'time') {
      fetchMyTime().then(setTimeEntries).catch(() => {})
    } else if (section === 'documents') {
      fetchMyDocuments().then(setDocuments).catch(() => {})
    } else if (section === 'onboarding') {
      fetchMyOnboarding().then(setOnboarding).catch(() => {})
    }
  }, [section])

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const updated = await updateMyProfile({
      phone: fd.get('phone') || null,
      address: fd.get('address') || null,
      emergency_contact: fd.get('emergency_contact') || null,
    })
    setProfile(updated)
    setEditing(false)
  }

  const tabClass = (s: Section) =>
    `px-4 py-2 text-sm font-medium transition-colors ${
      section === s
        ? 'text-blue-400 border-b-2 border-blue-400'
        : 'text-gray-400 hover:text-gray-200'
    }`

  if (error) {
    return (
      <div>
        <h1 className="text-xl font-bold text-white mb-4">My Profile</h1>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 text-center">
          <p className="text-gray-400 text-sm">{error}</p>
          <p className="text-gray-500 text-xs mt-2">Your user account may not be linked to an employee record yet.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">My Profile</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-800 mb-4">
        <button className={tabClass('profile')} onClick={() => setSection('profile')}>Profile</button>
        <button className={tabClass('leave')} onClick={() => setSection('leave')}>Leave</button>
        <button className={tabClass('time')} onClick={() => setSection('time')}>Time</button>
        <button className={tabClass('documents')} onClick={() => setSection('documents')}>Documents</button>
        <button className={tabClass('onboarding')} onClick={() => setSection('onboarding')}>Onboarding</button>
      </div>

      {/* ── Profile ───────────────────────────────────────────── */}
      {section === 'profile' && profile && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white">{profile.first_name} {profile.last_name}</h2>
              <p className="text-sm text-gray-400">{profile.position_title || 'No position'} {profile.department_name ? `\u00B7 ${profile.department_name}` : ''}</p>
            </div>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
              >
                Edit
              </button>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleUpdateProfile} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Phone</label>
                <input name="phone" defaultValue={profile.phone || ''} className="w-full max-w-sm bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Address</label>
                <input name="address" defaultValue={profile.address || ''} className="w-full max-w-sm bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Emergency Contact</label>
                <input name="emergency_contact" defaultValue={profile.emergency_contact || ''} className="w-full max-w-sm bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500" />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors">Save</button>
                <button type="button" onClick={() => setEditing(false)} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors">Cancel</button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm text-white">{profile.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Phone</p>
                <p className="text-sm text-white">{profile.phone || '\u2014'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Manager</p>
                <p className="text-sm text-white">{profile.manager_name || '\u2014'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Start Date</p>
                <p className="text-sm text-white">{profile.start_date || '\u2014'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Address</p>
                <p className="text-sm text-white">{profile.address || '\u2014'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Emergency Contact</p>
                <p className="text-sm text-white">{profile.emergency_contact || '\u2014'}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Leave ─────────────────────────────────────────────── */}
      {section === 'leave' && (
        <div className="space-y-4">
          {/* Balances */}
          {leaveBalances.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {leaveBalances.map(b => (
                <div key={b.leave_type_id} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">{b.leave_type_name}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-white">{b.remaining}</span>
                    <span className="text-xs text-gray-500">of {b.entitled} days remaining</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{b.used} used</p>
                </div>
              ))}
            </div>
          )}

          {/* Recent requests */}
          <h3 className="text-sm font-semibold text-white">Recent Leave Requests</h3>
          {leaveRequests.length === 0 ? (
            <EmptyState message="No leave requests" />
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 text-xs uppercase">
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Start</th>
                    <th className="px-4 py-3">End</th>
                    <th className="px-4 py-3">Days</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveRequests.map(lr => (
                    <tr key={lr.id} className="border-t border-gray-800 hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3 text-white">{lr.leave_type_name || '\u2014'}</td>
                      <td className="px-4 py-3 text-gray-400">{lr.start_date}</td>
                      <td className="px-4 py-3 text-gray-400">{lr.end_date}</td>
                      <td className="px-4 py-3 text-white">{lr.days}</td>
                      <td className="px-4 py-3"><StatusBadge status={lr.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Time ──────────────────────────────────────────────── */}
      {section === 'time' && (
        <div>
          {timeEntries.length === 0 ? (
            <EmptyState message="No time entries" />
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 text-xs uppercase">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Hours</th>
                    <th className="px-4 py-3">Project</th>
                    <th className="px-4 py-3 hidden md:table-cell">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {timeEntries.map(te => (
                    <tr key={te.id} className="border-t border-gray-800 hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3 text-white">{te.date}</td>
                      <td className="px-4 py-3 text-white">{te.hours}</td>
                      <td className="px-4 py-3 text-gray-400">{te.project || '\u2014'}</td>
                      <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{te.description || '\u2014'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Documents ─────────────────────────────────────────── */}
      {section === 'documents' && (
        <div>
          {documents.length === 0 ? (
            <EmptyState message="No documents" />
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 text-xs uppercase">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3 hidden md:table-cell">Expiry</th>
                    <th className="px-4 py-3 hidden md:table-cell">Uploaded</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map(doc => (
                    <tr key={doc.id} className="border-t border-gray-800 hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3 text-white">{doc.name}</td>
                      <td className="px-4 py-3 text-gray-400">{doc.category}</td>
                      <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{doc.expiry_date || '\u2014'}</td>
                      <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{doc.created_at?.split('T')[0]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Onboarding ────────────────────────────────────────── */}
      {section === 'onboarding' && (
        <div>
          {onboarding.length === 0 ? (
            <EmptyState message="No onboarding checklists" />
          ) : (
            <div className="space-y-4">
              {onboarding.map(cl => (
                <div key={cl.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-white">{cl.template_name || 'Onboarding Checklist'}</h3>
                      <p className="text-xs text-gray-500">Started {cl.started_at?.split('T')[0]}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">{cl.completed_tasks}/{cl.total_tasks}</span>
                      <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: cl.total_tasks > 0 ? `${(cl.completed_tasks / cl.total_tasks) * 100}%` : '0%' }}
                        />
                      </div>
                      <StatusBadge status={cl.status} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    {cl.tasks.map(task => (
                      <div key={task.id} className="flex items-center gap-3 px-3 py-2 rounded">
                        <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                          task.status === 'completed' ? 'bg-emerald-600 border-emerald-600' : 'border-gray-600'
                        }`}>
                          {task.status === 'completed' && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className={`text-sm flex-1 ${task.status === 'completed' ? 'text-gray-500 line-through' : 'text-white'}`}>
                          {task.title}
                        </span>
                        {task.due_date && <span className="text-xs text-gray-500">Due {task.due_date}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
