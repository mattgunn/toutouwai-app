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
import DataTable from '../components/DataTable'
import Tabs from '../components/Tabs'
import Modal from '../components/Modal'
import Button from '../components/Button'
import { FormField, Input, Select } from '../components/FormField'
import { SkeletonTable } from '../components/Skeleton'
import ConfirmDialog from '../components/ConfirmDialog'
import { useToast } from '../components/Toast'
import PageHeader from '../components/PageHeader'

export default function Onboarding() {
  const [tab, setTab] = useState('checklists')
  const [templates, setTemplates] = useState<OnboardingTemplate[]>([])
  const [checklists, setChecklists] = useState<OnboardingChecklist[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)

  // Template tasks drill-down
  const [selectedTemplate, setSelectedTemplate] = useState<OnboardingTemplate | null>(null)
  const [templateTasks, setTemplateTasks] = useState<OnboardingTemplateTask[]>([])

  // Forms
  const [showTemplateForm, setShowTemplateForm] = useState(false)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [showChecklistForm, setShowChecklistForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Delete confirmation
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const toast = useToast()

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetchOnboardingTemplates().then(setTemplates).catch(() => {}),
      fetchOnboardingChecklists().then(setChecklists).catch(() => {}),
      fetchEmployees().then(r => setEmployees(r.employees)).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  const loadTemplateTasks = (t: OnboardingTemplate) => {
    setSelectedTemplate(t)
    fetchTemplateTasks(t.id).then(setTemplateTasks).catch(() => {})
  }

  const handleCreateTemplate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const fd = new FormData(e.currentTarget)
      const tpl = await createOnboardingTemplate({
        name: fd.get('name'),
        description: fd.get('description') || null,
        department_id: fd.get('department_id') || null,
      })
      setTemplates(prev => [...prev, tpl])
      setShowTemplateForm(false)
      toast.success('Template created')
    } catch {
      toast.error('Failed to create template')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedTemplate) return
    setSubmitting(true)
    try {
      const fd = new FormData(e.currentTarget)
      const task = await createTemplateTask(selectedTemplate.id, {
        title: fd.get('title'),
        description: fd.get('description') || null,
        assigned_to_role: fd.get('assigned_to_role') || 'hr',
        due_days: parseInt(fd.get('due_days') as string) || 0,
      })
      setTemplateTasks(prev => [...prev, task])
      setShowTaskForm(false)
      toast.success('Task added')
    } catch {
      toast.error('Failed to add task')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteTask = async () => {
    if (!deleteTaskId) return
    setDeleting(true)
    try {
      await deleteTemplateTask(deleteTaskId)
      setTemplateTasks(prev => prev.filter(t => t.id !== deleteTaskId))
      toast.success('Task removed')
    } catch {
      toast.error('Failed to remove task')
    } finally {
      setDeleting(false)
      setDeleteTaskId(null)
    }
  }

  const handleCreateChecklist = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const fd = new FormData(e.currentTarget)
      const cl = await createOnboardingChecklist({
        employee_id: fd.get('employee_id'),
        template_id: fd.get('template_id') || null,
      })
      setChecklists(prev => [cl, ...prev])
      setShowChecklistForm(false)
      toast.success('Onboarding started')
    } catch {
      toast.error('Failed to start onboarding')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed'
      await updateOnboardingTask(taskId, { status: newStatus })
      // Refresh checklists
      fetchOnboardingChecklists().then(setChecklists).catch(() => {})
      toast.success('Task updated')
    } catch {
      toast.error('Failed to update task')
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Onboarding" />
        <SkeletonTable rows={5} cols={3} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Onboarding" />

      {/* Tabs */}
      <div className="mb-4">
        <Tabs
          tabs={[
            { key: 'checklists', label: 'Active Checklists', count: checklists.length },
            { key: 'templates', label: 'Templates', count: templates.length },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      {/* ── Active Checklists ─────────────────────────────────── */}
      {tab === 'checklists' && (
        <div>
          <div className="flex justify-end mb-4">
            <Button onClick={() => setShowChecklistForm(true)}>
              Start Onboarding
            </Button>
          </div>

          <Modal
            open={showChecklistForm}
            onClose={() => setShowChecklistForm(false)}
            title="Start Onboarding for Employee"
            size="lg"
            footer={
              <>
                <Button variant="secondary" onClick={() => setShowChecklistForm(false)} disabled={submitting}>Cancel</Button>
                <Button type="submit" form="checklist-form" loading={submitting}>Create</Button>
              </>
            }
          >
            <form id="checklist-form" onSubmit={handleCreateChecklist} className="space-y-4">
              <FormField label="Employee" required>
                <Select
                  name="employee_id"
                  required
                  placeholder="Select employee..."
                  options={employees.map(emp => ({ value: emp.id, label: `${emp.first_name} ${emp.last_name}` }))}
                />
              </FormField>
              <FormField label="Template">
                <Select
                  name="template_id"
                  placeholder="No template"
                  options={templates.filter(t => t.is_active).map(t => ({ value: t.id, label: t.name }))}
                />
              </FormField>
            </form>
          </Modal>

          {checklists.length === 0 ? (
            <EmptyState
              icon="📋"
              message="No active onboarding checklists"
              action="Start Onboarding"
              onAction={() => setShowChecklistForm(true)}
            />
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
                      <StatusBadge status={cl.status} />
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400">
                        {cl.completed_tasks}/{cl.total_tasks} tasks complete
                      </span>
                      <span className="text-xs text-gray-500">
                        {cl.total_tasks > 0 ? Math.round((cl.completed_tasks / cl.total_tasks) * 100) : 0}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${cl.completed_tasks === cl.total_tasks && cl.total_tasks > 0 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                        style={{ width: cl.total_tasks > 0 ? `${(cl.completed_tasks / cl.total_tasks) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>

                  {(cl.tasks ?? []).length > 0 && (
                    <div className="space-y-1">
                      {(cl.tasks ?? []).map(task => (
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
            <Button onClick={() => setShowTemplateForm(true)}>
              New Template
            </Button>
          </div>

          <Modal
            open={showTemplateForm}
            onClose={() => setShowTemplateForm(false)}
            title="Create Template"
            size="lg"
            footer={
              <>
                <Button variant="secondary" onClick={() => setShowTemplateForm(false)} disabled={submitting}>Cancel</Button>
                <Button type="submit" form="template-form" loading={submitting}>Create</Button>
              </>
            }
          >
            <form id="template-form" onSubmit={handleCreateTemplate} className="space-y-4">
              <FormField label="Name" required>
                <Input name="name" required placeholder="e.g. Engineering Onboarding" />
              </FormField>
              <FormField label="Description">
                <Input name="description" placeholder="Optional description" />
              </FormField>
            </form>
          </Modal>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Template List */}
            <div>
              <DataTable
                columns={[
                  { key: 'name', header: 'Name', render: (t: OnboardingTemplate) => <span className="text-white font-medium">{t.name}</span> },
                  { key: 'department_name', header: 'Department', render: (t: OnboardingTemplate) => <span className="text-gray-400">{t.department_name || '\u2014'}</span> },
                  { key: 'is_active', header: 'Status', render: (t: OnboardingTemplate) => <StatusBadge status={t.is_active ? 'active' : 'inactive'} /> },
                ]}
                data={templates}
                onRowClick={(t) => loadTemplateTasks(t)}
                emptyIcon="📝"
                emptyMessage="No onboarding templates"
                emptyAction="New Template"
                onEmptyAction={() => setShowTemplateForm(true)}
              />
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
                    <Button size="sm" onClick={() => setShowTaskForm(true)}>
                      Add Task
                    </Button>
                  </div>

                  <Modal
                    open={showTaskForm}
                    onClose={() => setShowTaskForm(false)}
                    title="Add Task"
                    size="md"
                    footer={
                      <>
                        <Button variant="secondary" onClick={() => setShowTaskForm(false)} disabled={submitting}>Cancel</Button>
                        <Button type="submit" form="task-form" loading={submitting}>Add</Button>
                      </>
                    }
                  >
                    <form id="task-form" onSubmit={handleCreateTask} className="space-y-4">
                      <FormField label="Title" required>
                        <Input name="title" required placeholder="Task title" />
                      </FormField>
                      <FormField label="Description">
                        <Input name="description" placeholder="Description (optional)" />
                      </FormField>
                      <FormField label="Assigned To">
                        <Select
                          name="assigned_to_role"
                          options={[
                            { value: 'hr', label: 'HR' },
                            { value: 'manager', label: 'Manager' },
                            { value: 'employee', label: 'Employee' },
                            { value: 'it', label: 'IT' },
                          ]}
                        />
                      </FormField>
                      <FormField label="Due Days After Start">
                        <Input name="due_days" type="number" defaultValue={0} />
                      </FormField>
                    </form>
                  </Modal>

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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteTaskId(task.id)}
                          >
                            Remove
                          </Button>
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

          <ConfirmDialog
            open={!!deleteTaskId}
            onClose={() => setDeleteTaskId(null)}
            onConfirm={handleDeleteTask}
            title="Remove Task"
            message="Are you sure you want to remove this task from the template?"
            confirmLabel="Remove"
            loading={deleting}
          />
        </div>
      )}
    </div>
  )
}
