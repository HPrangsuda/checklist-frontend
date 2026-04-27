import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { api } from '@/core/interceptor/api.interceptor'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { FormLayout } from '@/components/layout/form-layout'
import type { FormStep } from '@/components/layout/form-sidebar'

export const Route = createFileRoute('/checklist/members/view')({
  validateSearch: (search: Record<string, unknown>) => ({
    id: Number(search.id ?? 0),
  }),
  component: RouteComponent,
})

type RoleType = 'ADMIN' | 'SUPERVISOR' | 'MANAGER' | 'MEMBER'

interface MemberDTO {
  id: number
  employeeId: string
  firstName: string
  lastName: string
  email: string
  mobiles: string
  userName: string
  departmentId: string
  roleType: RoleType
  languages: string
  avatarKey: string
}

interface DepartmentOption {
  label: string
  value: string
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN:      'bg-red-100 text-red-700',
  MANAGER:    'bg-purple-100 text-purple-700',
  SUPERVISOR: 'bg-blue-100 text-blue-700',
  MEMBER:     'bg-green-100 text-green-700',
}

const formSteps: FormStep[] = [
  { id: 'form', title: 'Member Info', description: 'Member details', required: true },
]

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value || "-"}</span>
    </div>
  )
}

function RouteComponent() {
  const { id } = Route.useSearch()
  const navigate = useNavigate()
  const [member, setMember] = useState<MemberDTO | null>(null)
  const [loading, setLoading] = useState(true)
  const [deptLabel, setDeptLabel] = useState<string>('-')

  useEffect(() => {
    const fetchMember = async () => {
      try {
        const res = await api.get<any>(`/api/user/${id}`)
        const m: MemberDTO = res?.data ?? res
        setMember(m)

        // fetch department name
        if (m.departmentId) {
          try {
            const deptRes = await api.get<any>('/api/department/get/list', {
              params: { index: 0, size: 200 },
            })
            const items: any[] = deptRes?.data ?? []
            const found = items.find(d => d.departmentCode === m.departmentId)
            if (found) {
              setDeptLabel(found.division != null
                ? `${found.department}-${found.division}`
                : found.department)
            }
          } catch {}
        }
      } catch {
        toast.error('Failed to load member')
        navigate({ to: '/checklist/members' })
      } finally {
        setLoading(false)
      }
    }
    fetchMember()
  }, [id])

  if (loading || !member) return null

  return (
    <FormLayout
      backLink="/checklist/members"
      title="Member Detail"
      subtitle={`${member.firstName} ${member.lastName}`}
      onSubmit={e => { e.preventDefault(); navigate({ to: '/checklist/members/edit', search: { id: member.id } }) }}
      steps={formSteps}
      currentStep="form"
      onStepChange={() => {}}
      getStepStatus={() => 'complete'}
      isSubmitting={false}
      isFormValid={true}
      submitText="Edit"
      cancelLink="/checklist/members"
    >
      <div className="px-2 pt-2 space-y-5">

        {/* ── Avatar ───────────────────────────────────── */}
        <section className="flex items-center gap-4 p-4 rounded-xl border border-border bg-muted/20">
          {member.avatarKey && member.avatarKey.length > 2 ? (
            <img
              src={member.avatarKey}
              alt={`${member.firstName} ${member.lastName}`}
              className="w-16 h-16 rounded-full object-cover border-2 border-border"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center border-2 border-border">
              <span className="text-2xl font-bold text-blue-500">
                {member.avatarKey || member.firstName?.charAt(0)?.toUpperCase() || '?'}
              </span>
            </div>
          )}
          <div>
            <p className="text-base font-semibold">{member.firstName} {member.lastName}</p>
            <p className="text-sm text-muted-foreground">{member.email || member.mobiles}</p>
            <span className={`mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[member.roleType] ?? `bg-muted text-muted-foreground`}`}>
              {member.roleType}
            </span>
          </div>
        </section>

        <hr className="border-border" />

        {/* ── Personal Info ─────────────────────────────── */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Personal Information</h3>
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border border-border bg-muted/20">
            <InfoRow label="Employee ID" value={member.employeeId} />
            <InfoRow label="Department" value={deptLabel} />
            <InfoRow label="First Name" value={member.firstName} />
            <InfoRow label="Last Name" value={member.lastName} />
            <InfoRow label="Mobile" value={member.mobiles} />
            <InfoRow label="Email" value={member.email} />
          </div>
        </section>

        <hr className="border-border" />

        {/* ── Account ───────────────────────────────────── */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Account</h3>
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border border-border bg-muted/20">
            <InfoRow label="Username" value={member.userName} />
            <InfoRow label="Language" value={member.languages?.toUpperCase()} />
          </div>
        </section>

        <hr className="border-border" />

        {/* ── Role ──────────────────────────────────────── */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Role</h3>
          <div className="p-4 rounded-xl border border-border bg-muted/20">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${ROLE_COLORS[member.roleType] ?? `bg-muted text-muted-foreground`}`}>
              {member.roleType}
            </span>
          </div>
        </section>

      </div>
    </FormLayout>
  )
}