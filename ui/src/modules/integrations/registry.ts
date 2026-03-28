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

export interface IntegrationDef {
  key: string
  label: string
  description: string
  enabledKey: string
  component: ComponentType<IntegrationConfigProps>
}

export const INTEGRATIONS: IntegrationDef[] = [
  {
    key: 'payhero',
    label: 'PayHero',
    description: 'Bidirectional employee sync with PayHero payroll',
    enabledKey: 'payhero_enabled',
    component: PayHeroConfig,
  },
  {
    key: 'azure_ad',
    label: 'Azure AD / Entra ID',
    description: 'Bidirectional user sync, SSO login, and AD provisioning',
    enabledKey: 'azure_ad_enabled',
    component: AzureADConfig,
  },
  {
    key: 'slack',
    label: 'Slack',
    description: 'Send HR notifications to Slack channels — leave approvals, new hires, and more',
    enabledKey: 'slack_enabled',
    component: SlackConfig,
  },
  {
    key: 'teams',
    label: 'Microsoft Teams',
    description: 'Send HR notifications to Microsoft Teams channels via webhooks',
    enabledKey: 'teams_enabled',
    component: TeamsConfig,
  },
  {
    key: 'xero',
    label: 'Xero',
    description: 'Sync payroll journals and employee costs to Xero accounting',
    enabledKey: 'xero_enabled',
    component: XeroConfig,
  },
  {
    key: 'deputy',
    label: 'Deputy',
    description: 'Import shift data and clock-in/out records from Deputy',
    enabledKey: 'deputy_enabled',
    component: DeputyConfig,
  },
  {
    key: 'smartrecruiters',
    label: 'SmartRecruiters',
    description: 'Sync job postings and import applicants from SmartRecruiters ATS',
    enabledKey: 'sr_enabled',
    component: SmartRecruitersConfig,
  },
  {
    key: 'employment_hero',
    label: 'Employment Hero',
    description: 'NZ employment agreements, benefits marketplace, and compliance documents via Employment Hero',
    enabledKey: 'eh_enabled',
    component: EmploymentHeroConfig,
  },
  {
    key: 'google',
    label: 'Google Workspace',
    description: 'SSO login, auto-provision Google accounts on hire, suspend on termination',
    enabledKey: 'google_enabled',
    component: GoogleConfig,
  },
  {
    key: 'okta',
    label: 'Okta',
    description: 'SCIM user provisioning and SSO via Okta identity platform',
    enabledKey: 'okta_enabled',
    component: OktaConfig,
  },
]
