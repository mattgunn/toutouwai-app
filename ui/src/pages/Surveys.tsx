import { useState, useEffect } from 'react'
import {
  fetchSurveys,
  createSurvey,
  updateSurvey,
  fetchSurveyQuestions,
  createSurveyQuestion,
  deleteSurveyQuestion,
  fetchSurveyResults,
} from '../modules/surveys/api'
import type { Survey, SurveyQuestion, SurveyResultsResponse } from '../modules/surveys/types'
import StatusBadge from '../components/StatusBadge'
import EmptyState from '../components/EmptyState'
import Button from '../components/Button'
import { FormField, Input, Select, Textarea } from '../components/FormField'
import Tabs from '../components/Tabs'
import { SkeletonTable } from '../components/Skeleton'
import ConfirmDialog from '../components/ConfirmDialog'
import { useToast } from '../components/Toast'

export default function Surveys() {
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [showForm, setShowForm] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detailView, setDetailView] = useState<'questions' | 'results'>('questions')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchSurveys().then(setSurveys).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const reload = () => {
    fetchSurveys().then(setSurveys).catch(() => {})
  }

  const selected = surveys.find(s => s.id === selectedId)

  if (selectedId && selected) {
    return (
      <SurveyDetail
        survey={selected}
        view={detailView}
        onViewChange={setDetailView}
        onBack={() => { setSelectedId(null); reload() }}
        onUpdate={reload}
      />
    )
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-xl font-bold text-white mb-4">Surveys</h1>
        <SkeletonTable rows={5} cols={4} />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">Surveys</h1>
        <Button onClick={() => setShowForm(true)}>
          New Survey
        </Button>
      </div>

      {showForm && (
        <CreateSurveyForm
          onCreated={() => { setShowForm(false); reload() }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {surveys.length === 0 ? (
        <EmptyState
          icon="📊"
          message="No surveys yet"
          action="New Survey"
          onAction={() => setShowForm(true)}
        />
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 text-xs uppercase">
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3 hidden md:table-cell">Questions</th>
                <th className="px-4 py-3 hidden md:table-cell">Responses</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 hidden lg:table-cell">Created</th>
              </tr>
            </thead>
            <tbody>
              {surveys.map(survey => (
                <tr
                  key={survey.id}
                  className="border-t border-gray-800 hover:bg-gray-800/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedId(survey.id)}
                >
                  <td className="px-4 py-3 text-white font-medium">{survey.title}</td>
                  <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{survey.question_count}</td>
                  <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{survey.response_count}</td>
                  <td className="px-4 py-3"><StatusBadge status={survey.status} /></td>
                  <td className="px-4 py-3 text-gray-500 text-xs hidden lg:table-cell">
                    {new Date(survey.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function CreateSurveyForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [anonymous, setAnonymous] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const toast = useToast()

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await createSurvey({ title, description: description || null, anonymous: anonymous ? 1 : 0 })
      toast.success('Survey created')
      onCreated()
    } catch {
      toast.error('Failed to create survey')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-4">
      <h2 className="text-sm font-semibold text-white mb-3">New Survey</h2>
      <div className="space-y-3">
        <FormField label="Title" required>
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Survey title"
          />
        </FormField>
        <FormField label="Description">
          <Textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
          />
        </FormField>
        <label className="flex items-center gap-2 text-sm text-gray-400">
          <input
            type="checkbox"
            checked={anonymous}
            onChange={e => setAnonymous(e.target.checked)}
            className="rounded"
          />
          Anonymous responses
        </label>
      </div>
      <div className="flex gap-2 mt-3">
        <Button onClick={handleSubmit} disabled={!title} loading={submitting}>
          Create
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

function SurveyDetail({
  survey,
  view,
  onViewChange,
  onBack,
  onUpdate,
}: {
  survey: Survey
  view: 'questions' | 'results'
  onViewChange: (v: 'questions' | 'results') => void
  onBack: () => void
  onUpdate: () => void
}) {
  const [questions, setQuestions] = useState<SurveyQuestion[]>([])
  const [results, setResults] = useState<SurveyResultsResponse | null>(null)
  const [showAddQ, setShowAddQ] = useState(false)
  const [deleteQId, setDeleteQId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)
  const toast = useToast()

  useEffect(() => {
    fetchSurveyQuestions(survey.id).then(setQuestions).catch(() => {})
  }, [survey.id])

  useEffect(() => {
    if (view === 'results') {
      fetchSurveyResults(survey.id).then(setResults).catch(() => {})
    }
  }, [survey.id, view])

  const reloadQuestions = () => {
    fetchSurveyQuestions(survey.id).then(setQuestions).catch(() => {})
  }

  const handleStatusChange = async (status: string) => {
    setStatusLoading(true)
    try {
      await updateSurvey(survey.id, { status })
      toast.success(`Survey ${status === 'active' ? 'activated' : 'closed'}`)
      onUpdate()
    } catch {
      toast.error('Failed to update survey status')
    } finally {
      setStatusLoading(false)
    }
  }

  const handleDeleteQuestion = async () => {
    if (!deleteQId) return
    setDeleting(true)
    try {
      await deleteSurveyQuestion(deleteQId)
      reloadQuestions()
      toast.success('Question deleted')
    } catch {
      toast.error('Failed to delete question')
    } finally {
      setDeleting(false)
      setDeleteQId(null)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          &larr; Back
        </Button>
        <h1 className="text-xl font-bold text-white">{survey.title}</h1>
        <StatusBadge status={survey.status} />
      </div>

      {survey.description && (
        <p className="text-gray-400 text-sm mb-4">{survey.description}</p>
      )}

      <div className="flex items-center gap-2 mb-6">
        <Tabs
          variant="pills"
          tabs={[
            { key: 'questions', label: 'Questions', count: questions.length },
            { key: 'results', label: 'Results' },
          ]}
          active={view}
          onChange={(k) => onViewChange(k as 'questions' | 'results')}
        />
        <div className="flex-1" />
        {survey.status === 'draft' && (
          <Button
            size="sm"
            onClick={() => handleStatusChange('active')}
            loading={statusLoading}
          >
            Activate
          </Button>
        )}
        {survey.status === 'active' && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleStatusChange('closed')}
            loading={statusLoading}
          >
            Close Survey
          </Button>
        )}
      </div>

      {view === 'questions' && (
        <>
          {showAddQ ? (
            <AddQuestionForm
              surveyId={survey.id}
              onCreated={() => { setShowAddQ(false); reloadQuestions() }}
              onCancel={() => setShowAddQ(false)}
            />
          ) : (
            <Button onClick={() => setShowAddQ(true)} className="mb-4">
              Add Question
            </Button>
          )}

          {questions.length === 0 ? (
            <EmptyState icon="❓" message="No questions yet" />
          ) : (
            <div className="space-y-3">
              {questions.map((q, i) => (
                <div key={q.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white text-sm">
                        <span className="text-gray-500 mr-2">{i + 1}.</span>
                        {q.question_text}
                        {q.required ? <span className="text-red-400 ml-1">*</span> : null}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 capitalize">{(q.question_type || '').replace(/_/g, ' ')}</p>
                      {q.options && Array.isArray(q.options) && (
                        <p className="text-xs text-gray-500 mt-1">Options: {q.options.join(', ')}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteQId(q.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <ConfirmDialog
            open={!!deleteQId}
            onClose={() => setDeleteQId(null)}
            onConfirm={handleDeleteQuestion}
            title="Delete Question"
            message="Are you sure you want to delete this question?"
            confirmLabel="Delete"
            loading={deleting}
          />
        </>
      )}

      {view === 'results' && (
        <>
          {!results ? (
            <SkeletonTable rows={3} cols={2} />
          ) : results.total_respondents === 0 ? (
            <EmptyState icon="📬" message="No responses yet" />
          ) : (
            <>
              <p className="text-sm text-gray-400 mb-4">{results.total_respondents} respondent(s)</p>
              <div className="space-y-3">
                {results.results.map((r, i) => (
                  <div key={i} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                    <p className="text-white text-sm mb-2">{r.question.question_text}</p>
                    <p className="text-xs text-gray-500 mb-2">{r.response_count} response(s)</p>

                    {r.average !== undefined && (
                      <div className="flex items-center gap-2">
                        <span className="text-blue-400 text-lg font-semibold">{r.average}</span>
                        <span className="text-xs text-gray-500">/ 5 avg rating</span>
                      </div>
                    )}

                    {r.yes_count !== undefined && (
                      <div className="flex gap-4 text-sm">
                        <span className="text-emerald-400">Yes: {r.yes_count}</span>
                        <span className="text-red-400">No: {r.no_count}</span>
                      </div>
                    )}

                    {r.distribution && r.question.question_type !== 'rating' && (
                      <div className="space-y-1">
                        {Object.entries(r.distribution).map(([key, count]) => (
                          <div key={key} className="flex items-center gap-2 text-sm">
                            <span className="text-gray-400">{key}:</span>
                            <span className="text-white">{count}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {r.distribution && r.question.question_type === 'rating' && (
                      <div className="flex gap-3 mt-1">
                        {['1', '2', '3', '4', '5'].map(n => (
                          <div key={n} className="text-center">
                            <div className="text-xs text-gray-500">{n}</div>
                            <div className="text-sm text-gray-400">{r.distribution![n] || 0}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {r.text_responses && r.text_responses.length > 0 && (
                      <div className="space-y-1 mt-1">
                        {r.text_responses.map((t, ti) => (
                          <p key={ti} className="text-gray-400 text-sm border-l-2 border-gray-700 pl-2">{t}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

function AddQuestionForm({
  surveyId,
  onCreated,
  onCancel,
}: {
  surveyId: string
  onCreated: () => void
  onCancel: () => void
}) {
  const [text, setText] = useState('')
  const [type, setType] = useState('rating')
  const [options, setOptions] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const toast = useToast()

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await createSurveyQuestion(surveyId, {
        question_text: text,
        question_type: type,
        options: type === 'multiple_choice' ? options.split(',').map(o => o.trim()).filter(Boolean) : null,
      })
      toast.success('Question added')
      onCreated()
    } catch {
      toast.error('Failed to add question')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-4">
      <h2 className="text-sm font-semibold text-white mb-3">Add Question</h2>
      <div className="space-y-3">
        <FormField label="Question Text" required>
          <Input
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Question text"
          />
        </FormField>
        <FormField label="Type">
          <Select
            value={type}
            onChange={e => setType(e.target.value)}
            options={[
              { value: 'rating', label: 'Rating (1-5)' },
              { value: 'text', label: 'Text' },
              { value: 'multiple_choice', label: 'Multiple Choice' },
              { value: 'yes_no', label: 'Yes / No' },
            ]}
          />
        </FormField>
        {type === 'multiple_choice' && (
          <FormField label="Options" hint="Comma-separated values">
            <Input
              value={options}
              onChange={e => setOptions(e.target.value)}
              placeholder="Options (comma-separated)"
            />
          </FormField>
        )}
      </div>
      <div className="flex gap-2 mt-3">
        <Button onClick={handleSubmit} disabled={!text} loading={submitting}>
          Add
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
