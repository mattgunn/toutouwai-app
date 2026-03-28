import { useState, useEffect } from 'react'
import { fetchEmployees } from '../api'
import type { Employee } from '../types'

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

function OrgNodeCard({ node, depth = 0 }: { node: OrgNode; depth?: number }) {
  return (
    <div className={depth > 0 ? 'ml-6 border-l border-gray-800 pl-4' : ''}>
      <div className="flex items-center gap-3 py-2">
        <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-xs text-gray-300 font-medium shrink-0">
          {node.employee.first_name?.[0]}{node.employee.last_name?.[0]}
        </div>
        <div>
          <p className="text-sm text-white font-medium">{node.employee.first_name} {node.employee.last_name}</p>
          <p className="text-xs text-gray-500">{node.employee.position_title || node.employee.department_name || 'No position'}</p>
        </div>
      </div>
      {node.children.map(child => (
        <OrgNodeCard key={child.employee.id} node={child} depth={depth + 1} />
      ))}
    </div>
  )
}

export default function OrgChart() {
  const [tree, setTree] = useState<OrgNode[]>([])

  useEffect(() => {
    fetchEmployees({ per_page: '1000' })
      .then(r => setTree(buildTree(r.employees)))
      .catch(() => {})
  }, [])

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-4">Org Chart</h1>
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        {tree.length === 0 ? (
          <p className="text-gray-500 text-sm">No employees to display</p>
        ) : (
          tree.map(root => <OrgNodeCard key={root.employee.id} node={root} />)
        )}
      </div>
    </div>
  )
}
