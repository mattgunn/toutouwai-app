import { useState, useEffect } from 'react'
import { fetchTimeEntries } from '../api'
import type { TimeEntry } from '../types'
import EmptyState from '../components/EmptyState'

export default function Timesheets() {
  const [entries, setEntries] = useState<TimeEntry[]>([])

  useEffect(() => {
    fetchTimeEntries().then(setEntries).catch(() => {})
  }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">Timesheets</h1>
      </div>

      {entries.length === 0 ? (
        <EmptyState message="No time entries yet" />
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 text-xs uppercase">
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Hours</th>
                <th className="px-4 py-3 hidden md:table-cell">Project</th>
                <th className="px-4 py-3 hidden lg:table-cell">Description</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => (
                <tr key={entry.id} className="border-t border-gray-800 hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3 text-white">{entry.employee_name || '\u2014'}</td>
                  <td className="px-4 py-3 text-gray-400">{entry.date}</td>
                  <td className="px-4 py-3 text-white font-medium">{entry.hours}h</td>
                  <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{entry.project || '\u2014'}</td>
                  <td className="px-4 py-3 text-gray-400 hidden lg:table-cell truncate max-w-xs">{entry.description || '\u2014'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
