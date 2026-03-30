export interface TrainingPrerequisite {
  id: string
  course_id: string
  prerequisite_course_id: string
  is_mandatory: number
  course_title: string
  prerequisite_title: string
  created_at: string
  updated_at: string
}
