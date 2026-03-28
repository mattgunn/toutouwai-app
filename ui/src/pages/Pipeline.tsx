import { useState, useEffect } from 'react'
import { fetchApplicants } from '../api'
import type { Applicant } from '../types'
import { Skeleton } from '../components/Skeleton'
import { useToast } from '../components/Toast'

const STAGES = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected']

export default function Pipeline() {
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  useEffect(() => {
    fetchApplicants()
      .then(setApplicants)
      .catch(() => toast.error('Failed to load pipeline data'))
      .finally(() => setLoading(false))
  }, [])

  const byStage = STAGES.map(stage => ({
    stage,
    applicants: applicants.filter(a => a.stage === stage),
  }))

  if (loading) {
    return (
      <div>
        <h1 className="text-xl font-bold text-white mb-4">Recruitment Pipeline</h1>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map(stage => (
            <div key={stage} className="min-w-[220px] flex-shrink-0">
              <div className="bg-gray-800 rounded-lg p-3 space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-20 w-full rounded" />
                <Skeleton className="h-20 w-full rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-4">Recruitment Pipeline</h1>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {byStage.map(({ stage, applicants: stageApplicants }) => (
          <div key={stage} className="min-w-[220px] flex-shrink-0">
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white capitalize">{stage.replace(/_/g, ' ')}</h3>
                <span className="text-xs text-gray-500 bg-gray-700 px-1.5 py-0.5 rounded">
                  {stageApplicants.length}
                </span>
              </div>
              <div className="space-y-2">
                {stageApplicants.map(app => (
                  <div key={app.id} className="bg-gray-900 border border-gray-800 rounded p-3">
                    <p className="text-sm text-white font-medium">{app.first_name} {app.last_name}</p>
                    <p className="text-xs text-gray-500 mt-1">{app.job_title || 'No position'}</p>
                    {app.rating && (
                      <p className="text-xs text-amber-400 mt-1">{'*'.repeat(app.rating)}</p>
                    )}
                  </div>
                ))}
                {stageApplicants.length === 0 && (
                  <p className="text-xs text-gray-600 text-center py-4">No applicants</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
