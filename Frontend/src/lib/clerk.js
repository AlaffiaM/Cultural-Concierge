// Holds the Clerk session-token getter so adminFetch can attach Bearer tokens.
let getTokenFn = null

export function setTokenProvider(fn) {
  getTokenFn = fn
}

export async function getClerkToken() {
  if (!getTokenFn) return null
  return getTokenFn()
}
