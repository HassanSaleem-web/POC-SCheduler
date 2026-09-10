import { useEffect, useState } from 'react'
import {
  AlertTriangle, ArrowLeft, ArrowRight, BarChart3, Bot, BriefcaseBusiness, Building2,
  CalendarDays, Check, ChevronDown, CircleHelp, Clock3, Edit3, Filter, HeartPulse,
  LayoutDashboard, LoaderCircle, Mail, Menu, MessageSquareText, MoreHorizontal, Plus,
  RotateCcw, Search, Send, Settings2, ShieldAlert, Sparkles, Trash2, TrendingUp,
  UsersRound, WandSparkles,
} from 'lucide-react'
import { Avatar, Badge, EmptyState, Modal, Toggle } from './components/ui'
import { getMonday, seedEmployees, seedSettings, toISODate } from './data/seed'
import { employeeStatus, scheduleMetrics, scheduledHours } from './domain/analysis'
import { handleAssistant } from './domain/assistant'
import { refreshCompliance } from './domain/scheduler'
import { generateSchedule } from './domain/scheduler'
import { formatHours, hoursBetween } from './domain/time'
import { useLocalStorage } from './hooks/useLocalStorage'
import { DAYS, type BusinessSettings, type ChatMessage, type Employee, type LeavePeriod, type Page, type Role, type ScheduleResult, type Shift } from './types'

const ROLES: Role[] = ['Store Manager', 'Supervisor', 'Sales Associate', 'Cashier', 'Stock Associate']
const COLORS = ['#6c5ce7', '#0ea5e9', '#f97316', '#22c55e', '#ec4899', '#14b8a6', '#eab308', '#ef4444']
const GENERATION_STEPS = ['Analyzing availability…', 'Checking staffing requirements…', 'Applying scheduling rules…', 'Balancing employee hours…']

function sleep(ms: number) { return new Promise((resolve) => window.setTimeout(resolve, ms)) }

function dateForDay(weekStart: string, dayIndex: number) {
  const value = new Date(`${weekStart}T12:00:00`)
  value.setDate(value.getDate() + dayIndex)
  return toISODate(value)
}

function formatWeek(weekStart: string) {
  const start = new Date(`${weekStart}T12:00:00`)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const startLabel = start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const endLabel = end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${startLabel} – ${endLabel}`
}

function App() {
  const [employees, setEmployees] = useLocalStorage<Employee[]>('novashift:employees', seedEmployees)
  const [settings, setSettings] = useLocalStorage<BusinessSettings>('novashift:settings', seedSettings)
  const [schedule, setSchedule] = useLocalStorage<ScheduleResult>('novashift:schedule', generateSchedule(seedEmployees, seedSettings))
  const [page, setPage] = useState<Page>('dashboard')
  const [generatingStep, setGeneratingStep] = useState(-1)
  const [toast, setToast] = useState('')
  const [mobileNav, setMobileNav] = useState(false)

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2600)
  }

  const generate = async (weekStart = schedule.weekStart || toISODate(getMonday())) => {
    for (let index = 0; index < GENERATION_STEPS.length; index += 1) {
      setGeneratingStep(index)
      await sleep(420)
    }
    setSchedule(generateSchedule(employees, settings, weekStart))
    setGeneratingStep(-1)
    showToast('Schedule generated and compliance-checked')
  }

  const updateEmployees = (next: Employee[]) => {
    setEmployees(next)
    setSchedule((current) => refreshCompliance({ ...current, shifts: current.shifts.filter((shift) => next.some((employee) => employee.id === shift.employeeId)) }, next, settings))
  }

  const nav = (nextPage: Page) => { setPage(nextPage); setMobileNav(false) }
  const metrics = scheduleMetrics(schedule, employees, settings)

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'mobile-open' : ''}`}>
        <div className="brand"><div className="brand-mark"><Sparkles size={19} /></div><div><strong>NovaShift</strong><span>AI workforce</span></div></div>
        <nav>
          <NavItem icon={<LayoutDashboard />} label="Overview" active={page === 'dashboard'} onClick={() => nav('dashboard')} />
          <NavItem icon={<CalendarDays />} label="Schedule" active={page === 'schedule'} onClick={() => nav('schedule')} badge={metrics.missing || undefined} />
          <NavItem icon={<UsersRound />} label="Employees" active={page === 'employees'} onClick={() => nav('employees')} />
          <NavItem icon={<Clock3 />} label="Availability" active={page === 'availability'} onClick={() => nav('availability')} />
          <NavItem icon={<Settings2 />} label="Business settings" active={page === 'settings'} onClick={() => nav('settings')} />
        </nav>
        <div className="sidebar-spacer" />
        <div className="ai-credit"><WandSparkles size={18} /><div><strong>Smart scheduling</strong><span>Deterministic AI assistant</span></div></div>
        <div className="profile"><Avatar name="Mara Becker" color="#171923" /><div><strong>Mara Becker</strong><span>Store administrator</span></div><MoreHorizontal size={18} /></div>
      </aside>
      {mobileNav && <button className="nav-scrim" onClick={() => setMobileNav(false)} aria-label="Close navigation" />}

      <main>
        <header className="topbar">
          <div className="topbar-title"><button className="mobile-menu icon-button" onClick={() => setMobileNav(true)}><Menu /></button><div className="location-dot"><Building2 size={17} /></div><div><strong>{settings.name}</strong><span>Berlin Mitte · {settings.country}</span></div><ChevronDown size={16} /></div>
          <div className="topbar-actions"><button className="icon-button" title="Help"><CircleHelp size={18} /></button><button className="icon-button alert-bell" title="Warnings"><ShieldAlert size={18} />{metrics.warningCount > 0 && <i />}</button><div className="divider" /><Avatar name="Mara Becker" color="#171923" size="sm" /></div>
        </header>

        {page === 'dashboard' && <Dashboard employees={employees} settings={settings} schedule={schedule} onGenerate={() => { nav('schedule'); void generate() }} onNavigate={nav} />}
        {page === 'employees' && <EmployeesPage employees={employees} onChange={updateEmployees} notify={showToast} />}
        {page === 'availability' && <AvailabilityPage employees={employees} weekStart={schedule.weekStart} onChange={updateEmployees} notify={showToast} />}
        {page === 'settings' && <SettingsPage settings={settings} onSave={(next) => { setSettings(next); setSchedule((current) => refreshCompliance(current, employees, next)); showToast('Business settings saved') }} />}
        {page === 'schedule' && <SchedulePage employees={employees} settings={settings} schedule={schedule} onSchedule={setSchedule} onGenerate={() => void generate()} onWeekChange={(week) => void generate(week)} notify={showToast} />}
      </main>

      {generatingStep >= 0 && <GenerationOverlay step={generatingStep} />}
      {toast && <div className="toast"><span><Check size={15} /></span>{toast}</div>}
    </div>
  )
}

function NavItem({ icon, label, active, onClick, badge }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void; badge?: number }) {
  return <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>{icon}<span>{label}</span>{badge ? <em>{badge}</em> : null}</button>
}

function PageHeader({ eyebrow, title, copy, actions }: { eyebrow: string; title: string; copy: string; actions?: React.ReactNode }) {
  return <div className="page-header"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{copy}</p></div>{actions && <div className="page-actions">{actions}</div>}</div>
}

function Dashboard({ employees, settings, schedule, onGenerate, onNavigate }: { employees: Employee[]; settings: BusinessSettings; schedule: ScheduleResult; onGenerate: () => void; onNavigate: (page: Page) => void }) {
  const metrics = scheduleMetrics(schedule, employees, settings)
  const upcomingLeave = employees.flatMap((employee) => employee.leave.map((leave) => ({ employee, leave }))).filter(({ leave }) => leave.endDate >= schedule.weekStart).sort((a, b) => a.leave.startDate.localeCompare(b.leave.startDate)).slice(0, 3)
  const maxDayHours = Math.max(...DAYS.map((_, day) => schedule.shifts.filter((shift) => shift.dayIndex === day).reduce((sum, shift) => sum + hoursBetween(shift.start, shift.end), 0)), 1)

  return <div className="page dashboard-page">
    <PageHeader eyebrow="Workforce overview" title="Good morning, Mara" copy={`${formatWeek(schedule.weekStart)} · Here’s how your team is shaping up.`} actions={<button className="primary-button" onClick={onGenerate}><WandSparkles size={17} />Generate schedule</button>} />
    <section className="metric-grid">
      <MetricCard icon={<UsersRound />} tone="purple" value={employees.filter((employee) => employee.status === 'active').length.toString()} label="Active employees" note={`${employees.filter((employee) => employee.status === 'inactive').length} inactive`} />
      <MetricCard icon={<Clock3 />} tone="blue" value={formatHours(metrics.totalHours)} label="Scheduled hours" note={`${schedule.shifts.length} shifts this week`} trend="+4.5%" />
      <MetricCard icon={<AlertTriangle />} tone="orange" value={metrics.missing.toString()} label="Unfilled requirements" note={metrics.missing ? 'Needs your attention' : 'Fully covered'} attention={metrics.missing > 0} />
      <MetricCard icon={<ShieldAlert />} tone="pink" value={metrics.warningCount.toString()} label="Rule notifications" note="Demo compliance checks" />
    </section>

    <section className="dashboard-grid">
      <div className="card staffing-card">
        <div className="card-header"><div><h2>Weekly staffing overview</h2><p>Scheduled labor hours by day</p></div><button className="text-button" onClick={() => onNavigate('schedule')}>View schedule <ArrowRight size={15} /></button></div>
        <div className="staffing-chart">
          {DAYS.map((day, dayIndex) => {
            const hours = schedule.shifts.filter((shift) => shift.dayIndex === dayIndex).reduce((sum, shift) => sum + hoursBetween(shift.start, shift.end), 0)
            const hasGap = schedule.gaps.some((gap) => gap.dayIndex === dayIndex)
            return <div className="chart-col" key={day}><span className="chart-value">{hours ? Math.round(hours) : '—'}</span><div className="bar-track"><div className={`bar-fill ${hasGap ? 'gap' : ''}`} style={{ height: `${Math.max(hours ? 12 : 0, (hours / maxDayHours) * 100)}%` }} /></div><strong>{day.slice(0, 3)}</strong>{hasGap ? <i className="gap-dot" title="Staffing gap" /> : <i />}</div>
          })}
        </div>
        <div className="chart-legend"><span><i className="legend-swatch purple" />Scheduled hours</span><span><i className="legend-dot" />Coverage gap</span><strong>{metrics.coverage}% coverage</strong></div>
      </div>

      <div className="card health-card">
        <div className="card-header"><div><h2>Schedule health</h2><p>AI-generated quality score</p></div><Badge tone={metrics.coverage > 90 ? 'success' : 'warning'}>{metrics.coverage > 90 ? 'Strong' : 'Review'}</Badge></div>
        <div className="score-ring" style={{ '--score': `${metrics.fairness * 3.6}deg` } as React.CSSProperties}><div><strong>{metrics.fairness}</strong><span>/ 100</span></div></div>
        <div className="health-lines"><div><span>Staffing coverage</span><strong>{metrics.coverage}%</strong></div><div><span>Hours fairness</span><strong>{metrics.fairness}%</strong></div><div><span>Rule checks</span><strong>{metrics.warningCount ? `${metrics.warningCount} notes` : 'Clear'}</strong></div></div>
      </div>
    </section>

    <section className="dashboard-lower">
      <div className="card leave-card"><div className="card-header"><div><h2>Upcoming leave</h2><p>Time off affecting your team</p></div><button className="icon-button" onClick={() => onNavigate('availability')}><ArrowRight size={17} /></button></div>
        <div className="leave-list">{upcomingLeave.map(({ employee, leave }) => <div className="leave-item" key={leave.id}><Avatar name={employee.name} color={employee.color} /><div><strong>{employee.name}</strong><span>{leave.note || leave.type}</span></div><div className="leave-date"><Badge tone={leave.type === 'sick' ? 'danger' : leave.type === 'vacation' ? 'purple' : 'blue'}>{leave.type}</Badge><span>{new Date(`${leave.startDate}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span></div></div>)}</div>
      </div>
      <div className="card insights-card"><div className="card-header"><div><h2>Scheduler insights</h2><p>What NovaShift noticed</p></div><div className="sparkle-dot"><Sparkles size={16} /></div></div>
        <div className="insight"><span className="insight-icon warning"><AlertTriangle size={17} /></span><div><strong>Friday evening needs attention</strong><p>Coverage is tight due to availability and contracted-hour limits.</p></div></div>
        <div className="insight"><span className="insight-icon positive"><TrendingUp size={17} /></span><div><strong>{metrics.fairness}% fairness score</strong><p>Hours are distributed toward employee contract targets.</p></div></div>
      </div>
    </section>
    <p className="legal-note"><ShieldAlert size={15} /> Demo compliance rules only. Final schedules should be reviewed against applicable employment law and company policy.</p>
  </div>
}

function MetricCard({ icon, tone, value, label, note, trend, attention }: { icon: React.ReactNode; tone: string; value: string; label: string; note: string; trend?: string; attention?: boolean }) {
  return <div className={`metric-card ${attention ? 'metric-attention' : ''}`}><div className={`metric-icon ${tone}`}>{icon}</div><div className="metric-top"><strong>{value}</strong>{trend && <Badge tone="success">{trend}</Badge>}</div><h3>{label}</h3><p>{note}</p></div>
}

function EmployeesPage({ employees, onChange, notify }: { employees: Employee[]; onChange: (employees: Employee[]) => void; notify: (message: string) => void }) {
  const [query, setQuery] = useState('')
  const [role, setRole] = useState('All roles')
  const [editing, setEditing] = useState<Employee | null | 'new'>(null)
  const [viewing, setViewing] = useState<Employee | null>(null)
  const filtered = employees.filter((employee) => employee.name.toLowerCase().includes(query.toLowerCase()) && (role === 'All roles' || employee.role === role))

  const save = (employee: Employee) => {
    const exists = employees.some((item) => item.id === employee.id)
    onChange(exists ? employees.map((item) => item.id === employee.id ? employee : item) : [...employees, employee])
    setEditing(null)
    notify(exists ? 'Employee updated' : 'Employee added')
  }

  const remove = (employee: Employee) => {
    if (!window.confirm(`Delete ${employee.name}? Their saved shifts will also be removed.`)) return
    onChange(employees.filter((item) => item.id !== employee.id))
    notify('Employee deleted')
  }

  return <div className="page">
    <PageHeader eyebrow="Team directory" title="Employees" copy="Manage contracts, roles, availability, and employment status." actions={<button className="primary-button" onClick={() => setEditing('new')}><Plus size={17} />Add employee</button>} />
    <div className="toolbar card"><label className="search-box"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search employees…" /></label><label className="select-box"><Filter size={16} /><select value={role} onChange={(event) => setRole(event.target.value)}><option>All roles</option>{ROLES.map((item) => <option key={item}>{item}</option>)}</select></label><span className="toolbar-count">{filtered.length} people</span></div>
    <div className="card table-card"><table><thead><tr><th>Employee</th><th>Role</th><th>Contract</th><th>Preferred days</th><th>Status</th><th /></tr></thead><tbody>{filtered.map((employee) => <tr key={employee.id} onClick={() => setViewing(employee)}><td><div className="person-cell"><Avatar name={employee.name} color={employee.color} /><div><strong>{employee.name}</strong><span>{employee.email}</span></div></div></td><td><Badge tone={employee.role === 'Store Manager' ? 'purple' : employee.role === 'Supervisor' ? 'blue' : 'neutral'}>{employee.role}</Badge></td><td><strong>{employee.contractedHours}h</strong><span className="cell-sub">per week</span></td><td><div className="day-pills">{DAYS.map((day, index) => <i className={employee.preferredDays.includes(index) ? 'active' : ''} key={day}>{day[0]}</i>)}</div></td><td><Badge tone={employee.status === 'active' ? 'success' : 'neutral'}><i className="status-dot" />{employee.status}</Badge></td><td><div className="row-actions"><button className="icon-button" title="Edit" onClick={(event) => { event.stopPropagation(); setEditing(employee) }}><Edit3 size={16} /></button><button className="icon-button danger-hover" title="Delete" onClick={(event) => { event.stopPropagation(); remove(employee) }}><Trash2 size={16} /></button></div></td></tr>)}</tbody></table>{!filtered.length && <EmptyState icon={<UsersRound />} title="No employees found" copy="Try a different search or role filter." />}</div>
    <EmployeeForm employee={editing === 'new' ? null : editing} open={editing !== null} onClose={() => setEditing(null)} onSave={save} />
    <EmployeeDetails employee={viewing} onClose={() => setViewing(null)} onEdit={(employee) => { setViewing(null); setEditing(employee) }} />
  </div>
}

function blankEmployee(): Employee {
  return { id: `emp-${Date.now().toString()}`, name: '', email: '', role: 'Sales Associate', contractedHours: 20, status: 'active', preferredDays: [0,1,2,3,4], availability: { 0:{start:'09:00',end:'18:00'},1:{start:'09:00',end:'18:00'},2:{start:'09:00',end:'18:00'},3:{start:'09:00',end:'18:00'},4:{start:'09:00',end:'18:00'},5:null,6:null }, leave: [], color: COLORS[Math.floor(Math.random() * COLORS.length)] }
}

function EmployeeForm({ employee, open, onClose, onSave }: { employee: Employee | null; open: boolean; onClose: () => void; onSave: (employee: Employee) => void }) {
  const [form, setForm] = useState<Employee>(() => employee ?? blankEmployee())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const currentKey = employee?.id ?? 'new'

  useEffect(() => { if (open) { setForm(employee ?? blankEmployee()); setErrors({}) } }, [currentKey, employee, open])
  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    if (form.name.trim().length < 2) nextErrors.name = 'Enter the employee’s full name.'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) nextErrors.email = 'Enter a valid work email.'
    if (form.contractedHours < 1 || form.contractedHours > 60) nextErrors.hours = 'Use a weekly contract between 1 and 60 hours.'
    setErrors(nextErrors)
    if (!Object.keys(nextErrors).length) onSave({ ...form, name: form.name.trim(), email: form.email.trim() })
  }
  return <Modal open={open} onClose={onClose} eyebrow={employee ? 'Edit profile' : 'New team member'} title={employee ? employee.name : 'Add employee'} wide>
    <form onSubmit={submit}>
      <div className="form-grid"><label className="field"><span>Full name</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Lena Hoffmann" />{errors.name && <em>{errors.name}</em>}</label><label className="field"><span>Work email</span><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="lena@company.com" />{errors.email && <em>{errors.email}</em>}</label><label className="field"><span>Role</span><select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as Role })}>{ROLES.map((role) => <option key={role}>{role}</option>)}</select></label><label className="field"><span>Contracted hours / week</span><input type="number" min="1" max="60" value={form.contractedHours} onChange={(event) => setForm({ ...form, contractedHours: Number(event.target.value) })} />{errors.hours && <em>{errors.hours}</em>}</label></div>
      <div className="field preferred-field"><span>Preferred working days</span><div className="choice-days">{DAYS.map((day, index) => <button type="button" className={form.preferredDays.includes(index) ? 'selected' : ''} key={day} onClick={() => setForm({ ...form, preferredDays: form.preferredDays.includes(index) ? form.preferredDays.filter((item) => item !== index) : [...form.preferredDays, index] })}>{day.slice(0,3)}</button>)}</div></div>
      <div className="form-row-space"><Toggle checked={form.status === 'active'} onChange={(active) => setForm({ ...form, status: active ? 'active' : 'inactive' })} label="Active employee" /><div className="avatar-picker"><span>Avatar color</span>{COLORS.slice(0,6).map((color) => <button type="button" className={form.color === color ? 'active' : ''} style={{ background: color }} key={color} onClick={() => setForm({ ...form, color })} />)}</div></div>
      <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button"><Check size={17} />Save employee</button></div>
    </form>
  </Modal>
}

function EmployeeDetails({ employee, onClose, onEdit }: { employee: Employee | null; onClose: () => void; onEdit: (employee: Employee) => void }) {
  if (!employee) return null
  return <Modal open onClose={onClose} eyebrow="Employee profile" title={employee.name}>
    <div className="profile-hero"><Avatar name={employee.name} color={employee.color} size="lg" /><div><Badge tone={employee.status === 'active' ? 'success' : 'neutral'}>{employee.status}</Badge><h3>{employee.role}</h3><span><Mail size={14} />{employee.email}</span></div></div>
    <div className="detail-stats"><div><span>Weekly contract</span><strong>{employee.contractedHours}h</strong></div><div><span>Available days</span><strong>{Object.values(employee.availability).filter(Boolean).length}</strong></div><div><span>Leave entries</span><strong>{employee.leave.length}</strong></div></div>
    <div className="detail-section"><h3>Preferred days</h3><div className="choice-days readonly">{DAYS.map((day,index) => <span className={employee.preferredDays.includes(index) ? 'selected' : ''} key={day}>{day.slice(0,3)}</span>)}</div></div>
    <div className="modal-actions"><button className="secondary-button" onClick={onClose}>Close</button><button className="primary-button" onClick={() => onEdit(employee)}><Edit3 size={16} />Edit profile</button></div>
  </Modal>
}

function AvailabilityPage({ employees, weekStart, onChange, notify }: { employees: Employee[]; weekStart: string; onChange: (employees: Employee[]) => void; notify: (message: string) => void }) {
  const [selectedId, setSelectedId] = useState(employees[0]?.id ?? '')
  const [leaveOpen, setLeaveOpen] = useState(false)
  const selected = employees.find((employee) => employee.id === selectedId) ?? employees[0]
  const updateSelected = (employee: Employee) => onChange(employees.map((item) => item.id === employee.id ? employee : item))
  if (!selected) return <div className="page"><EmptyState icon={<UsersRound />} title="No employees yet" copy="Add an employee before configuring availability." /></div>
  return <div className="page">
    <PageHeader eyebrow="Time & attendance" title="Availability and leave" copy="Set recurring availability and track exceptions in one place." actions={<button className="primary-button" onClick={() => setLeaveOpen(true)}><Plus size={17} />Add time off</button>} />
    <div className="availability-layout">
      <aside className="card employee-selector"><div className="mini-search"><Search size={16} /><span>Team members</span></div>{employees.map((employee) => <button className={selected.id === employee.id ? 'selected' : ''} key={employee.id} onClick={() => setSelectedId(employee.id)}><Avatar name={employee.name} color={employee.color} size="sm" /><div><strong>{employee.name}</strong><span>{employee.role}</span></div><ChevronDown size={15} /></button>)}</aside>
      <section className="card availability-card"><div className="availability-head"><div className="person-cell"><Avatar name={selected.name} color={selected.color} /><div><h2>{selected.name}</h2><span>{selected.role} · {selected.contractedHours}h contract</span></div></div><Badge tone="success"><Check size={13} />Auto-save on</Badge></div>
        <div className="availability-table"><div className="availability-row availability-labels"><span>Day</span><span>Available</span><span>From</span><span>Until</span><span>Preference</span></div>{DAYS.map((day, index) => { const window = selected.availability[index]; return <div className={`availability-row ${!window ? 'disabled' : ''}`} key={day}><div><strong>{day}</strong><small>{new Date(`${dateForDay(weekStart,index)}T12:00:00`).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</small></div><button className={`toggle ${window ? 'on' : ''}`} onClick={() => { updateSelected({ ...selected, availability: { ...selected.availability, [index]: window ? null : { start:'09:00', end:'18:00' } } }); notify('Availability updated') }}><span /></button><input type="time" value={window?.start ?? '09:00'} disabled={!window} onChange={(event) => window && updateSelected({ ...selected, availability: { ...selected.availability, [index]: { ...window, start:event.target.value } } })} /><input type="time" value={window?.end ?? '18:00'} disabled={!window} onChange={(event) => window && updateSelected({ ...selected, availability: { ...selected.availability, [index]: { ...window, end:event.target.value } } })} /><button className={`preference-star ${selected.preferredDays.includes(index) ? 'active' : ''}`} onClick={() => updateSelected({ ...selected, preferredDays: selected.preferredDays.includes(index) ? selected.preferredDays.filter((item) => item !== index) : [...selected.preferredDays,index] })} title="Preferred day">★</button></div> })}</div>
      </section>
    </div>
    <section className="card leave-management"><div className="card-header"><div><h2>Leave and blocked periods</h2><p>Exceptions for {selected.name}</p></div><Badge tone="neutral">{selected.leave.length} entries</Badge></div>{selected.leave.length ? <div className="leave-table">{selected.leave.map((leave) => <div className="leave-record" key={leave.id}><span className={`leave-symbol ${leave.type}`}><LeaveIcon type={leave.type} /></span><div><strong>{leave.note || leave.type}</strong><span>{leave.startDate === leave.endDate ? leave.startDate : `${leave.startDate} → ${leave.endDate}`} {leave.startTime && `· ${leave.startTime}–${leave.endTime}`}</span></div><Badge tone={leave.type === 'sick' ? 'danger' : leave.type === 'vacation' ? 'purple' : 'blue'}>{leave.type}</Badge><button className="icon-button danger-hover" onClick={() => { updateSelected({ ...selected, leave:selected.leave.filter((item) => item.id !== leave.id) }); notify('Leave entry removed') }}><Trash2 size={16} /></button></div>)}</div> : <EmptyState icon={<CalendarDays />} title="No exceptions recorded" copy="Recurring weekly availability applies without any leave overrides." />}</section>
    <LeaveForm open={leaveOpen} onClose={() => setLeaveOpen(false)} weekStart={weekStart} onSave={(leave) => { updateSelected({ ...selected, leave:[...selected.leave, leave] }); setLeaveOpen(false); notify('Time off added') }} />
  </div>
}

function LeaveIcon({ type }: { type: LeavePeriod['type'] }) { return type === 'sick' ? <HeartPulse size={18} /> : type === 'meeting' ? <BriefcaseBusiness size={18} /> : <CalendarDays size={18} /> }

function LeaveForm({ open, onClose, weekStart, onSave }: { open: boolean; onClose: () => void; weekStart: string; onSave: (leave: LeavePeriod) => void }) {
  const [type, setType] = useState<LeavePeriod['type']>('vacation')
  const [startDate, setStartDate] = useState(weekStart)
  const [endDate, setEndDate] = useState(weekStart)
  const [note, setNote] = useState('')
  const [timed, setTimed] = useState(false)
  return <Modal open={open} onClose={onClose} eyebrow="Availability exception" title="Add time off or blocked time"><form onSubmit={(event) => { event.preventDefault(); if (endDate < startDate) return; onSave({ id:`leave-${Date.now()}`, type, startDate, endDate, note:note.trim() || undefined, ...(timed ? { startTime:'10:00', endTime:'12:00' } : {}) }) }}><div className="field"><span>Type</span><select value={type} onChange={(event) => setType(event.target.value as LeavePeriod['type'])}><option value="vacation">Vacation</option><option value="sick">Sick leave</option><option value="meeting">Meeting</option><option value="unavailable">Unavailable</option></select></div><div className="form-grid"><label className="field"><span>Start date</span><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><label className="field"><span>End date</span><input type="date" min={startDate} value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label></div><label className="field"><span>Note</span><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional context" /></label><Toggle checked={timed} onChange={setTimed} label="This is a partial-day event (10:00–12:00)" /><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button">Add entry</button></div></form></Modal>
}

function SettingsPage({ settings, onSave }: { settings: BusinessSettings; onSave: (settings: BusinessSettings) => void }) {
  const [form, setForm] = useState(settings)
  const timezone = form.country === 'Germany' ? 'Europe/Berlin' : form.country === 'United States' ? 'America/New_York' : 'Europe/London'
  return <div className="page settings-page"><PageHeader eyebrow="Workspace configuration" title="Business settings" copy="Configure operating hours, coverage targets, and scheduling guardrails." />
    <form onSubmit={(event) => { event.preventDefault(); onSave({ ...form, timezone }) }}>
      <section className="card settings-section"><div className="section-heading"><span><Building2 /></span><div><h2>Business profile</h2><p>Used throughout schedules and exports.</p></div></div><div className="form-grid three"><label className="field"><span>Business name</span><input required value={form.name} onChange={(event) => setForm({ ...form, name:event.target.value })} /></label><label className="field"><span>Country / jurisdiction</span><select value={form.country} onChange={(event) => setForm({ ...form, country:event.target.value as BusinessSettings['country'] })}><option>Germany</option><option>United States</option><option>United Kingdom</option></select></label><label className="field"><span>Timezone</span><input value={timezone} disabled /></label></div></section>
      <section className="card settings-section"><div className="section-heading"><span><Clock3 /></span><div><h2>Opening hours & coverage</h2><p>Define customer-facing hours and the minimum team on the floor.</p></div></div><div className="opening-table"><div className="opening-row labels"><span>Day</span><span>Open</span><span>Starts</span><span>Ends</span><span>Minimum staff</span></div>{DAYS.map((day,index) => { const opening = form.openingHours[index]; return <div className={`opening-row ${opening.open ? '' : 'disabled'}`} key={day}><strong>{day}</strong><button type="button" className={`toggle ${opening.open ? 'on' : ''}`} onClick={() => setForm({ ...form, openingHours:{ ...form.openingHours,[index]:{ ...opening,open:!opening.open } } })}><span /></button><input type="time" disabled={!opening.open} value={opening.start} onChange={(event) => setForm({ ...form, openingHours:{ ...form.openingHours,[index]:{ ...opening,start:event.target.value } } })} /><input type="time" disabled={!opening.open} value={opening.end} onChange={(event) => setForm({ ...form, openingHours:{ ...form.openingHours,[index]:{ ...opening,end:event.target.value } } })} /><input type="number" min="1" max="20" disabled={!opening.open} value={opening.minimumStaff} onChange={(event) => setForm({ ...form, openingHours:{ ...form.openingHours,[index]:{ ...opening,minimumStaff:Number(event.target.value) } } })} /></div> })}</div></section>
      <section className="settings-split"><div className="card settings-section"><div className="section-heading"><span><UsersRound /></span><div><h2>Role coverage</h2><p>Required on each coverage window.</p></div></div>{(['Store Manager','Cashier'] as Role[]).map((role) => <div className="counter-row" key={role}><div><strong>{role}</strong><span>Minimum per shift</span></div><div><button type="button" onClick={() => setForm({ ...form,roleRequirements:{ ...form.roleRequirements,[role]:Math.max(0,(form.roleRequirements[role] ?? 0)-1) } })}>−</button><strong>{form.roleRequirements[role] ?? 0}</strong><button type="button" onClick={() => setForm({ ...form,roleRequirements:{ ...form.roleRequirements,[role]:(form.roleRequirements[role] ?? 0)+1 } })}>+</button></div></div>)}</div>
        <div className="card settings-section"><div className="section-heading"><span><Settings2 /></span><div><h2>Scheduling guardrails</h2><p>Heuristic targets used by generation.</p></div></div><label className="range-field"><span><strong>Default shift length</strong><em>{form.defaultShiftLength}h</em></span><input type="range" min="4" max="8" step="0.5" value={form.defaultShiftLength} onChange={(event) => setForm({ ...form,defaultShiftLength:Number(event.target.value) })} /></label><label className="range-field"><span><strong>Maximum shift length</strong><em>{form.maxShiftLength}h</em></span><input type="range" min="6" max="12" step="0.5" value={form.maxShiftLength} onChange={(event) => setForm({ ...form,maxShiftLength:Number(event.target.value),maxDailyHours:Number(event.target.value) })} /></label></div></section>
      <div className="compliance-banner"><ShieldAlert size={19} /><div><strong>Demo compliance rules only</strong><p>Final schedules should be reviewed against applicable employment law and company policy.</p></div></div><div className="settings-save"><span>Changes affect the next generated schedule.</span><button className="primary-button"><Check size={17} />Save settings</button></div>
    </form>
  </div>
}

function SchedulePage({ employees, settings, schedule, onSchedule, onGenerate, onWeekChange, notify }: { employees: Employee[]; settings: BusinessSettings; schedule: ScheduleResult; onSchedule: (schedule: ScheduleResult | ((current: ScheduleResult) => ScheduleResult)) => void; onGenerate: () => void; onWeekChange: (week: string) => void; notify: (message: string) => void }) {
  const [roleFilter, setRoleFilter] = useState('All roles')
  const [employeeFilter, setEmployeeFilter] = useState('All employees')
  const [shiftModal, setShiftModal] = useState<Shift | 'new' | null>(null)
  const [showAssistant, setShowAssistant] = useState(true)
  const [tab, setTab] = useState<'roster' | 'analysis'>('roster')
  const visibleShifts = schedule.shifts.filter((shift) => { const employee = employees.find((item) => item.id === shift.employeeId); return employee && (roleFilter === 'All roles' || employee.role === roleFilter) && (employeeFilter === 'All employees' || employee.id === employeeFilter) })
  const changeWeek = (direction: number) => { const date = new Date(`${schedule.weekStart}T12:00:00`); date.setDate(date.getDate() + direction * 7); onWeekChange(toISODate(date)) }
  const saveShift = (shift: Shift) => {
    const exists = schedule.shifts.some((item) => item.id === shift.id)
    const matchedGap = !exists ? schedule.gaps.findIndex((gap) => gap.dayIndex === shift.dayIndex && gap.start < shift.end && gap.end > shift.start) : -1
    const gaps = [...schedule.gaps]
    if (matchedGap >= 0) {
      if (gaps[matchedGap].missing > 1) gaps[matchedGap] = { ...gaps[matchedGap], missing: gaps[matchedGap].missing - 1 }
      else gaps.splice(matchedGap, 1)
    }
    const next = { ...schedule, gaps, shifts: exists ? schedule.shifts.map((item) => item.id === shift.id ? shift : item) : [...schedule.shifts, shift] }
    onSchedule(refreshCompliance(next, employees, settings)); setShiftModal(null); notify(exists ? 'Shift updated' : 'Shift added')
  }
  const deleteShift = (shift: Shift) => { if (!window.confirm('Delete this shift?')) return; onSchedule({ ...schedule, shifts:schedule.shifts.filter((item) => item.id !== shift.id) }); setShiftModal(null); notify('Shift deleted') }
  const moveShift = (shiftId: string, dayIndex: number) => {
    const date = dateForDay(schedule.weekStart, dayIndex)
    const next = { ...schedule, shifts:schedule.shifts.map((shift) => shift.id === shiftId ? { ...shift,dayIndex,date,id:`${shift.id}-m${dayIndex}` } : shift) }
    onSchedule(refreshCompliance(next,employees,settings)); notify(`Shift moved to ${DAYS[dayIndex]}`)
  }
  return <div className={`page schedule-page ${showAssistant ? 'with-assistant' : ''}`}>
    <PageHeader eyebrow="AI scheduling workspace" title="Weekly schedule" copy={`${formatWeek(schedule.weekStart)} · ${settings.timezone}`} actions={<><button className="secondary-button assistant-toggle" onClick={() => setShowAssistant(!showAssistant)}><Bot size={17} />{showAssistant ? 'Hide assistant' : 'Ask assistant'}</button><button className="secondary-button" onClick={() => setShiftModal('new')}><Plus size={17} />Add shift</button><button className="primary-button" onClick={onGenerate}><RotateCcw size={16} />Regenerate</button></>} />
    <div className="schedule-tabs"><button className={tab === 'roster' ? 'active' : ''} onClick={() => setTab('roster')}><CalendarDays size={16} />Roster</button><button className={tab === 'analysis' ? 'active' : ''} onClick={() => setTab('analysis')}><BarChart3 size={16} />Analysis</button></div>
    <div className="schedule-layout"><section className="schedule-main">
      <div className="schedule-toolbar card"><div className="week-switcher"><button className="icon-button" onClick={() => changeWeek(-1)}><ArrowLeft size={16} /></button><strong>{formatWeek(schedule.weekStart)}</strong><button className="icon-button" onClick={() => changeWeek(1)}><ArrowRight size={16} /></button></div><div className="schedule-filters"><select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}><option>All roles</option>{ROLES.map((role) => <option key={role}>{role}</option>)}</select><select value={employeeFilter} onChange={(event) => setEmployeeFilter(event.target.value)}><option>All employees</option>{employees.map((employee) => <option value={employee.id} key={employee.id}>{employee.name}</option>)}</select></div></div>
      {tab === 'roster' ? <Roster schedule={schedule} shifts={visibleShifts} employees={employees} settings={settings} onEdit={setShiftModal} onMove={moveShift} /> : <Analysis schedule={schedule} employees={employees} settings={settings} />}
    </section>{showAssistant && <AssistantPanel schedule={schedule} employees={employees} settings={settings} onSchedule={onSchedule} />}</div>
    <ShiftForm open={shiftModal !== null} shift={shiftModal === 'new' ? null : shiftModal} employees={employees} weekStart={schedule.weekStart} onClose={() => setShiftModal(null)} onSave={saveShift} onDelete={deleteShift} />
  </div>
}

function Roster({ schedule, shifts, employees, settings, onEdit, onMove }: { schedule: ScheduleResult; shifts: Shift[]; employees: Employee[]; settings: BusinessSettings; onEdit: (shift: Shift) => void; onMove: (shiftId: string, dayIndex: number) => void }) {
  return <div className="roster-wrap card">
    <div className="roster-grid">
      {DAYS.map((day, dayIndex) => {
        const dayShifts = shifts.filter((shift) => shift.dayIndex === dayIndex).sort((a, b) => a.start.localeCompare(b.start))
        const gaps = schedule.gaps.filter((gap) => gap.dayIndex === dayIndex)
        const opening = settings.openingHours[dayIndex]
        return <div className={`day-column ${!opening.open ? 'closed' : ''}`} key={day} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { const id = event.dataTransfer.getData('text/plain'); if (id) onMove(id, dayIndex) }}>
          <header><div><strong>{day.slice(0, 3)}</strong><span>{new Date(`${dateForDay(schedule.weekStart, dayIndex)}T12:00:00`).getDate()}</span></div>{opening.open ? <small>{opening.start}–{opening.end}</small> : <Badge tone="neutral">Closed</Badge>}</header>
          <div className="day-content">
            {dayShifts.map((shift) => {
              const employee = employees.find((item) => item.id === shift.employeeId)
              if (!employee) return null
              return <button draggable onDragStart={(event) => event.dataTransfer.setData('text/plain', shift.id)} className={`shift-card shift-${shift.source} ${shift.warnings.length ? 'has-warning' : ''}`} style={{ '--employee': employee.color } as React.CSSProperties} key={shift.id} onClick={() => onEdit(shift)}>
                <div className="shift-time"><Clock3 size={12} />{shift.start}–{shift.end}</div>
                <div className="shift-person"><Avatar name={employee.name} color={employee.color} size="sm" /><div><strong>{employee.name.split(' ')[0]}</strong><span>{employee.role}</span></div></div>
                <div className="shift-foot"><span>{formatHours(hoursBetween(shift.start, shift.end))}</span>{shift.warnings.length ? <AlertTriangle size={14} /> : <i />}</div>
              </button>
            })}
            {gaps.map((gap, index) => <div className="gap-card" key={`${gap.start}-${index}`}><AlertTriangle size={15} /><div><strong>{gap.missing} open {gap.role ? gap.role.toLowerCase() : 'spot'}{gap.missing > 1 ? 's' : ''}</strong><span>{gap.start}–{gap.end}</span></div></div>)}
            {opening.open && !dayShifts.length && <div className="day-empty">No shifts</div>}
            {!opening.open && <div className="closed-message">Store closed</div>}
          </div>
        </div>
      })}
    </div>
    <div className="roster-legend"><span><i className="legend-line generated" />AI generated</span><span><i className="legend-line manual" />Manual shift</span><span><AlertTriangle size={13} />Rule warning</span><span><i className="gap-box" />Understaffed</span><em>Tip: drag a shift card to another day</em></div>
  </div>
}

function Analysis({ schedule, employees, settings }: { schedule: ScheduleResult; employees: Employee[]; settings: BusinessSettings }) {
  const metrics = scheduleMetrics(schedule,employees,settings)
  return <div className="analysis-stack"><div className="analysis-metrics"><div className="card"><span>Staffing coverage</span><strong>{metrics.coverage}%</strong><div className="progress"><i style={{ width:`${metrics.coverage}%` }} /></div></div><div className="card"><span>Total labor</span><strong>{formatHours(metrics.totalHours)}</strong><small>{schedule.shifts.length} shifts</small></div><div className="card"><span>Unresolved gaps</span><strong>{metrics.missing}</strong><small>{metrics.missing ? 'Review suggested' : 'Fully staffed'}</small></div><div className="card"><span>Fairness score</span><strong>{metrics.fairness}</strong><small>out of 100</small></div></div><div className="card table-card"><div className="card-header padded"><div><h2>Contract hours analysis</h2><p>Scheduled hours compared with weekly targets.</p></div></div><table><thead><tr><th>Employee</th><th>Contracted</th><th>Scheduled</th><th>Difference</th><th>Status</th></tr></thead><tbody>{employees.filter((employee) => employee.status==='active').map((employee) => { const hours=scheduledHours(schedule,employee.id); const difference=hours-employee.contractedHours; const status=employeeStatus(employee,schedule); return <tr key={employee.id}><td><div className="person-cell"><Avatar name={employee.name} color={employee.color} size="sm" /><div><strong>{employee.name}</strong><span>{employee.role}</span></div></div></td><td>{employee.contractedHours}h</td><td><strong>{hours.toFixed(1)}h</strong></td><td className={difference < -2 ? 'negative' : difference > 2 ? 'positive' : ''}>{difference>0?'+':''}{difference.toFixed(1)}h</td><td><Badge tone={status==='Good'?'success':status==='Conflict'?'danger':'warning'}>{status}</Badge></td></tr> })}</tbody></table></div><div className="card explanation-card"><div className="sparkle-dot"><Sparkles size={17} /></div><div><h3>How this schedule was built</h3>{schedule.explanation.map((line,index) => <p key={index}>{line}</p>)}</div></div><p className="legal-note"><ShieldAlert size={15} /> Demo compliance rules only. Final schedules should be reviewed against applicable employment law and company policy.</p></div>
}

function ShiftForm({ open, shift, employees, weekStart, onClose, onSave, onDelete }: { open: boolean; shift: Shift | null; employees: Employee[]; weekStart: string; onClose: () => void; onSave: (shift: Shift) => void; onDelete: (shift: Shift) => void }) {
  const [employeeId,setEmployeeId]=useState(shift?.employeeId ?? employees[0]?.id ?? '')
  const [dayIndex,setDayIndex]=useState(shift?.dayIndex ?? 0)
  const [start,setStart]=useState(shift?.start ?? '09:00')
  const [end,setEnd]=useState(shift?.end ?? '14:30')
  const [error,setError]=useState('')
  const key=shift?.id ?? 'new'
  useEffect(() => { if (open) { setEmployeeId(shift?.employeeId ?? employees[0]?.id ?? ''); setDayIndex(shift?.dayIndex ?? 0); setStart(shift?.start ?? '09:00'); setEnd(shift?.end ?? '14:30'); setError('') } },[key, shift, employees, open])
  return <Modal open={open} onClose={onClose} eyebrow={shift?'Manual adjustment':'Schedule editor'} title={shift?'Edit shift':'Add a shift'}><form onSubmit={(event) => { event.preventDefault(); if(start>=end){setError('End time must be after start time.');return} onSave({ id:shift?.id ?? `manual-${Date.now()}`,employeeId,dayIndex,date:dateForDay(weekStart,dayIndex),start,end,source:'manual',warnings:[] }) }}><label className="field"><span>Employee</span><select value={employeeId} onChange={(event)=>setEmployeeId(event.target.value)}>{employees.filter((employee)=>employee.status==='active').map((employee)=><option value={employee.id} key={employee.id}>{employee.name} · {employee.role}</option>)}</select></label><label className="field"><span>Day</span><select value={dayIndex} onChange={(event)=>setDayIndex(Number(event.target.value))}>{DAYS.map((day,index)=><option value={index} key={day}>{day} · {dateForDay(weekStart,index)}</option>)}</select></label><div className="form-grid"><label className="field"><span>Starts</span><input type="time" value={start} onChange={(event)=>setStart(event.target.value)} /></label><label className="field"><span>Ends</span><input type="time" value={end} onChange={(event)=>setEnd(event.target.value)} /></label></div>{error&&<div className="form-error"><AlertTriangle size={15} />{error}</div>}{shift?.warnings.length ? <div className="warning-list">{shift.warnings.map((warning)=><p key={warning}><AlertTriangle size={14} />{warning}</p>)}</div>:null}<div className="modal-actions between">{shift?<button type="button" className="danger-button" onClick={()=>onDelete(shift)}><Trash2 size={16} />Delete</button>:<span />}<div><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button">Save shift</button></div></div></form></Modal>
}

function AssistantPanel({ schedule, employees, settings, onSchedule }: { schedule: ScheduleResult; employees: Employee[]; settings: BusinessSettings; onSchedule: (schedule: ScheduleResult) => void }) {
  const [messages,setMessages]=useState<ChatMessage[]>([{ id:'welcome',sender:'assistant',text:'I’ve reviewed this week’s schedule. Ask about availability, coverage, contract hours, or let me make a focused change.',timestamp:new Date().toISOString() }])
  const [query,setQuery]=useState('')
  const suggestions=['Why is Sarah not working Tuesday?','Who can cover Friday evening?','Who is below contracted hours?','Are there any scheduling conflicts?']
  const send=(text:string)=>{ if(!text.trim())return; const user:ChatMessage={id:`u-${Date.now()}`,sender:'user',text:text.trim(),timestamp:new Date().toISOString()}; const result=handleAssistant(text,schedule,employees,settings); const assistant:ChatMessage={id:`a-${Date.now()}`,sender:'assistant',text:result.text,timestamp:new Date().toISOString()}; setMessages((current)=>[...current,user,assistant]); if(result.schedule)onSchedule(result.schedule); setQuery('') }
  return <aside className="assistant-panel card"><header><div className="assistant-brand"><span><Bot size={18} /></span><div><strong>Nova Assistant</strong><small><i />Schedule-aware</small></div></div><Sparkles size={16} /></header><div className="chat-scroll">{messages.map((message)=><div className={`chat-message ${message.sender}`} key={message.id}>{message.sender==='assistant'&&<div className="chat-avatar"><Sparkles size={13} /></div>}<div><p>{message.text}</p><span>{new Date(message.timestamp).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span></div></div>)}{messages.length===1&&<div className="suggestions"><span>Try asking</span>{suggestions.map((suggestion)=><button key={suggestion} onClick={()=>send(suggestion)}>{suggestion}</button>)}</div>}</div><form className="chat-input" onSubmit={(event)=>{event.preventDefault();send(query)}}><textarea rows={2} value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Ask about this schedule…" onKeyDown={(event)=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();send(query)}}} /><button aria-label="Send"><Send size={16} /></button><span><MessageSquareText size={12} />Uses live schedule data</span></form></aside>
}

function GenerationOverlay({ step }: { step: number }) {
  return <div className="generation-backdrop"><div className="generation-card"><div className="orb"><Sparkles size={24} /><i /><i /><i /></div><p className="eyebrow">NovaShift intelligence</p><h2>Building your best week</h2><div className="generation-steps">{GENERATION_STEPS.map((label,index)=><div className={index<step?'done':index===step?'active':''} key={label}><span>{index<step?<Check size={14}/>:index===step?<LoaderCircle size={14}/>:index+1}</span><p>{label}</p></div>)}</div></div></div>
}

export default App
