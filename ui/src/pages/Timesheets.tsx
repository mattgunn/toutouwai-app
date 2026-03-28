import { useState, useEffect } from 'react'
import { fetchTimeEntries, fetchEmployees, createTimeEntry } from '../api'
import type { TimeEntry, Employee } from '../types'
import { SkeletonTable } from '../components/Skeleton'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import Button from '../components/Button'
import { FormField, Input, Select, Textarea } from '../components/FormField'
import { useToast } from '../components/Toast'
import { formatDate } from '../utils/format'

const EMPTY_FORM = {
  employee_id: '',
  date: '',
  hours: '',
  project: '',
  description: '',
}

export default function Timesheets() {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const toast = useToast()

  const loadEntries = (from?: string, to?: string) => {
    const params: Record<string, string> = {}
    if (from) params.date_from = from
    if (to) params.date_to = to
    return fetchTimeEntries(params).then(setEntries)
  }

  const loadData = () => {
    setLoading(true)
    Promise.all([
      loadEntries(dateFrom, dateTo),
      fetchEmployees().then(r => setEmployees(r.employees)),
    ])
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    loadEntries(dateFrom, dateTo).catch(() => {})
  }, [dateFrom, dateTo])

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await createTimeEntry({
        employee_id: form.employee_id,
        date: form.date,
        hours: parseFloat(form.hours),
        project: form.project || null,
        description: form.description || null,
      })
      toast.success('Time entry logged')
      setShowModal(false)
      setForm(EMPTY_FORM)
      loadEntries(dateFrom, dateTo).catch(() => {})
    } catch {
      toast.error('Failed to log time entry')
    } finally {
      setSubmitting(false)
    }
  }

  const columns = [
    { key: 'employee_name', header: 'Employee', render: (entry: TimeEntry) => <span className="text-white">{entry.employee_name || '\u2014'}</span> },
    { key: 'date', header: 'Date', render: (entry: TimeEntry) => <span className="text-gray-400">{formatDate(entry.date)}</span> },
    { key: 'hours', header: 'Hours', render: (entry: TimeEntry) => <span className="text-white font-medium">{entry.hours}h</span> },
    { key: 'project', header: 'Project', className: 'hidden md:table-cell', render: (entry: TimeEntry) => <span className="text-gray-400">{entry.project || '\u2014'}</span> },
    { key: 'description', header: 'Description', className: 'hidden lg:table-cell', render: (entry: TimeEntry) => <span className="text-gray-400 truncate max-w-xs block">{entry.description || '\u2014'}</span> },
  ]

  if (loading) {
    return (
      <div>
        <PageHeader title="Timesheets" />
        <SkeletonTable rows={5} cols={5} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Timesheets"
        actions={<Button onClick={openCreate}>Log Time</Button>}
      />

      {/* Date range filter */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400">From</label>
          <Input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400">To</label>
          <Input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="w-40"
          />
        </div>
        {(dateFrom || dateTo) && (
          <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo('') }}>
            Clear
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={entries}
        keyField="id"
        emptyIcon="⏱"
        emptyMessage="No time entries yet"
        striped
      />

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Log Time"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)} disabled={submitting}>Cancel</Button>
            <Button type="submit" form="time-form" loading={submitting}>Log Time</Button>
          </>
        }
      >
        <form id="time-form" onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Employee" required>
            <Select
              value={form.employee_id}
              onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))}
              required
              placeholder="Select employee"
              options={employees.map(emp => ({ value: emp.id, label: `${emp.first_name} ${emp.last_name}` }))}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Date" required>
              <Input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                required
              />
            </FormField>
            <FormField label="Hours" required>
              <Input
                type="number"
                step="0.25"
                min="0.25"
                max="24"
                value={form.hours}
                onChange={e => setForm(f => ({ ...f, hours: e.target.value }))}
                required
                placeholder="8"
              />
            </FormField>
          </div>
          <FormField label="Project">
            <Input
              value={form.project}
              onChange={e => setForm(f => ({ ...f, project: e.target.value }))}
              placeholder="Project name"
            />
          </FormField>
          <FormField label="Description">
            <Textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="What did you work on?"
            />
          </FormField>
        </form>
      </Modal>
    </div>
  )
}
