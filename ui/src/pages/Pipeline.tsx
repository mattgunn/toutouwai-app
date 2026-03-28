import { useState, useEffect } from 'react'
import { fetchApplicants, updateApplicantStage } from '../api'
import type { Applicant } from '../types'
import PageHeader from '../components/PageHeader'
import { Skeleton } from '../components/Skeleton'
import { useToast } from '../components/Toast'

const STAGES = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected']

export default function Pipeline() {
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  const loadApplicants = () => {
    fetchApplicants()
      .then(setApplicants)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadApplicants()
  }, [])

  const handleStageChange = async (applicantId: string, newStage: string) => {
    try {
      await updateApplicantStage(applicantId, newStage)
      toast.success('Stage updated')
      loadApplicants()
    } catch {
      toast.error('Failed to update stage')
    }
  }

  const byStage = STAGES.map(stage => ({
    stage,
    applicants: applicants.filter(a => a.stage === stage),
  }))

  if (loading) {
    return (
      <div>
        <PageHeader title="Recruitment Pipeline" />
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
      <PageHeader title="Recruitment Pipeline" />

      <div className="flex gap-4 overflow-x-auto pb-4">
        {byStage.map(({ stage, applicants: stageApplicants }) => (
          <div key={stage} className="min-w-[220px] flex-shrink-0">
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white capitalize flex items-center gap-2">
                  <span>{stage.replace(/_/g, ' ')}</span>
                  <span className="px-2 py-0.5 rounded-full bg-gray-700 text-xs font-normal text-gray-400">{stageApplicants.length}</span>
                </h3>
              </div>
              <div className="space-y-2">
                {stageApplicants.map(app => (
                  <div key={app.id} className="bg-gray-900 border border-gray-800 rounded p-3 shadow-sm hover:shadow-md transition-all">
                    <p className="text-sm text-white font-medium">{app.first_name} {app.last_name}</p>
                    <p className="text-xs text-gray-500 mt-1">{app.job_title || 'No position'}</p>
                    {app.rating != null && app.rating > 0 && (
                      <p className="text-xs text-amber-400 mt-1">{'★'.repeat(app.rating)}</p>
                    )}
                    <div className="mt-2">
                      <select
                        value=""
                        onChange={e => {
                          if (e.target.value) handleStageChange(app.id, e.target.value)
                        }}
                        className="w-full text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
                      >
                        <option value="">Move to&hellip;</option>
                        {STAGES.filter(s => s !== stage).map(s => (
                          <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                        ))}
                      </select>
                    </div>
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
