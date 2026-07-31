import { useState, useCallback } from 'react'

export function useConfirm() {
  const [state, setState] = useState({ open: false, message: '', resolve: null, type: 'confirm' })

  const showConfirm = useCallback((message) => {
    return new Promise((resolve) => {
      setState({ open: true, message, resolve, type: 'confirm' })
    })
  }, [])

  const showAlert = useCallback((message) => {
    return new Promise((resolve) => {
      setState({ open: true, message, resolve, type: 'alert' })
    })
  }, [])

  const handleConfirm = useCallback(() => {
    state.resolve(true)
    setState({ open: false, message: '', resolve: null, type: 'confirm' })
  }, [state])

  const handleCancel = useCallback(() => {
    state.resolve(false)
    setState({ open: false, message: '', resolve: null, type: 'confirm' })
  }, [state])

  const handleOk = useCallback(() => {
    state.resolve(true)
    setState({ open: false, message: '', resolve: null, type: 'confirm' })
  }, [state])

  const ConfirmModal = state.open ? (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
      }}
      onClick={state.type === 'alert' ? handleOk : handleCancel}
    >
      <div
        style={{
          background: '#1a1a1a', borderRadius: 12, padding: '28px 24px 20px',
          maxWidth: 400, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <p style={{ margin: '0 0 20px', fontSize: 14, lineHeight: 1.5, color: '#e5e5e5' }}>
          {state.message}
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {state.type === 'alert' ? (
            <button
              onClick={handleOk}
              style={{
                padding: '8px 18px', border: 'none', borderRadius: 8,
                background: '#B45F2D', color: '#fff', fontSize: 13,
                fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              OK
            </button>
          ) : (
            <>
              <button
                onClick={handleCancel}
                style={{
                  padding: '8px 18px', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8, background: 'transparent', color: '#999',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                style={{
                  padding: '8px 18px', border: 'none', borderRadius: 8,
                  background: '#B45F2D', color: '#fff', fontSize: 13,
                  fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Confirm
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  ) : null

  return { showConfirm, showAlert, ConfirmModal }
}
