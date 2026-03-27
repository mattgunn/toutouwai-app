import { BASE, authFetch, jsonPost, jsonPut } from '../shared/api'
import type { Employee, EmployeesResponse } from './types'

export async function fetchEmployees(params?: Record<string, string>): Promise<EmployeesResponse> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  const res = await authFetch(`${BASE}/employees${qs}`)
  if (!res.ok) throw new Error('Failed to fetch employees')
  return res.json()
}

export async function fetchEmployee(id: string): Promise<Employee> {
  const res = await authFetch(`${BASE}/employees/${id}`)
  if (!res.ok) throw new Error('Failed to fetch employee')
  return res.json()
}

export async function createEmployee(body: unknown): Promise<Employee> {
  const res = await jsonPost(`${BASE}/employees`, body)
  if (!res.ok) throw new Error((await res.json()).detail || 'Failed to create employee')
  return res.json()
}

export async function updateEmployee(id: string, body: unknown): Promise<Employee> {
  const res = await jsonPut(`${BASE}/employees/${id}`, body)
  if (!res.ok) throw new Error('Failed to update employee')
  return res.json()
}
