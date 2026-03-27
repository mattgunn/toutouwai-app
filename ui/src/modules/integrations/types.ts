export interface IntegrationConfigProps {
  settings: Record<string, unknown>
  onSettingsChange: (updates: Record<string, unknown>) => void
}
