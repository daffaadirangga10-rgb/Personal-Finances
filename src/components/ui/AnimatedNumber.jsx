import { useEffect, useRef, useState } from 'react'

/**
 * Animates a numeric value counting up (or down) whenever `value` changes.
 * Respects prefers-reduced-motion by snapping straight to the target.
 */
export default function AnimatedNumber({
  value,
  duration = 900,
  formatter = (n) => Math.round(n).toLocaleString('id-ID'),
}) {
  const [display, setDisplay] = useState(value)
  const fromRef = useRef(value)
  const rafRef = useRef(null)

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    if (prefersReducedMotion) {
      setDisplay(value)
      fromRef.current = value
      return
    }

    const from = fromRef.current
    const to = value
    const start = performance.now()

    cancelAnimationFrame(rafRef.current)

    function tick(now) {
      const elapsed = now - start
      const t = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3) // ease-out cubic
      setDisplay(from + (to - from) * eased)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        fromRef.current = to
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value, duration])

  return <>{formatter(display)}</>
}
