import { useState, useEffect } from 'react'

/**
 * Returns a debounced version of `value` that only updates after `delay` ms
 * of inactivity.  Useful for deferring expensive operations (API calls, search)
 * triggered by rapid user input.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
