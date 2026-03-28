import { BASE, authFetch, jsonPost, jsonPut, jsonDelete } from '../shared/api'
import type { Survey, SurveyQuestion, SurveyResultsResponse } from './types'

export async function fetchSurveys(): Promise<Survey[]> {
  const res = await authFetch(`${BASE}/surveys`)
  if (!res.ok) throw new Error('Failed to fetch surveys')
  return res.json()
}

export async function createSurvey(body: unknown): Promise<Survey> {
  const res = await jsonPost(`${BASE}/surveys`, body)
  if (!res.ok) throw new Error('Failed to create survey')
  return res.json()
}

export async function updateSurvey(id: string, body: unknown): Promise<Survey> {
  const res = await jsonPut(`${BASE}/surveys/${id}`, body)
  if (!res.ok) throw new Error('Failed to update survey')
  return res.json()
}

export async function fetchSurveyQuestions(surveyId: string): Promise<SurveyQuestion[]> {
  const res = await authFetch(`${BASE}/surveys/${surveyId}/questions`)
  if (!res.ok) throw new Error('Failed to fetch questions')
  return res.json()
}

export async function createSurveyQuestion(surveyId: string, body: unknown): Promise<SurveyQuestion> {
  const res = await jsonPost(`${BASE}/surveys/${surveyId}/questions`, body)
  if (!res.ok) throw new Error('Failed to create question')
  return res.json()
}

export async function updateSurveyQuestion(questionId: string, body: unknown): Promise<SurveyQuestion> {
  const res = await jsonPut(`${BASE}/surveys/questions/${questionId}`, body)
  if (!res.ok) throw new Error('Failed to update question')
  return res.json()
}

export async function deleteSurveyQuestion(questionId: string): Promise<void> {
  const res = await jsonDelete(`${BASE}/surveys/questions/${questionId}`)
  if (!res.ok) throw new Error('Failed to delete question')
}

export async function submitSurveyResponses(surveyId: string, body: unknown): Promise<void> {
  const res = await jsonPost(`${BASE}/surveys/${surveyId}/respond`, body)
  if (!res.ok) throw new Error('Failed to submit responses')
}

export async function deleteSurvey(id: string): Promise<void> {
  const res = await jsonDelete(`${BASE}/surveys/${id}`)
  if (!res.ok) throw new Error('Failed to delete survey')
}

export async function fetchSurveyResults(surveyId: string): Promise<SurveyResultsResponse> {
  const res = await authFetch(`${BASE}/surveys/${surveyId}/results`)
  if (!res.ok) throw new Error('Failed to fetch results')
  return res.json()
}
