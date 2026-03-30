import { BASE, authFetch, jsonPost, jsonPut, jsonDelete } from '../shared/api'
import type { Course, CourseEnrollment, Certification } from './types'

// --- Courses ---

export async function fetchCourses(): Promise<Course[]> {
  const res = await authFetch(`${BASE}/learning/courses`)
  if (!res.ok) throw new Error('Failed to fetch courses')
  return res.json()
}

export async function createCourse(body: unknown): Promise<Course> {
  const res = await jsonPost(`${BASE}/learning/courses`, body)
  if (!res.ok) throw new Error('Failed to create course')
  return res.json()
}

export async function updateCourse(id: string, body: unknown): Promise<Course> {
  const res = await jsonPut(`${BASE}/learning/courses/${id}`, body)
  if (!res.ok) throw new Error('Failed to update course')
  return res.json()
}

export async function deleteCourse(id: string): Promise<void> {
  const res = await jsonDelete(`${BASE}/learning/courses/${id}`)
  if (!res.ok) throw new Error('Failed to delete course')
}

// --- Enrollments ---

export async function fetchEnrollments(params?: { employee_id?: string; course_id?: string; status?: string }): Promise<CourseEnrollment[]> {
  const query = new URLSearchParams()
  if (params?.employee_id) query.set('employee_id', params.employee_id)
  if (params?.course_id) query.set('course_id', params.course_id)
  if (params?.status) query.set('status', params.status)
  const qs = query.toString()
  const res = await authFetch(`${BASE}/learning/enrollments${qs ? '?' + qs : ''}`)
  if (!res.ok) throw new Error('Failed to fetch enrollments')
  return res.json()
}

export async function createEnrollment(body: unknown): Promise<CourseEnrollment> {
  const res = await jsonPost(`${BASE}/learning/enrollments`, body)
  if (!res.ok) throw new Error('Failed to create enrollment')
  return res.json()
}

export async function updateEnrollment(id: string, body: unknown): Promise<CourseEnrollment> {
  const res = await jsonPut(`${BASE}/learning/enrollments/${id}`, body)
  if (!res.ok) throw new Error('Failed to update enrollment')
  return res.json()
}

// --- Certifications ---

export async function fetchCertifications(employeeId?: string): Promise<Certification[]> {
  const qs = employeeId ? `?employee_id=${employeeId}` : ''
  const res = await authFetch(`${BASE}/learning/certifications${qs}`)
  if (!res.ok) throw new Error('Failed to fetch certifications')
  return res.json()
}

export async function createCertification(body: unknown): Promise<Certification> {
  const res = await jsonPost(`${BASE}/learning/certifications`, body)
  if (!res.ok) throw new Error('Failed to create certification')
  return res.json()
}

export async function updateCertification(id: string, body: unknown): Promise<Certification> {
  const res = await jsonPut(`${BASE}/learning/certifications/${id}`, body)
  if (!res.ok) throw new Error('Failed to update certification')
  return res.json()
}

export async function deleteCertification(id: string): Promise<void> {
  const res = await jsonDelete(`${BASE}/learning/certifications/${id}`)
  if (!res.ok) throw new Error('Failed to delete certification')
}
