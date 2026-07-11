import { useCallback, useState } from 'react'

const STORAGE_KEY = 'pf-savings-target'
const DEFAULT_TARGET = 5_000_000

function getInitialTarget() {
  if (typeof window === 'undefined') return DEFAULT_TARGET
  const saved = Number(window.localStorage.getItem(STORAGE_KEY))
  return Number.isFinite(saved) && saved > 0 ? saved : DEFAULT_TARGET
}

export function useSavingsTarget() {
  const [target, setTargetState] = useState(getInitialTarget)

  const setTarget = useCallback((amount) => {
    const value = Math.max(0, Math.round(Number(amount) || 0))
    setTargetState(value)
    window.localStorage.setItem(STORAGE_KEY, String(value))
  }, [])

  return { target, setTarget }
}
