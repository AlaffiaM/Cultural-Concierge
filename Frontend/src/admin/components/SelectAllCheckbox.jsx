import { useRef, useEffect } from 'react'

export default function SelectAllCheckbox({ checked, indeterminate, onChange, style }) {
  const ref = useRef(null)

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate
  }, [indeterminate])

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      style={{ accentColor: 'var(--admin-copper)', width: 14, height: 14, cursor: 'pointer', ...style }}
    />
  )
}
