import axios from 'axios'

const client = axios.create({
  // The relative default is routed by Vite in development and nginx in the
  // container. It also prevents requests from falling back to `/auth/*` on
  // the frontend origin when a local .env file has not been created yet.
  baseURL: (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

client.interceptors.response.use(
  (res) => res,
  (err) => {
    const isAuthEndpoint = err.config?.url?.includes('/auth/')
    const status  = err.response?.status
    const detail  = err.response?.data?.detail

    // 401 → missing / expired token (HTTPBearer + invalid JWT)
    // 403 "Not authenticated" → HTTPBearer raised 403 on some Starlette versions for absent header
    // 403 "Insufficient permissions" is a role/permission error — do NOT redirect; let the page handle it
    const isUnauthenticated =
      status === 401 ||
      (status === 403 && typeof detail === 'string' && detail === 'Not authenticated')

    if (isUnauthenticated && !isAuthEndpoint) {
      localStorage.removeItem('access_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default client
