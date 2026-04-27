import { createFileRoute, redirect } from '@tanstack/react-router'
import { authService } from '@/core/service/auth.service'

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const isAuthenticated = await authService.isAuthenticated()
    
    if (isAuthenticated) {
      throw redirect({ to: '/user/dashboard' })
    } else {
      throw redirect({ to: '/authentication/signin' })
    }
  }
})