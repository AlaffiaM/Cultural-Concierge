let getTokenFn = null

export function setTokenProvider(fn) {
  getTokenFn = fn
}

export async function getClerkToken() {
  if (!getTokenFn) return null
  return getTokenFn()
}

export { }
