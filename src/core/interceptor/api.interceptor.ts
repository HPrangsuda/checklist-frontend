import axios, { type AxiosInstance, type InternalAxiosRequestConfig, type AxiosResponse, type AxiosError } from 'axios'
import { sessionStore } from '@/core/lib/store'
import type { SessionDTO } from '@/core/types/common'

class ApiInterceptor {
  private instance: AxiosInstance
  private isRefreshing = false
  private failedQueue: Array<{
    resolve: (value?: any) => void
    reject: (reason?: any) => void
  }> = []

  constructor() {
    this.instance = axios.create({
      baseURL: '/api',
      timeout: 10000,
      withCredentials: true,
    })
    this.setupInterceptors()
  }

  private getSession(): SessionDTO | null {
    const session = sessionStore.state.session
    console.log('getSession:', session?.accessToken ? 'has token' : 'NO TOKEN') 
    return session
  }

  private saveSession(session: SessionDTO): void {
    try {
      sessionStore.setState((prev) => ({ ...prev, session }))
    } catch {}
  }

  private setupInterceptors(): void {
    this.instance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const session = this.getSession()
        if (session?.accessToken) {
          config.headers = config.headers || {}
          config.headers.Authorization = `Bearer ${session.accessToken}`
        }
        return config
      },
      (error: AxiosError) => Promise.reject(error)
    )

    this.instance.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any
        if (!originalRequest) return Promise.reject(error)

        const isAuthEndpoint =
          originalRequest.url?.includes('/api/auth/sign-in') ||
          originalRequest.url?.includes('/api/auth/refresh')
        if (isAuthEndpoint) return Promise.reject(error)

        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject })
            })
              .then((newSession: any) => {
                originalRequest.headers.Authorization = `Bearer ${newSession.accessToken}`
                return this.instance(originalRequest)
              })
              .catch((err) => Promise.reject(err))
          }

          originalRequest._retry = true
          this.isRefreshing = true

          try {
            const newSession = await this.refreshToken()
            this.saveSession(newSession)

            originalRequest.headers = originalRequest.headers || {}
            originalRequest.headers.Authorization = `Bearer ${newSession.accessToken}`

            this.processQueue(null, newSession)
            return this.instance(originalRequest)
          } catch (refreshError) {
            this.processQueue(refreshError, null)
            this.handleAuthFailure()
            return Promise.reject(refreshError)
          } finally {
            this.isRefreshing = false
          }
        }

        return Promise.reject(error)
      }
    )
  }

  private async refreshToken(): Promise<SessionDTO> {
    const session = this.getSession()
    if (!session?.refreshToken) {
      throw new Error('No refresh token available')
    }

    const response = await axios.post(  // ← เปลี่ยนจาก this.instance.post
      'http://localhost:8080/api/auth/refresh',
      { refreshToken: session.refreshToken },
      { withCredentials: true }
    )

    const body = response.data
    if (!body?.success) {
      throw new Error(body?.message ?? 'Refresh failed')
    }

    return body.data as SessionDTO
  }

  private processQueue(error: any, session: SessionDTO | null): void {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) reject(error)
      else resolve(session)
    })
    this.failedQueue = []
  }

  private handleAuthFailure(): void {
    try {
      sessionStore.setState((prev) => ({ ...prev, session: null }))
    } catch {}

    if (window.location.pathname !== '/authentication/signin') {
      window.location.href = '/authentication/signin'
    }
  }

  public getInstance(): AxiosInstance {
    return this.instance
  }

  public get<T = any>(url: string, config?: any): Promise<T & { status?: number }> {
    return this.instance.get(url, config).then(res => ({ ...res.data, status: res.status }))
  }

  public post<T = any>(url: string, data?: any, config?: any): Promise<T & { status?: number }> {
    return this.instance.post(url, data, config).then(res => ({ ...res.data, status: res.status }))
  }

  public put<T = any>(url: string, data?: any, config?: any): Promise<T & { status?: number }> {
    return this.instance.put(url, data, config).then(res => ({ ...res.data, status: res.status }))
  }

  public delete<T = any>(url: string, config?: any): Promise<T & { status?: number }> {
    return this.instance.delete(url, config).then(res => ({ ...res.data, status: res.status }))
  }

  public patch<T = any>(url: string, data?: any, config?: any): Promise<T & { status?: number }> {
    return this.instance.patch(url, data, config).then(res => ({ ...res.data, status: res.status }))
  }
}

export const api = new ApiInterceptor()