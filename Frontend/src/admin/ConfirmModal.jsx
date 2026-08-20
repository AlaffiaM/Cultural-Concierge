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
      className="confirm-modal-overlay"
      onClick={state.type === 'alert' ? handleOk : handleCancel}
    >
      <div
        className="confirm-modal-card"
        onClick={e => e.stopPropagation()}
      >
        <p className="confirm-modal-message">
          {state.message}
        </p>
        <div className="confirm-modal-actions">
          {state.type === 'alert' ? (
            <button
              onClick={handleOk}
              className="admin-btn admin-btn-primary"
            >
              OK
            </button>
          ) : (
            <>
              <button
                onClick={handleCancel}
                className="admin-btn admin-btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="admin-btn admin-btn-primary"
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
