import type { ComponentType } from 'react'
import type { IntegrationConfigProps } from './types'
import { PayHeroConfig } from './components/PayHeroConfig'
import { AzureADConfig } from './components/AzureADConfig'
import { SlackConfig } from './components/SlackConfig'
import { TeamsConfig } from './components/TeamsConfig'
import { XeroConfig } from './components/XeroConfig'
import { DeputyConfig } from './components/DeputyConfig'
import { SmartRecruitersConfig } from './components/SmartRecruitersConfig'
import { EmploymentHeroConfig } from './components/EmploymentHeroConfig'
import { GoogleConfig } from './components/GoogleConfig'
import { OktaConfig } from './components/OktaConfig'

export type IntegrationCategory = 'payroll' | 'identity' | 'communication' | 'accounting' | 'recruitment' | 'compliance'

export interface IntegrationDef {
  key: string
  label: string
  description: string
  enabledKey: string
  category: IntegrationCategory
  component: ComponentType<IntegrationConfigProps>
}

export const INTEGRATION_CATEGORIES: { key: IntegrationCategory; label: string; icon: string }[] = [
  { key: 'payroll', label: 'Payroll & Time', icon: '💰' },
  { key: 'identity', label: 'Identity & SSO', icon: '🔐' },
  { key: 'communication', label: 'Communication', icon: '💬' },
  { key: 'accounting', label: 'Accounting', icon: '📊' },
  { key: 'recruitment', label: 'Recruitment', icon: '👥' },
  { key: 'compliance', label: 'Compliance & Benefits', icon: '📋' },
]

export const INTEGRATIONS: IntegrationDef[] = [
  {
    key: 'payhero',
    label: 'PayHero',
    description: 'Bidirectional employee sync with PayHero payroll',
    enabledKey: 'payhero_enabled',
    category: 'payroll',
    component: PayHeroConfig,
  },
  {
    key: 'deputy',
    label: 'Deputy',
    description: 'Import shift data and clock-in/out records from Deputy',
    enabledKey: 'deputy_enabled',
    category: 'payroll',
    component: DeputyConfig,
  },
  {
    key: 'azure_ad',
    label: 'Azure AD / Entra ID',
    description: 'Bidirectional user sync, SSO login, and AD provisioning',
    enabledKey: 'azure_ad_enabled',
    category: 'identity',
    component: AzureADConfig,
  },
  {
    key: 'google',
    label: 'Google Workspace',
    description: 'SSO login, auto-provision Google accounts on hire, suspend on termination',
    enabledKey: 'google_enabled',
    category: 'identity',
    component: GoogleConfig,
  },
  {
    key: 'okta',
    label: 'Okta',
    description: 'SCIM user provisioning and SSO via Okta identity platform',
    enabledKey: 'okta_enabled',
    category: 'identity',
    component: OktaConfig,
  },
  {
    key: 'slack',
    label: 'Slack',
    description: 'Send HR notifications to Slack channels — leave approvals, new hires, and more',
    enabledKey: 'slack_enabled',
    category: 'communication',
    component: SlackConfig,
  },
  {
    key: 'teams',
    label: 'Microsoft Teams',
    description: 'Send HR notifications to Microsoft Teams channels via webhooks',
    enabledKey: 'teams_enabled',
    category: 'communication',
    component: TeamsConfig,
  },
  {
    key: 'xero',
    label: 'Xero',
    description: 'Sync payroll journals and employee costs to Xero accounting',
    enabledKey: 'xero_enabled',
    category: 'accounting',
    component: XeroConfig,
  },
  {
    key: 'smartrecruiters',
    label: 'SmartRecruiters',
    description: 'Sync job postings and import applicants from SmartRecruiters ATS',
    enabledKey: 'sr_enabled',
    category: 'recruitment',
    component: SmartRecruitersConfig,
  },
  {
    key: 'employment_hero',
    label: 'Employment Hero',
    description: 'NZ employment agreements, benefits marketplace, and compliance documents',
    enabledKey: 'eh_enabled',
    category: 'compliance',
    component: EmploymentHeroConfig,
  },
]
