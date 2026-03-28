import { useState, useEffect, useCallback } from 'react'
import { fetchEmployees } from '../api'
import EmployeeLink from '../components/EmployeeLink'
import type { Employee } from '../types'
import PageHeader from '../components/PageHeader'
import Avatar from '../components/Avatar'

interface OrgNode {
  employee: Employee
  children: OrgNode[]
}

function buildTree(employees: Employee[]): OrgNode[] {
  const map = new Map<string, OrgNode>()
  const roots: OrgNode[] = []

  for (const emp of employees) {
    map.set(emp.id, { employee: emp, children: [] })
  }

  for (const emp of employees) {
    const node = map.get(emp.id)!
    if (emp.manager_id && map.has(emp.manager_id)) {
      map.get(emp.manager_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}

function OrgNodeCard({
  node,
  depth = 0,
  collapsed,
  onToggle,
}: {
  node: OrgNode
  depth?: number
  collapsed: Set<string>
  onToggle: (id: string) => void
}) {
  const hasChildren = node.children.length > 0
  const isCollapsed = collapsed.has(node.employee.id)
  const name = `${node.employee.first_name} ${node.employee.last_name}`

  return (
    <div className={depth > 0 ? 'ml-6 border-l border-gray-800 pl-4' : ''}>
      <div
        className={`flex items-center gap-3 py-2 ${hasChildren ? 'cursor-pointer group' : ''}`}
        onClick={hasChildren ? () => onToggle(node.employee.id) : undefined}
      >
        {hasChildren && (
          <span className="text-gray-500 text-xs w-4 shrink-0 select-none">
            {isCollapsed ? '▶' : '▼'}
          </span>
        )}
        {!hasChildren && <span className="w-4 shrink-0" />}
        <Avatar name={name} imageUrl={node.employee.avatar_url} size="sm" />
        <div>
          <EmployeeLink employeeId={node.employee.id} name={name} className="text-sm font-medium" />
          <p className="text-xs text-gray-500">{node.employee.position_title || node.employee.department_name || 'No position'}</p>
        </div>
        {hasChildren && (
          <span className="text-xs text-gray-600 ml-1">({node.children.length})</span>
        )}
      </div>
      {!isCollapsed && node.children.map(child => (
        <OrgNodeCard
          key={child.employee.id}
          node={child}
          depth={depth + 1}
          collapsed={collapsed}
          onToggle={onToggle}
        />
      ))}
    </div>
  )
}

export default function OrgChart() {
  const [tree, setTree] = useState<OrgNode[]>([])
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchEmployees({ per_page: '500' })
      .then(r => {
        const emps = r.employees || []
        if (emps.length === 0) {
          setTree([])
          return
        }
        const built = buildTree(emps)
        setTree(built)
        const toCollapse = new Set<string>()
        function walk(nodes: OrgNode[], d: number) {
          for (const n of nodes) {
            if (d >= 2 && n.children.length > 0) {
              toCollapse.add(n.employee.id)
            }
            walk(n.children, d + 1)
          }
        }
        walk(built, 0)
        setCollapsed(toCollapse)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleToggle = useCallback((id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  if (loading) {
    return (
      <div>
        <PageHeader title="Organisation Chart" />
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-4">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="flex items-center gap-3 animate-pulse" style={{ paddingLeft: `${(i % 3) * 24}px` }}>
              <div className="w-8 h-8 bg-gray-700 rounded-full shrink-0" />
              <div className="h-4 bg-gray-700 rounded w-40" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Organisation Chart" />
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        {tree.length === 0 ? (
          <p className="text-gray-500 text-sm py-8 text-center">No employees to display. Seed data in Settings → Developer to see the org chart.</p>
        ) : (
          tree.map(root => (
            <OrgNodeCard
              key={root.employee.id}
              node={root}
              collapsed={collapsed}
              onToggle={handleToggle}
            />
          ))
        )}
      </div>
    </div>
  )
}
