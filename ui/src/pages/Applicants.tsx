import { useState, useEffect } from 'react'
import { fetchApplicants } from '../api'
import type { Applicant } from '../types'
import StatusBadge from '../components/StatusBadge'
import EmptyState from '../components/EmptyState'

export default function Applicants() {
  const [applicants, setApplicants] = useState<Applicant[]>([])

  useEffect(() => {
    fetchApplicants().then(setApplicants).catch(() => {})
  }, [])

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-4">Applicants</h1>

      {applicants.length === 0 ? (
        <EmptyState message="No applicants yet" />
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 text-xs uppercase">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3 hidden md:table-cell">Job</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3 hidden lg:table-cell">Applied</th>
              </tr>
            </thead>
            <tbody>
              {applicants.map(app => (
                <tr key={app.id} className="border-t border-gray-800 hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{app.first_name} {app.last_name}</td>
                  <td className="px-4 py-3 text-gray-400">{app.email}</td>
                  <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{app.job_title || '\u2014'}</td>
                  <td className="px-4 py-3"><StatusBadge status={app.stage} /></td>
                  <td className="px-4 py-3 text-gray-400 hidden lg:table-cell">{app.applied_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
