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

export default function Surveys() {
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [showForm, setShowForm] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detailView, setDetailView] = useState<'questions' | 'results'>('questions')

  useEffect(() => {
    fetchSurveys().then(setSurveys).catch(() => {})
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

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">Surveys</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
        >
          New Survey
        </button>
      </div>

      {showForm && (
        <CreateSurveyForm
          onCreated={() => { setShowForm(false); reload() }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {surveys.length === 0 ? (
        <EmptyState message="No surveys yet" />
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

  const handleSubmit = async () => {
    await createSurvey({ title, description: description || null, anonymous: anonymous ? 1 : 0 })
    onCreated()
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-4">
      <h2 className="text-sm font-semibold text-white mb-3">New Survey</h2>
      <div className="space-y-3">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Survey title"
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500"
        />
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Description (optional)"
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500"
          rows={2}
        />
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
        <button
          onClick={handleSubmit}
          disabled={!title}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          Create
        </button>
        <button onClick={onCancel} className="px-3 py-1.5 bg-gray-700 text-gray-300 text-sm rounded hover:bg-gray-600 transition-colors">
          Cancel
        </button>
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
    await updateSurvey(survey.id, { status })
    onUpdate()
  }

  const handleDeleteQuestion = async (qid: string) => {
    await deleteSurveyQuestion(qid)
    reloadQuestions()
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors text-sm">
          &larr; Back
        </button>
        <h1 className="text-xl font-bold text-white">{survey.title}</h1>
        <StatusBadge status={survey.status} />
      </div>

      {survey.description && (
        <p className="text-gray-400 text-sm mb-4">{survey.description}</p>
      )}

      <div className="flex items-center gap-2 mb-6">
        <div className="flex gap-1">
          <button
            onClick={() => onViewChange('questions')}
            className={`px-4 py-2 text-sm rounded transition-colors ${
              view === 'questions' ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
            }`}
          >
            Questions ({questions.length})
          </button>
          <button
            onClick={() => onViewChange('results')}
            className={`px-4 py-2 text-sm rounded transition-colors ${
              view === 'results' ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
            }`}
          >
            Results
          </button>
        </div>
        <div className="flex-1" />
        {survey.status === 'draft' && (
          <button
            onClick={() => handleStatusChange('active')}
            className="px-3 py-1.5 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-700 transition-colors"
          >
            Activate
          </button>
        )}
        {survey.status === 'active' && (
          <button
            onClick={() => handleStatusChange('closed')}
            className="px-3 py-1.5 bg-gray-700 text-gray-300 text-xs rounded hover:bg-gray-600 transition-colors"
          >
            Close Survey
          </button>
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
            <button
              onClick={() => setShowAddQ(true)}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors mb-4"
            >
              Add Question
            </button>
          )}

          {questions.length === 0 ? (
            <EmptyState message="No questions yet" />
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
                      <p className="text-xs text-gray-500 mt-1 capitalize">{q.question_type.replace(/_/g, ' ')}</p>
                      {q.options && Array.isArray(q.options) && (
                        <p className="text-xs text-gray-500 mt-1">Options: {q.options.join(', ')}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="text-gray-500 hover:text-red-400 text-xs transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {view === 'results' && (
        <>
          {!results ? (
            <div className="text-gray-500 text-sm">Loading results...</div>
          ) : results.total_respondents === 0 ? (
            <EmptyState message="No responses yet" />
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

  const handleSubmit = async () => {
    await createSurveyQuestion(surveyId, {
      question_text: text,
      question_type: type,
      options: type === 'multiple_choice' ? options.split(',').map(o => o.trim()).filter(Boolean) : null,
    })
    onCreated()
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-4">
      <h2 className="text-sm font-semibold text-white mb-3">Add Question</h2>
      <div className="space-y-3">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Question text"
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500"
        />
        <select
          value={type}
          onChange={e => setType(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
        >
          <option value="rating">Rating (1-5)</option>
          <option value="text">Text</option>
          <option value="multiple_choice">Multiple Choice</option>
          <option value="yes_no">Yes / No</option>
        </select>
        {type === 'multiple_choice' && (
          <input
            value={options}
            onChange={e => setOptions(e.target.value)}
            placeholder="Options (comma-separated)"
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500"
          />
        )}
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleSubmit}
          disabled={!text}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          Add
        </button>
        <button onClick={onCancel} className="px-3 py-1.5 bg-gray-700 text-gray-300 text-sm rounded hover:bg-gray-600 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  )
}
