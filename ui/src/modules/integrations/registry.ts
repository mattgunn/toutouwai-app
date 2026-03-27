import type { ComponentType } from 'react'
import type { IntegrationConfigProps } from './types'
import { PayHeroConfig } from './components/PayHeroConfig'
import { AzureADConfig } from './components/AzureADConfig'

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
]
