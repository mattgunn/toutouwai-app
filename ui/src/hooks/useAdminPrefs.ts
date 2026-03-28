import { useState, useCallback, useEffect } from 'react'
import { updateSettings } from '../modules/settings/api'

const KEYS = {
  faviconColor:  'hris_favicon_color',
  navColor:      'hris_nav_color',
  instanceLabel: 'hris_instance_label',
  theme:         'hris_theme',
  navLayout:     'hris_nav_layout',
  mode:          'hris_mode',
} as const

const SYNC_EVENT = 'hris-prefs-sync'

function get(key: string, fallback = ''): string {
  return localStorage.getItem(key) || fallback
}

function set(key: string, value: string) {
  if (value) localStorage.setItem(key, value)
  else localStorage.removeItem(key)
  window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { key, value } }))
}

export function useAdminPrefs() {
  const [faviconColor, setFaviconColorState] = useState(() => get(KEYS.faviconColor))
  const [navColor, setNavColorState] = useState(() => get(KEYS.navColor))
  const [instanceLabel, setInstanceLabelState] = useState(() => get(KEYS.instanceLabel))
  const [theme, setThemeState] = useState<'dark' | 'light' | 'katana' | 'workday'>(() => (get(KEYS.theme, 'dark') as 'dark' | 'light' | 'katana' | 'workday'))
  const [navLayout, setNavLayoutState] = useState<'sidebar' | 'topbar'>(() => (get(KEYS.navLayout, 'sidebar') as 'sidebar' | 'topbar'))
  const [mode, setModeState] = useState<'live' | 'dev'>(() => (get(KEYS.mode, 'live') as 'live' | 'dev'))

  useEffect(() => {
    const t = get(KEYS.theme, 'dark')
    const nc = get(KEYS.navColor)
    const fc = get(KEYS.faviconColor)
    const il = get(KEYS.instanceLabel)
    const m = get(KEYS.mode, 'live')
    updateSettings({ theme: t, nav_color: nc, favicon_color: fc, instance_label: il, mode: m }).catch(() => {})
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      const { key, value } = (e as CustomEvent).detail
      if (key === KEYS.faviconColor) setFaviconColorState(value)
      if (key === KEYS.navColor) setNavColorState(value)
      if (key === KEYS.instanceLabel) setInstanceLabelState(value)
      if (key === KEYS.theme) setThemeState((value || 'dark') as 'dark' | 'light' | 'katana' | 'workday')
      if (key === KEYS.navLayout) setNavLayoutState((value || 'sidebar') as 'sidebar' | 'topbar')
      if (key === KEYS.mode) setModeState((value || 'live') as 'live' | 'dev')
    }
    window.addEventListener(SYNC_EVENT, handler)
    return () => window.removeEventListener(SYNC_EVENT, handler)
  }, [])

  const setFaviconColor = useCallback((v: string) => {
    set(KEYS.faviconColor, v)
    setFaviconColorState(v)
    updateSettings({ favicon_color: v }).catch(() => {})
  }, [])

  const setNavColor = useCallback((v: string) => {
    set(KEYS.navColor, v)
    setNavColorState(v)
    updateSettings({ nav_color: v }).catch(() => {})
  }, [])

  const setInstanceLabel = useCallback((v: string) => {
    set(KEYS.instanceLabel, v)
    setInstanceLabelState(v)
    updateSettings({ instance_label: v }).catch(() => {})
  }, [])

  const setTheme = useCallback((v: 'dark' | 'light' | 'katana' | 'workday') => {
    set(KEYS.theme, v)
    setThemeState(v)
    updateSettings({ theme: v }).catch(() => {})
  }, [])

  const setNavLayout = useCallback((v: 'sidebar' | 'topbar') => {
    set(KEYS.navLayout, v)
    setNavLayoutState(v)
  }, [])

  const setMode = useCallback((v: 'live' | 'dev') => {
    set(KEYS.mode, v)
    setModeState(v)
    updateSettings({ mode: v }).catch(() => {})
  }, [])

  // Dynamic favicon via canvas
  useEffect(() => {
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!faviconColor) {
      if (link) link.remove()
      return
    }
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = faviconColor
    ctx.beginPath()
    ctx.roundRect(0, 0, 32, 32, 6)
    ctx.fill()
    link.href = canvas.toDataURL('image/png')
  }, [faviconColor])

  // Apply theme class to html element
  useEffect(() => {
    const isLight = theme === 'light' || theme === 'katana' || theme === 'workday'
    document.documentElement.classList.toggle('light', isLight)
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.classList.toggle('katana', theme === 'katana')
    document.documentElement.classList.toggle('workday', theme === 'workday')
  }, [theme])

  return {
    faviconColor, setFaviconColor,
    navColor, setNavColor,
    instanceLabel, setInstanceLabel,
    theme, setTheme,
    navLayout, setNavLayout,
    mode, setMode,
  }
}
