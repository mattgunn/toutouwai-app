import { useState, useEffect } from 'react'
import {
  fetchOnboardingTemplates, fetchOnboardingChecklists,
  fetchTemplateTasks, createOnboardingTemplate, createTemplateTask,
  deleteTemplateTask, createOnboardingChecklist, updateOnboardingTask,
} from '../modules/onboarding/api'
import { fetchEmployees } from '../api'
import type { OnboardingTemplate, OnboardingTemplateTask, OnboardingChecklist } from '../modules/onboarding/types'
import type { Employee } from '../types'
import StatusBadge from '../components/StatusBadge'
import EmptyState from '../components/EmptyState'

type Tab = 'checklists' | 'templates'

export default function Onboarding() {
  const [tab, setTab] = useState<Tab>('checklists')
  const [templates, setTemplates] = useState<OnboardingTemplate[]>([])
  const [checklists, setChecklists] = useState<OnboardingChecklist[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])

  // Template tasks drill-down
  const [selectedTemplate, setSelectedTemplate] = useState<OnboardingTemplate | null>(null)
  const [templateTasks, setTemplateTasks] = useState<OnboardingTemplateTask[]>([])

  // Forms
  const [showTemplateForm, setShowTemplateForm] = useState(false)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [showChecklistForm, setShowChecklistForm] = useState(false)

  useEffect(() => {
    fetchOnboardingTemplates().then(setTemplates).catch(() => {})
    fetchOnboardingChecklists().then(setChecklists).catch(() => {})
    fetchEmployees().then(r => setEmployees(r.employees)).catch(() => {})
  }, [])

  const loadTemplateTasks = (t: OnboardingTemplate) => {
    setSelectedTemplate(t)
    fetchTemplateTasks(t.id).then(setTemplateTasks).catch(() => {})
  }

  const handleCreateTemplate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const tpl = await createOnboardingTemplate({
      name: fd.get('name'),
      description: fd.get('description') || null,
      department_id: fd.get('department_id') || null,
    })
    setTemplates(prev => [...prev, tpl])
    setShowTemplateForm(false)
  }

  const handleCreateTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedTemplate) return
    const fd = new FormData(e.currentTarget)
    const task = await createTemplateTask(selectedTemplate.id, {
      title: fd.get('title'),
      description: fd.get('description') || null,
      assigned_to_role: fd.get('assigned_to_role') || 'hr',
      due_days: parseInt(fd.get('due_days') as string) || 0,
    })
    setTemplateTasks(prev => [...prev, task])
    setShowTaskForm(false)
  }

  const handleDeleteTask = async (taskId: string) => {
    await deleteTemplateTask(taskId)
    setTemplateTasks(prev => prev.filter(t => t.id !== taskId))
  }

  const handleCreateChecklist = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const cl = await createOnboardingChecklist({
      employee_id: fd.get('employee_id'),
      template_id: fd.get('template_id') || null,
    })
    setChecklists(prev => [cl, ...prev])
    setShowChecklistForm(false)
  }

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed'
    await updateOnboardingTask(taskId, { status: newStatus })
    // Refresh checklists
    fetchOnboardingChecklists().then(setChecklists).catch(() => {})
  }

  const tabClass = (t: Tab) =>
    `px-4 py-2 text-sm font-medium transition-colors ${
      tab === t
        ? 'text-blue-400 border-b-2 border-blue-400'
        : 'text-gray-400 hover:text-gray-200'
    }`

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">Onboarding</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-800 mb-4">
        <button className={tabClass('checklists')} onClick={() => setTab('checklists')}>Active Checklists</button>
        <button className={tabClass('templates')} onClick={() => setTab('templates')}>Templates</button>
      </div>

      {/* ── Active Checklists ─────────────────────────────────── */}
      {tab === 'checklists' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowChecklistForm(true)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
            >
              Start Onboarding
            </button>
          </div>

          {showChecklistForm && (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-semibold text-white mb-3">Start Onboarding for Employee</h3>
              <form onSubmit={handleCreateChecklist} className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-48">
                  <label className="block text-xs text-gray-500 mb-1">Employee</label>
                  <select name="employee_id" required className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white">
                    <option value="">Select employee...</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-48">
                  <label className="block text-xs text-gray-500 mb-1">Template</label>
                  <select name="template_id" className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white">
                    <option value="">No template</option>
                    {templates.filter(t => t.is_active).map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors">Create</button>
                  <button type="button" onClick={() => setShowChecklistForm(false)} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors">Cancel</button>
                </div>
              </form>
            </div>
          )}

          {checklists.length === 0 ? (
            <EmptyState message="No active onboarding checklists" />
          ) : (
            <div className="space-y-4">
              {checklists.map(cl => (
                <div key={cl.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-white">{cl.employee_name}</h3>
                      <p className="text-xs text-gray-500">
                        {cl.template_name ? `Template: ${cl.template_name}` : 'Custom checklist'}
                        {' \u00B7 '}Started {cl.started_at?.split('T')[0]}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">
                        {cl.completed_tasks}/{cl.total_tasks} tasks
                      </span>
                      <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: cl.total_tasks > 0 ? `${(cl.completed_tasks / cl.total_tasks) * 100}%` : '0%' }}
                        />
                      </div>
                      <StatusBadge status={cl.status} />
                    </div>
                  </div>

                  {cl.tasks.length > 0 && (
                    <div className="space-y-1">
                      {cl.tasks.map(task => (
                        <div
                          key={task.id}
                          className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-800/50 transition-colors"
                        >
                          <button
                            onClick={() => handleToggleTask(task.id, task.status)}
                            className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                              task.status === 'completed'
                                ? 'bg-emerald-600 border-emerald-600'
                                : 'border-gray-600 hover:border-gray-400'
                            }`}
                          >
                            {task.status === 'completed' && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                          <span className={`text-sm flex-1 ${task.status === 'completed' ? 'text-gray-500 line-through' : 'text-white'}`}>
                            {task.title}
                          </span>
                          <span className="text-xs text-gray-500">{task.assigned_to_role}</span>
                          {task.due_date && (
                            <span className="text-xs text-gray-500">Due {task.due_date}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Templates ─────────────────────────────────────────── */}
      {tab === 'templates' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowTemplateForm(true)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
            >
              New Template
            </button>
          </div>

          {showTemplateForm && (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-semibold text-white mb-3">Create Template</h3>
              <form onSubmit={handleCreateTemplate} className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-48">
                  <label className="block text-xs text-gray-500 mb-1">Name</label>
                  <input name="name" required className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500" placeholder="e.g. Engineering Onboarding" />
                </div>
                <div className="flex-1 min-w-48">
                  <label className="block text-xs text-gray-500 mb-1">Description</label>
                  <input name="description" className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500" placeholder="Optional description" />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors">Create</button>
                  <button type="button" onClick={() => setShowTemplateForm(false)} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors">Cancel</button>
                </div>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Template List */}
            <div>
              {templates.length === 0 ? (
                <EmptyState message="No onboarding templates" />
              ) : (
                <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 text-xs uppercase">
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Department</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {templates.map(t => (
                        <tr
                          key={t.id}
                          onClick={() => loadTemplateTasks(t)}
                          className={`border-t border-gray-800 cursor-pointer transition-colors ${
                            selectedTemplate?.id === t.id ? 'bg-gray-800' : 'hover:bg-gray-800/50'
                          }`}
                        >
                          <td className="px-4 py-3 text-white font-medium">{t.name}</td>
                          <td className="px-4 py-3 text-gray-400">{t.department_name || '\u2014'}</td>
                          <td className="px-4 py-3"><StatusBadge status={t.is_active ? 'active' : 'inactive'} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Template Tasks Panel */}
            <div>
              {selectedTemplate ? (
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-white">{selectedTemplate.name} Tasks</h3>
                      <p className="text-xs text-gray-500">{selectedTemplate.description || 'No description'}</p>
                    </div>
                    <button
                      onClick={() => setShowTaskForm(true)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                    >
                      Add Task
                    </button>
                  </div>

                  {showTaskForm && (
                    <form onSubmit={handleCreateTask} className="bg-gray-800 rounded p-3 mb-3 space-y-2">
                      <input name="title" required placeholder="Task title" className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white placeholder-gray-500" />
                      <input name="description" placeholder="Description (optional)" className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white placeholder-gray-500" />
                      <div className="flex gap-2">
                        <select name="assigned_to_role" className="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white">
                          <option value="hr">HR</option>
                          <option value="manager">Manager</option>
                          <option value="employee">Employee</option>
                          <option value="it">IT</option>
                        </select>
                        <input name="due_days" type="number" defaultValue={0} placeholder="Due days" className="w-24 bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white" />
                        <button type="submit" className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors">Add</button>
                        <button type="button" onClick={() => setShowTaskForm(false)} className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded transition-colors">Cancel</button>
                      </div>
                    </form>
                  )}

                  {templateTasks.length === 0 ? (
                    <p className="text-sm text-gray-500 py-4 text-center">No tasks in this template</p>
                  ) : (
                    <div className="space-y-1">
                      {templateTasks.map(task => (
                        <div key={task.id} className="flex items-center justify-between px-3 py-2 rounded hover:bg-gray-800/50 transition-colors">
                          <div>
                            <p className="text-sm text-white">{task.title}</p>
                            <p className="text-xs text-gray-500">
                              {task.assigned_to_role} \u00B7 {task.due_days} day{task.due_days !== 1 ? 's' : ''} after start
                            </p>
                          </div>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-sm">Select a template to view its tasks</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
