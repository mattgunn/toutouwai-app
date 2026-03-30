import { useState, useEffect } from 'react'
import { formatDate } from '../utils/format'
import {
  fetchSkills,
  createSkill,
  updateSkill,
  deleteSkill,
  fetchEmployeeSkills,
  createEmployeeSkill,
  updateEmployeeSkill,
  deleteEmployeeSkill,
} from '../modules/skills/api'
import { fetchEmployees } from '../modules/employees/api'
import type { Skill, EmployeeSkill } from '../modules/skills/types'
import type { Employee } from '../modules/employees/types'
import StatusBadge from '../components/StatusBadge'
import EmployeeLink from '../components/EmployeeLink'
import Button from '../components/Button'
import { FormField, Input, Select, Textarea } from '../components/FormField'
import Tabs from '../components/Tabs'
import Modal from '../components/Modal'
import { SkeletonTable } from '../components/Skeleton'
import ConfirmDialog from '../components/ConfirmDialog'
import { useToast } from '../components/Toast'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'

type TabKey = 'catalog' | 'employee_skills'

export default function Skills() {
  const toast = useToast()
  const [activeTab, setActiveTab] = useState<TabKey>('catalog')
  const [skills, setSkills] = useState<Skill[]>([])
  const [employeeSkills, setEmployeeSkills] = useState<EmployeeSkill[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)

  // Modals
  const [showSkillModal, setShowSkillModal] = useState(false)
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null)
  const [showEmployeeSkillModal, setShowEmployeeSkillModal] = useState(false)
  const [editingEmployeeSkill, setEditingEmployeeSkill] = useState<EmployeeSkill | null>(null)

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: string; name: string } | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [s, es, emp] = await Promise.all([
        fetchSkills(),
        fetchEmployeeSkills(),
        fetchEmployees(),
      ])
      setSkills(s)
      setEmployeeSkills(es)
      setEmployees(emp.employees)
    } catch {
      toast.error('Failed to load skills data')
    } finally {
      setLoading(false)
    }
  }

  const reloadSkills = () => fetchSkills().then(setSkills).catch(() => toast.error('Failed to reload skills'))
  const reloadEmployeeSkills = () => fetchEmployeeSkills().then(setEmployeeSkills).catch(() => toast.error('Failed to reload employee skills'))

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return
    setDeleteLoading(true)
    try {
      if (deleteConfirm.type === 'skill') {
        await deleteSkill(deleteConfirm.id)
        toast.success('Skill deleted')
        reloadSkills()
      } else {
        await deleteEmployeeSkill(deleteConfirm.id)
        toast.success('Employee skill removed')
        reloadEmployeeSkills()
      }
    } catch {
      toast.error(`Failed to delete ${deleteConfirm.type}`)
    } finally {
      setDeleteLoading(false)
      setDeleteConfirm(null)
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Skills" />
        <SkeletonTable rows={5} cols={5} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Skills"
        actions={
          activeTab === 'catalog' ? (
            <Button onClick={() => { setEditingSkill(null); setShowSkillModal(true) }}>Add Skill</Button>
          ) : (
            <Button onClick={() => { setEditingEmployeeSkill(null); setShowEmployeeSkillModal(true) }}>Assign Skill</Button>
          )
        }
      />

      <Tabs
        tabs={[
          { key: 'catalog', label: 'Skill Catalog', count: skills.length },
          { key: 'employee_skills', label: 'Employee Skills', count: employeeSkills.length },
        ]}
        active={activeTab}
        onChange={(k) => setActiveTab(k as TabKey)}
      />

      <div className="mt-4">
        {activeTab === 'catalog' && (
          <DataTable
            columns={[
              { key: 'name', header: 'Name', render: (row) => <span className="text-white font-medium">{String(row.name)}</span> },
              { key: 'category', header: 'Category', render: (row) => <span className="text-gray-400 capitalize">{String(row.category || '-')}</span>, className: 'hidden md:table-cell' },
              { key: 'description', header: 'Description', render: (row) => <span className="text-gray-400">{row.description ? String(row.description).substring(0, 60) + (String(row.description).length > 60 ? '...' : '') : '-'}</span>, className: 'hidden lg:table-cell' },
              { key: 'employee_count', header: 'Employees', render: (row) => <span className="text-gray-400">{String(row.employee_count ?? 0)}</span> },
            ]}
            data={skills as unknown as Record<string, unknown>[]}
            keyField="id"
            onRowClick={(row) => {
              const skill = skills.find(s => s.id === row.id)
              if (skill) { setEditingSkill(skill); setShowSkillModal(true) }
            }}
            emptyIcon="🎯"
            emptyMessage="No skills yet"
            emptyAction="Add Skill"
            onEmptyAction={() => { setEditingSkill(null); setShowSkillModal(true) }}
          />
        )}

        {activeTab === 'employee_skills' && (
          <DataTable
            columns={[
              { key: 'employee_name', header: 'Employee', render: (row) => <EmployeeLink employeeId={String(row.employee_id)} name={String(row.employee_name)} /> },
              { key: 'skill_name', header: 'Skill', render: (row) => <span className="text-white">{String(row.skill_name)}</span> },
              { key: 'proficiency_level', header: 'Proficiency', render: (row) => <StatusBadge status={String(row.proficiency_level)} /> },
              { key: 'years_experience', header: 'Experience', render: (row) => <span className="text-gray-400">{row.years_experience != null ? `${String(row.years_experience)} yrs` : '-'}</span>, className: 'hidden md:table-cell' },
            ]}
            data={employeeSkills as unknown as Record<string, unknown>[]}
            keyField="id"
            onRowClick={(row) => {
              const es = employeeSkills.find(e => e.id === row.id)
              if (es) { setEditingEmployeeSkill(es); setShowEmployeeSkillModal(true) }
            }}
            emptyIcon="🎯"
            emptyMessage="No employee skills assigned"
            emptyAction="Assign Skill"
            onEmptyAction={() => { setEditingEmployeeSkill(null); setShowEmployeeSkillModal(true) }}
          />
        )}
      </div>

      {/* Skill Modal */}
      <SkillModal
        open={showSkillModal}
        skill={editingSkill}
        onClose={() => { setShowSkillModal(false); setEditingSkill(null) }}
        onSaved={() => { setShowSkillModal(false); setEditingSkill(null); reloadSkills() }}
        onDelete={(s) => { setShowSkillModal(false); setEditingSkill(null); setDeleteConfirm({ type: 'skill', id: s.id, name: s.name }) }}
      />

      {/* Employee Skill Modal */}
      <EmployeeSkillModal
        open={showEmployeeSkillModal}
        employeeSkill={editingEmployeeSkill}
        employees={employees}
        skills={skills}
        onClose={() => { setShowEmployeeSkillModal(false); setEditingEmployeeSkill(null) }}
        onSaved={() => { setShowEmployeeSkillModal(false); setEditingEmployeeSkill(null); reloadEmployeeSkills(); reloadSkills() }}
        onDelete={(es) => { setShowEmployeeSkillModal(false); setEditingEmployeeSkill(null); setDeleteConfirm({ type: 'employee skill', id: es.id, name: `${es.employee_name} - ${es.skill_name}` }) }}
      />

      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteConfirm}
        title={`Delete ${deleteConfirm?.type === 'skill' ? 'Skill' : 'Employee Skill'}`}
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteLoading}
      />
    </div>
  )
}


// --- Skill Modal ---

function SkillModal({
  open,
  skill,
  onClose,
  onSaved,
  onDelete,
}: {
  open: boolean
  skill: Skill | null
  onClose: () => void
  onSaved: () => void
  onDelete: (s: Skill) => void
}) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setName(skill?.name ?? '')
      setCategory(skill?.category ?? '')
      setDescription(skill?.description ?? '')
    }
  }, [open, skill])

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const body = {
        name,
        category: category || null,
        description: description || null,
      }
      if (skill) {
        await updateSkill(skill.id, body)
        toast.success('Skill updated')
      } else {
        await createSkill(body)
        toast.success('Skill created')
      }
      onSaved()
    } catch {
      toast.error(`Failed to ${skill ? 'update' : 'create'} skill`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={skill ? 'Edit Skill' : 'Add Skill'} size="md" footer={
      <>
        {skill && (
          <Button variant="danger" onClick={() => onDelete(skill)} className="mr-auto">Delete</Button>
        )}
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!name} loading={submitting}>
          {skill ? 'Save' : 'Create'}
        </Button>
      </>
    }>
      <div className="space-y-3">
        <FormField label="Skill Name" required>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. JavaScript" />
        </FormField>
        <FormField label="Category">
          <Select value={category} onChange={e => setCategory(e.target.value)} options={[
            { value: '', label: 'Select category...' },
            { value: 'technical', label: 'Technical' },
            { value: 'soft_skills', label: 'Soft Skills' },
            { value: 'leadership', label: 'Leadership' },
            { value: 'management', label: 'Management' },
            { value: 'communication', label: 'Communication' },
            { value: 'domain', label: 'Domain Knowledge' },
          ]} />
        </FormField>
        <FormField label="Description">
          <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Skill description" rows={3} />
        </FormField>
      </div>
    </Modal>
  )
}


// --- Employee Skill Modal ---

function EmployeeSkillModal({
  open,
  employeeSkill,
  employees,
  skills,
  onClose,
  onSaved,
  onDelete,
}: {
  open: boolean
  employeeSkill: EmployeeSkill | null
  employees: Employee[]
  skills: Skill[]
  onClose: () => void
  onSaved: () => void
  onDelete: (es: EmployeeSkill) => void
}) {
  const toast = useToast()
  const [employeeId, setEmployeeId] = useState('')
  const [skillId, setSkillId] = useState('')
  const [proficiencyLevel, setProficiencyLevel] = useState('beginner')
  const [yearsExperience, setYearsExperience] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setEmployeeId(employeeSkill?.employee_id ?? '')
      setSkillId(employeeSkill?.skill_id ?? '')
      setProficiencyLevel(employeeSkill?.proficiency_level ?? 'beginner')
      setYearsExperience(employeeSkill?.years_experience != null ? String(employeeSkill.years_experience) : '')
    }
  }, [open, employeeSkill])

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const body = {
        employee_id: employeeId,
        skill_id: skillId,
        proficiency_level: proficiencyLevel,
        years_experience: yearsExperience ? parseFloat(yearsExperience) : null,
      }
      if (employeeSkill) {
        await updateEmployeeSkill(employeeSkill.id, body)
        toast.success('Employee skill updated')
      } else {
        await createEmployeeSkill(body)
        toast.success('Skill assigned')
      }
      onSaved()
    } catch {
      toast.error(`Failed to ${employeeSkill ? 'update' : 'assign'} skill`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={employeeSkill ? 'Edit Employee Skill' : 'Assign Skill'} size="md" footer={
      <>
        {employeeSkill && (
          <Button variant="danger" onClick={() => onDelete(employeeSkill)} className="mr-auto">Delete</Button>
        )}
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!employeeId || !skillId} loading={submitting}>
          {employeeSkill ? 'Save' : 'Assign'}
        </Button>
      </>
    }>
      <div className="space-y-3">
        <FormField label="Employee" required>
          <Select
            value={employeeId}
            onChange={e => setEmployeeId(e.target.value)}
            options={[
              { value: '', label: 'Select employee...' },
              ...employees.map(e => ({ value: e.id, label: `${e.first_name} ${e.last_name}` })),
            ]}
            disabled={!!employeeSkill}
          />
        </FormField>
        <FormField label="Skill" required>
          <Select
            value={skillId}
            onChange={e => setSkillId(e.target.value)}
            options={[
              { value: '', label: 'Select skill...' },
              ...skills.map(s => ({ value: s.id, label: s.name })),
            ]}
            disabled={!!employeeSkill}
          />
        </FormField>
        <FormField label="Proficiency Level">
          <Select value={proficiencyLevel} onChange={e => setProficiencyLevel(e.target.value)} options={[
            { value: 'beginner', label: 'Beginner' },
            { value: 'intermediate', label: 'Intermediate' },
            { value: 'advanced', label: 'Advanced' },
            { value: 'expert', label: 'Expert' },
          ]} />
        </FormField>
        <FormField label="Years of Experience">
          <Input type="number" value={yearsExperience} onChange={e => setYearsExperience(e.target.value)} placeholder="e.g. 3" min="0" step="0.5" />
        </FormField>
      </div>
    </Modal>
  )
}
