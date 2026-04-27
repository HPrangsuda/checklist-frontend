import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/crm/opportunities/viewd')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/crm/opportunities/viewd"!</div>
}
