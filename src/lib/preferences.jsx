import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'pf-preferences'

export const CURRENCIES = {
  IDR: { label: 'Rupiah Indonesia', symbol: 'Rp', locale: 'id-ID' },
  USD: { label: 'Dolar AS', symbol: '$', locale: 'en-US' },
  EUR: { label: 'Euro', symbol: '€', locale: 'de-DE' },
  SGD: { label: 'Dolar Singapura', symbol: 'S$', locale: 'en-SG' },
  MYR: { label: 'Ringgit Malaysia', symbol: 'RM', locale: 'ms-MY' },
  JPY: { label: 'Yen Jepang', symbol: '¥', locale: 'ja-JP' },
}

export const DATE_FORMATS = {
  'dd/mm/yyyy': { label: '31/12/2026' },
  'mm/dd/yyyy': { label: '12/31/2026' },
  'yyyy-mm-dd': { label: '2026-12-31' },
  long: { label: '31 Desember 2026' },
}

const DEFAULTS = { currency: 'IDR', dateFormat: 'dd/mm/yyyy' }

function loadInitial() {
  if (typeof window === 'undefined') return DEFAULTS
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY))
    return {
      currency: CURRENCIES[saved?.currency] ? saved.currency : DEFAULTS.currency,
      dateFormat: DATE_FORMATS[saved?.dateFormat] ? saved.dateFormat : DEFAULTS.dateFormat,
    }
  } catch {
    return DEFAULTS
  }
}

const PreferencesContext = createContext(null)

export function PreferencesProvider({ children }) {
  const [prefs, setPrefs] = useState(loadInitial)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  }, [prefs])

  const setCurrency = useCallback((currency) => {
    setPrefs((p) => ({ ...p, currency }))
  }, [])

  const setDateFormat = useCallback((dateFormat) => {
    setPrefs((p) => ({ ...p, dateFormat }))
  }, [])

  const formatCurrency = useCallback(
    (n) => {
      const meta = CURRENCIES[prefs.currency] ?? CURRENCIES.IDR
      return new Intl.NumberFormat(meta.locale, {
        style: 'currency',
        currency: prefs.currency,
        maximumFractionDigits: 0,
      }).format(n ?? 0)
    },
    [prefs.currency]
  )

  // Versi ringkas untuk label sumbu grafik / ruang sempit (mis. "Rp2,5jt",
  // "$2.5M", "¥2.5M" tergantung mata uang & locale yang dipilih). Pakai
  // notation 'compact' bawaan Intl supaya singkatannya otomatis mengikuti
  // locale, tidak di-hardcode ke "jt"/"rb" ala Rupiah seperti sebelumnya.
  const formatCompactCurrency = useCallback(
    (n) => {
      const meta = CURRENCIES[prefs.currency] ?? CURRENCIES.IDR
      return new Intl.NumberFormat(meta.locale, {
        style: 'currency',
        currency: prefs.currency,
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(n ?? 0)
    },
    [prefs.currency]
  )

  const formatDate = useCallback(
    (value) => {
      if (!value) return '-'
      const d = value instanceof Date ? value : new Date(value)
      if (Number.isNaN(d.getTime())) return '-'

      const dd = String(d.getDate()).padStart(2, '0')
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const yyyy = d.getFullYear()

      switch (prefs.dateFormat) {
        case 'mm/dd/yyyy':
          return `${mm}/${dd}/${yyyy}`
        case 'yyyy-mm-dd':
          return `${yyyy}-${mm}-${dd}`
        case 'long':
          return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
        case 'dd/mm/yyyy':
        default:
          return `${dd}/${mm}/${yyyy}`
      }
    },
    [prefs.dateFormat]
  )

  const value = useMemo(
    () => ({
      currency: prefs.currency,
      dateFormat: prefs.dateFormat,
      setCurrency,
      setDateFormat,
      formatCurrency,
      formatCompactCurrency,
      formatDate,
    }),
    [prefs.currency, prefs.dateFormat, setCurrency, setDateFormat, formatCurrency, formatCompactCurrency, formatDate]
  )

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext)
  if (!ctx) {
    throw new Error('usePreferences harus dipakai di dalam <PreferencesProvider>')
  }
  return ctx
}
