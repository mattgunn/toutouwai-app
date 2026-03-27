import { BASE, authFetch, jsonPost, jsonPut, jsonDelete } from '../shared/api'
import type { OnboardingTemplate, OnboardingTemplateTask, OnboardingChecklist, OnboardingTask } from './types'

export async function fetchOnboardingTemplates(): Promise<OnboardingTemplate[]> {
  const res = await authFetch(`${BASE}/onboarding/templates`)
  if (!res.ok) throw new Error('Failed to fetch onboarding templates')
  return res.json()
}

export async function createOnboardingTemplate(body: unknown): Promise<OnboardingTemplate> {
  const res = await jsonPost(`${BASE}/onboarding/templates`, body)
  if (!res.ok) throw new Error((await res.json()).detail || 'Failed to create template')
  return res.json()
}

export async function updateOnboardingTemplate(id: string, body: unknown): Promise<OnboardingTemplate> {
  const res = await jsonPut(`${BASE}/onboarding/templates/${id}`, body)
  if (!res.ok) throw new Error('Failed to update template')
  return res.json()
}

export async function fetchTemplateTasks(templateId: string): Promise<OnboardingTemplateTask[]> {
  const res = await authFetch(`${BASE}/onboarding/templates/${templateId}/tasks`)
  if (!res.ok) throw new Error('Failed to fetch template tasks')
  return res.json()
}

export async function createTemplateTask(templateId: string, body: unknown): Promise<OnboardingTemplateTask> {
  const res = await jsonPost(`${BASE}/onboarding/templates/${templateId}/tasks`, body)
  if (!res.ok) throw new Error((await res.json()).detail || 'Failed to create template task')
  return res.json()
}

export async function updateTemplateTask(taskId: string, body: unknown): Promise<OnboardingTemplateTask> {
  const res = await jsonPut(`${BASE}/onboarding/templates/tasks/${taskId}`, body)
  if (!res.ok) throw new Error('Failed to update template task')
  return res.json()
}

export async function deleteTemplateTask(taskId: string): Promise<void> {
  const res = await jsonDelete(`${BASE}/onboarding/templates/tasks/${taskId}`)
  if (!res.ok) throw new Error('Failed to delete template task')
}

export async function fetchOnboardingChecklists(params?: Record<string, string>): Promise<OnboardingChecklist[]> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  const res = await authFetch(`${BASE}/onboarding/checklists${qs}`)
  if (!res.ok) throw new Error('Failed to fetch onboarding checklists')
  return res.json()
}

export async function createOnboardingChecklist(body: unknown): Promise<OnboardingChecklist> {
  const res = await jsonPost(`${BASE}/onboarding/checklists`, body)
  if (!res.ok) throw new Error((await res.json()).detail || 'Failed to create checklist')
  return res.json()
}

export async function updateOnboardingTask(taskId: string, body: unknown): Promise<OnboardingTask> {
  const res = await jsonPut(`${BASE}/onboarding/tasks/${taskId}`, body)
  if (!res.ok) throw new Error('Failed to update task')
  return res.json()
}
