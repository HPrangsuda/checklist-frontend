import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/checklist/')({
  beforeLoad: () => {
    throw redirect({ to: '/checklist/dashboard' });
  }
})