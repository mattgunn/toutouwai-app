import { useState, useEffect, useCallback } from 'react'
import { fetchEmployees } from '../api'
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

function getDefaultExpanded(nodes: OrgNode[], depth: number, set: Set<string>) {
  for (const node of nodes) {
    if (depth <= 1) {
      set.add(node.employee.id)
      getDefaultExpanded(node.children, depth + 1, set)
    }
  }
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
          <p className="text-sm text-white font-medium">{name}</p>
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

  useEffect(() => {
    fetchEmployees({ per_page: '1000' })
      .then(r => {
        const built = buildTree(r.employees)
        setTree(built)
        // Default: expand depth 0 and 1
        const expanded = new Set<string>()
        getDefaultExpanded(built, 0, expanded)
        // collapsed = everything NOT in expanded that has children
        // Actually easier: collapsed starts empty (everything expanded),
        // but we only want depth 0-1 expanded. So collect all node ids at depth >= 2 that have children.
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

  return (
    <div>
      <PageHeader title="Organisation Chart" />
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        {tree.length === 0 ? (
          <p className="text-gray-500 text-sm">No employees to display</p>
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
