import { useState, useEffect, useRef, useCallback } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { api } from '@/core/interceptor/api.interceptor'
import { toast } from 'sonner'
import { FormLayout } from '@/components/layout/form-layout'
import type { FormStep } from '@/components/layout/form-sidebar'
import { AlertCircle, Eye, EyeOff, ChevronDown, Search, X } from 'lucide-react'

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/checklist/members/add')({
  component: RouteComponent,
})

// ─── Types ────────────────────────────────────────────────────────────────────

interface MemberForm {
  employeeId:      string
  firstName:       string
  lastName:        string
  email:           string
  mobiles:         string
  userName:        string
  password:        string
  confirmPassword: string
  departmentId:    string
  roleType:        RoleType | ''
  supervisor:      string
  manager:         string
  languages:       string
}

interface DepartmentOption {
  label: string
  value: string
}

interface MemberOption {
  label: string
  value: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

type RoleType = 'ADMIN' | 'SUPERVISOR' | 'MANAGER' | 'DEPARTMENT_ADMIN' | 'MEMBER'

const ROLE_OPTIONS: { value: RoleType; label: string }[] = [
  { value: 'ADMIN',            label: 'Admin'            },
  { value: 'MANAGER',          label: 'Manager'          },
  { value: 'SUPERVISOR',       label: 'Supervisor'       },
  { value: 'DEPARTMENT_ADMIN', label: 'Department Admin' },
  { value: 'MEMBER',           label: 'Member'           },
]

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'th', label: 'Thai'    },
]

const INITIAL_FORM: MemberForm = {
  employeeId:      '',
  firstName:       '',
  lastName:        '',
  email:           '',
  mobiles:         '',
  userName:        '',
  password:        '',
  confirmPassword: '',
  departmentId:    '',
  roleType:        '',
  supervisor:      '',
  manager:         '',
  languages:       'en',
}

const formSteps: FormStep[] = [
  { id: 'form', title: 'Member Info', description: 'Fill in member details', required: true },
]

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

// ─── Field Components ─────────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="text-red-500 text-xs flex items-center gap-1 mt-1">
      <AlertCircle className="w-3 h-3 shrink-0" /> {message}
    </p>
  )
}

function FieldWrapper({ label, required, error, hint, children }: {
  label: string
  required?: boolean
  error?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {children}
      <FieldError message={error} />
    </div>
  )
}

// ─── MemberDropdown ───────────────────────────────────────────────────────────

function MemberDropdown({
  label,
  value,
  onChange,
  error,
  placeholder = 'Select member (optional)',
}: {
  label:        string
  value:        string
  onChange:     (v: string) => void
  error?:       string
  placeholder?: string
}) {
  const [members, setMembers] = useState<MemberOption[]>([])
  const [keyword, setKeyword] = useState('')
  const [page,    setPage]    = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [open,    setOpen]    = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const fetchMembers = useCallback(async (kw: string, idx: number, replace = false) => {
    setLoading(true)
    try {
      const params: any = { index: idx, size: 10, status: 'ACTIVE' }
      if (kw.trim()) params.keyword = kw.trim()
      const res = await api.get<any>('/api/user/get/list', { params })
      const items: any[] = res?.data ?? []
      const opts: MemberOption[] = items.map(m => ({
        label: `${m.firstName} ${m.lastName}`.trim(),
        value: String(m.id),
      }))
      setMembers(prev => replace ? opts : [...prev, ...opts])
      setHasMore(res?.hasMore ?? false)
    } catch {
      toast.error('Member fetch failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMembers('', 0, true) }, [])
  useEffect(() => { setPage(0); fetchMembers(keyword, 0, true) }, [keyword])
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const selected = members.find(m => m.value === value)

  return (
    <FieldWrapper label={label} error={error}>
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className={`w-full flex items-center justify-between border rounded-lg px-3 py-2.5 bg-background text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500
            ${error ? 'border-red-400' : 'border-border'}`}
        >
          <span className={selected ? 'text-foreground' : 'text-muted-foreground'}>
            {selected ? selected.label : placeholder}
          </span>
          <div className="flex items-center gap-1">
            {value && (
              <span
                onClick={e => { e.stopPropagation(); onChange('') }}
                className="p-0.5 rounded hover:bg-muted transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </span>
            )}
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-full bg-background border border-border rounded-xl shadow-lg overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
              <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <input
                autoFocus
                type="text"
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                placeholder="Search member..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <ul className="max-h-48 overflow-y-auto">
              {members.length === 0 && !loading && (
                <li className="px-3 py-3 text-sm text-muted-foreground text-center">
                  No members found
                </li>
              )}
              {members.map(m => (
                <li
                  key={m.value}
                  onClick={() => { onChange(m.value); setOpen(false) }}
                  className={`px-3 py-2.5 text-sm cursor-pointer transition
                    ${value === m.value ? 'bg-blue-50/10 text-blue-500' : 'hover:bg-muted'}`}
                >
                  {m.label}
                </li>
              ))}
              {loading && (
                <li className="px-3 py-2 text-xs text-muted-foreground text-center">Loading...</li>
              )}
              {hasMore && !loading && (
                <li
                  onClick={() => { const next = page + 1; setPage(next); fetchMembers(keyword, next) }}
                  className="px-3 py-2 text-xs text-blue-500 text-center cursor-pointer hover:bg-muted transition"
                >
                  Load more
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </FieldWrapper>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

function RouteComponent() {
  const navigate = useNavigate()

  const [form,         setForm]         = useState<MemberForm>(INITIAL_FORM)
  const [errors,       setErrors]       = useState<Partial<Record<keyof MemberForm, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm,  setShowConfirm]  = useState(false)

  const [departments, setDepartments] = useState<DepartmentOption[]>([])
  const [deptKeyword, setDeptKeyword] = useState('')
  const [deptPage,    setDeptPage]    = useState(0)
  const [deptHasMore, setDeptHasMore] = useState(true)
  const [deptLoading, setDeptLoading] = useState(false)
  const [deptOpen,    setDeptOpen]    = useState(false)
  const deptRef = useRef<HTMLDivElement>(null)

  // ─── Fetch departments ───────────────────────────────────────────────────

  const fetchDepartments = useCallback(async (keyword: string, index: number, replace = false) => {
    setDeptLoading(true)
    try {
      const params: any = { index, size: 10 }
      if (keyword.trim()) params.keyword = keyword.trim()
      const response = await api.get<any>('/api/department/get/list', { params })
      const items: any[] = response?.data ?? []
      const transformed: DepartmentOption[] = items.map(dep => ({
        label: dep.division != null
          ? `${dep.department}-${dep.division}`
          : dep.department,
        value: dep.departmentCode,
      }))
      setDepartments(prev => replace ? transformed : [...prev, ...transformed])
      setDeptHasMore(response?.hasMore ?? false)
    } catch {
      toast.error('Department fetch failed')
    } finally {
      setDeptLoading(false)
    }
  }, [])

  useEffect(() => { fetchDepartments('', 0, true) }, [])
  useEffect(() => { setDeptPage(0); fetchDepartments(deptKeyword, 0, true) }, [deptKeyword])
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (deptRef.current && !deptRef.current.contains(e.target as Node)) setDeptOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const loadMoreDepts = () => {
    const next = deptPage + 1
    setDeptPage(next)
    fetchDepartments(deptKeyword, next)
  }

  const selectedDept = departments.find(d => d.value === form.departmentId)

  // ─── Field helpers ───────────────────────────────────────────────────────

  const setField = <K extends keyof MemberForm>(key: K, value: MemberForm[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => { const n = { ...prev }; delete n[key]; return n })
  }

  const inputClass = (key: keyof MemberForm) =>
    `w-full border rounded-lg px-3 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition
     ${errors[key] ? 'border-red-400' : 'border-border'}`

  // ─── Validation ──────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const e: Partial<Record<keyof MemberForm, string>> = {}
    if (!form.employeeId.trim())                              e.employeeId      = 'Employee ID is required'
    if (!form.firstName.trim())                               e.firstName       = 'First name is required'
    if (!form.lastName.trim())                                e.lastName        = 'Last name is required'
    if (form.email && !isValidEmail(form.email))              e.email           = 'Invalid email format'
    if (!form.mobiles.trim())                                 e.mobiles         = 'Mobile number is required'
    if (!form.userName.trim())                                e.userName        = 'Username is required'
    if (!form.password)                                       e.password        = 'Password is required'
    else if (form.password.length < 8)                        e.password        = 'Password must be at least 8 characters'
    if (!form.confirmPassword)                                e.confirmPassword = 'Please confirm your password'
    else if (form.password !== form.confirmPassword)          e.confirmPassword = 'Passwords do not match'
    if (!form.roleType)                                       e.roleType        = 'Role is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const isFormValid = () =>
    !!(form.employeeId  && form.firstName && form.lastName &&
       (!form.email     || isValidEmail(form.email))       &&
       form.mobiles     && form.userName  && form.password &&
       form.password    === form.confirmPassword            &&
       form.roleType)

  const getStepStatus = (stepId: string): 'complete' | 'error' | 'incomplete' | 'empty' => {
    if (stepId === 'form') {
      if (Object.keys(errors).length > 0) return 'error'
      return isFormValid() ? 'complete' : 'incomplete'
    }
    return 'empty'
  }

  // ─── Submit ──────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) { toast.error('Please fill in all required fields'); return }

    setIsSubmitting(true)
    try {
      const { confirmPassword, supervisor, manager, ...rest } = form
      const payload = {
        ...rest,
        supervisor: supervisor ? Number(supervisor) : null,
        manager:    manager    ? Number(manager)    : null,
      }

      const response = await api.post<any>('/api/user/create', payload)
      if (!response?.success) {
        toast.error('Create failed', {
          description: response?.message ?? 'Failed to create member',
        })
        return
      }
      toast.success('Member created successfully')
      setTimeout(() => navigate({ to: '/checklist/members' }), 800)
    } catch (error: any) {
      const errorMessage: string =
        error?.response?.data?.message ?? error?.message ?? 'Failed to create member'
      toast.error('Create failed', { description: errorMessage })
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <FormLayout
      backLink="/checklist/members"
      title="Add Member"
      subtitle="Create a new member account"
      onSubmit={handleSubmit}
      steps={formSteps}
      currentStep="form"
      onStepChange={() => {}}
      getStepStatus={getStepStatus}
      isSubmitting={isSubmitting}
      isFormValid={isFormValid()}
      submitText="Create Member"
      cancelLink="/checklist/members"
    >
      <div className="px-2 pt-2 space-y-5">

        {/* ── Personal Info ──────────────────────────────────────────────── */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Personal Information
          </h3>

          <FieldWrapper label="Employee ID" required error={errors.employeeId}>
            <input
              type="text"
              value={form.employeeId}
              onChange={e => setField('employeeId', e.target.value)}
              placeholder="e.g. EMP-0001"
              className={inputClass('employeeId')}
            />
          </FieldWrapper>

          <div className="grid grid-cols-2 gap-3">
            <FieldWrapper label="First Name" required error={errors.firstName}>
              <input
                type="text"
                value={form.firstName}
                onChange={e => setField('firstName', e.target.value)}
                placeholder="First name"
                className={inputClass('firstName')}
              />
            </FieldWrapper>
            <FieldWrapper label="Last Name" required error={errors.lastName}>
              <input
                type="text"
                value={form.lastName}
                onChange={e => setField('lastName', e.target.value)}
                placeholder="Last name"
                className={inputClass('lastName')}
              />
            </FieldWrapper>
          </div>

          <FieldWrapper label="Mobile" required error={errors.mobiles}>
            <input
              type="tel"
              value={form.mobiles}
              onChange={e => setField('mobiles', e.target.value)}
              placeholder="e.g. 0812345678"
              className={inputClass('mobiles')}
            />
          </FieldWrapper>

          <FieldWrapper label="Email" error={errors.email}>
            <input
              type="email"
              value={form.email}
              onChange={e => setField('email', e.target.value)}
              placeholder="example@company.com (optional)"
              className={inputClass('email')}
            />
          </FieldWrapper>

          {/* Department */}
          <FieldWrapper label="Department" error={errors.departmentId}>
            <div className="relative" ref={deptRef}>
              <button
                type="button"
                onClick={() => setDeptOpen(v => !v)}
                className={`w-full flex items-center justify-between border rounded-lg px-3 py-2.5 bg-background text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500
                  ${errors.departmentId ? 'border-red-400' : 'border-border'}`}
              >
                <span className={selectedDept ? 'text-foreground' : 'text-muted-foreground'}>
                  {selectedDept ? selectedDept.label : 'Select department (optional)'}
                </span>
                <div className="flex items-center gap-1">
                  {form.departmentId && (
                    <span
                      onClick={e => { e.stopPropagation(); setField('departmentId', '') }}
                      className="p-0.5 rounded hover:bg-muted transition cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5 text-muted-foreground" />
                    </span>
                  )}
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${deptOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {deptOpen && (
                <div className="absolute z-50 mt-1 w-full bg-background border border-border rounded-xl shadow-lg overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
                    <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <input
                      autoFocus
                      type="text"
                      value={deptKeyword}
                      onChange={e => setDeptKeyword(e.target.value)}
                      placeholder="Search department..."
                      className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                  <ul className="max-h-48 overflow-y-auto">
                    {departments.length === 0 && !deptLoading && (
                      <li className="px-3 py-3 text-sm text-muted-foreground text-center">
                        No departments found
                      </li>
                    )}
                    {departments.map(d => (
                      <li
                        key={d.value}
                        onClick={() => { setField('departmentId', d.value); setDeptOpen(false) }}
                        className={`px-3 py-2.5 text-sm cursor-pointer transition
                          ${form.departmentId === d.value
                            ? 'bg-blue-50/10 text-blue-500'
                            : 'hover:bg-muted'}`}
                      >
                        {d.label}
                      </li>
                    ))}
                    {deptLoading && (
                      <li className="px-3 py-2 text-xs text-muted-foreground text-center">
                        Loading...
                      </li>
                    )}
                    {deptHasMore && !deptLoading && (
                      <li
                        onClick={loadMoreDepts}
                        className="px-3 py-2 text-xs text-blue-500 text-center cursor-pointer hover:bg-muted transition"
                      >
                        Load more
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </FieldWrapper>

          {/* Supervisor & Manager */}
          <MemberDropdown
            label="Supervisor"
            value={form.supervisor}
            onChange={v => setField('supervisor', v)}
            placeholder="Select supervisor (optional)"
          />
          <MemberDropdown
            label="Manager"
            value={form.manager}
            onChange={v => setField('manager', v)}
            placeholder="Select manager (optional)"
          />
        </section>

        <hr className="border-border" />

        {/* ── Account ────────────────────────────────────────────────────── */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Account
          </h3>

          <FieldWrapper label="Username" required error={errors.userName}>
            <input
              type="text"
              value={form.userName}
              onChange={e => setField('userName', e.target.value)}
              placeholder="Username"
              autoComplete="new-password"
              className={inputClass('userName')}
            />
          </FieldWrapper>

          <FieldWrapper label="Password" required error={errors.password} hint="Minimum 8 characters">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={e => setField('password', e.target.value)}
                placeholder="Password"
                autoComplete="new-password"
                className={`${inputClass('password')} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </FieldWrapper>

          <FieldWrapper label="Confirm Password" required error={errors.confirmPassword}>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={e => setField('confirmPassword', e.target.value)}
                placeholder="Confirm password"
                className={`${inputClass('confirmPassword')} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </FieldWrapper>
        </section>

        <hr className="border-border" />

        {/* ── Role & Language ─────────────────────────────────────────────── */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Role & Language
          </h3>

          <FieldWrapper label="Role" required error={errors.roleType}>
            <div className="grid grid-cols-2 gap-2">
              {ROLE_OPTIONS.map(r => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setField('roleType', r.value)}
                  className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition
                    ${form.roleType === r.value
                      ? 'border-blue-500 bg-blue-50/10 text-blue-500'
                      : errors.roleType
                        ? 'border-red-400 text-foreground hover:border-blue-400'
                        : 'border-border text-foreground hover:border-blue-400'}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </FieldWrapper>

          <FieldWrapper label="Language">
            <div className="flex gap-2">
              {LANGUAGE_OPTIONS.map(l => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => setField('languages', l.value)}
                  className={`flex-1 px-3 py-2.5 rounded-lg border text-sm font-medium transition
                    ${form.languages === l.value
                      ? 'border-blue-500 bg-blue-50/10 text-blue-500'
                      : 'border-border text-foreground hover:border-blue-400'}`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </FieldWrapper>
        </section>

      </div>
    </FormLayout>
  )
}