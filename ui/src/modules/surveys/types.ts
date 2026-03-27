export interface Survey {
  id: string
  title: string
  description: string | null
  status: string
  anonymous: number
  start_date: string | null
  end_date: string | null
  created_by: string | null
  created_by_name: string | null
  response_count: number
  question_count: number
  created_at: string
  updated_at: string
}

export interface SurveyQuestion {
  id: string
  survey_id: string
  question_text: string
  question_type: string
  options: string[] | null
  sort_order: number
  required: number
  created_at: string
  updated_at: string
}

export interface SurveyResult {
  question: SurveyQuestion
  response_count: number
  average?: number
  distribution?: Record<string, number>
  yes_count?: number
  no_count?: number
  text_responses?: string[]
}

export interface SurveyResultsResponse {
  results: SurveyResult[]
  total_respondents: number
}
