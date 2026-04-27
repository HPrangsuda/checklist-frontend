import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/user/setting/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/user/setting/"!</div>
}
