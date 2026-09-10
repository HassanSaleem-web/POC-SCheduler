import type { BusinessSettings, Employee, Role, ScheduleResult, Shift, StaffingGap } from '../../types'
import { getMonday, toISODate } from '../../data/seed'
import { applyComplianceRules } from '../rules'
import { fromMinutes, hoursBetween, overlaps, toMinutes } from '../time'

const qualifiedFor = (employee: Employee, role: Role) => employee.role === role || (role === 'Store Manager' && employee.role === 'Supervisor')

export function isOnLeave(employee: Employee, date: string, start: string, end: string): boolean {
  return employee.leave.some((period) => {
    if (date < period.startDate || date > period.endDate) return false
    if (!period.startTime || !period.endTime) return true
    return overlaps(start, end, period.startTime, period.endTime)
  })
}

export function isAvailable(employee: Employee, dayIndex: number, date: string, start: string, end: string): boolean {
  const window = employee.availability[dayIndex]
  return employee.status === 'active' && !!window && toMinutes(window.start) <= toMinutes(start) && toMinutes(window.end) >= toMinutes(end) && !isOnLeave(employee, date, start, end)
}

function createSegments(start: string, end: string, preferredLength: number): Array<{ start: string; end: string }> {
  const opening = toMinutes(end) - toMinutes(start)
  if (opening <= preferredLength * 60) return [{ start, end }]
  const firstLength = Math.min(preferredLength * 60, opening - 4 * 60)
  const split = toMinutes(start) + Math.round(firstLength / 30) * 30
  return [{ start, end: fromMinutes(split) }, { start: fromMinutes(split), end }]
}

function employeeHours(shifts: Shift[], employeeId: string): number {
  return shifts.filter((shift) => shift.employeeId === employeeId).reduce((sum, shift) => sum + hoursBetween(shift.start, shift.end), 0)
}

function canAssign(employee: Employee, shifts: Shift[], dayIndex: number, date: string, start: string, end: string, settings: BusinessSettings): boolean {
  if (!isAvailable(employee, dayIndex, date, start, end)) return false
  const sameDay = shifts.filter((shift) => shift.employeeId === employee.id && shift.dayIndex === dayIndex)
  if (sameDay.some((shift) => overlaps(start, end, shift.start, shift.end))) return false
  const dayHours = sameDay.reduce((sum, shift) => sum + hoursBetween(shift.start, shift.end), 0) + hoursBetween(start, end)
  return dayHours <= settings.maxDailyHours
}

function rankCandidates(candidates: Employee[], shifts: Shift[], dayIndex: number, role?: Role): Employee[] {
  return [...candidates].sort((a, b) => {
    const score = (employee: Employee) => {
      const remaining = employee.contractedHours - employeeHours(shifts, employee.id)
      const preferred = employee.preferredDays.includes(dayIndex) ? 4 : 0
      const roleBonus = role && qualifiedFor(employee, role) ? 30 : 0
      return remaining * 2 + preferred + roleBonus
    }
    return score(b) - score(a) || a.name.localeCompare(b.name)
  })
}

export function generateSchedule(employees: Employee[], settings: BusinessSettings, weekStart = toISODate(getMonday())): ScheduleResult {
  let shifts: Shift[] = []
  const gaps: StaffingGap[] = []
  const monday = new Date(`${weekStart}T12:00:00`)

  for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
    const opening = settings.openingHours[dayIndex]
    if (!opening.open) continue
    const dateValue = new Date(monday)
    dateValue.setDate(monday.getDate() + dayIndex)
    const date = toISODate(dateValue)
    const segments = createSegments(opening.start, opening.end, settings.defaultShiftLength)

    for (const segment of segments) {
      const assigned = new Set<string>()
      const requiredRoles = Object.entries(settings.roleRequirements).filter(([, count]) => (count ?? 0) > 0) as Array<[Role, number]>

      const addEmployee = (employee: Employee) => {
        shifts.push({ id: `shift-${date}-${segment.start}-${employee.id}`, employeeId: employee.id, dayIndex, date, start: segment.start, end: segment.end, source: 'generated', warnings: [] })
        assigned.add(employee.id)
      }

      for (const [role, count] of requiredRoles) {
        for (let slot = 0; slot < count; slot += 1) {
          const candidates = employees.filter((employee) => !assigned.has(employee.id) && qualifiedFor(employee, role) && canAssign(employee, shifts, dayIndex, date, segment.start, segment.end, settings))
          const selected = rankCandidates(candidates, shifts, dayIndex, role)[0]
          if (selected) addEmployee(selected)
          else gaps.push({ dayIndex, start: segment.start, end: segment.end, missing: 1, role })
        }
      }

      const target = Math.max(opening.minimumStaff, assigned.size)
      while (assigned.size < target) {
        const candidates = employees.filter((employee) => !assigned.has(employee.id) && canAssign(employee, shifts, dayIndex, date, segment.start, segment.end, settings) && employeeHours(shifts, employee.id) + hoursBetween(segment.start, segment.end) <= employee.contractedHours + 8)
        const floorCandidates = candidates.filter((employee) => employee.role !== 'Store Manager' && employee.role !== 'Supervisor')
        const selected = rankCandidates(floorCandidates.length ? floorCandidates : candidates, shifts, dayIndex)[0]
        if (!selected) {
          gaps.push({ dayIndex, start: segment.start, end: segment.end, missing: target - assigned.size })
          break
        }
        addEmployee(selected)
      }
    }
  }

  shifts = applyComplianceRules(shifts, employees, settings)
  const understaffed = gaps.reduce((sum, gap) => sum + gap.missing, 0)
  const underHours = employees.filter((employee) => employee.status === 'active' && employeeHours(shifts, employee.id) < employee.contractedHours - 2)
  const explanation = [
    `Built ${shifts.length} shifts around opening hours, employee availability, leave, and role coverage.`,
    `Assignments prioritize employees furthest below contract hours, with a preference boost for requested working days.`,
    understaffed ? `${understaffed} staffing or role requirement${understaffed === 1 ? '' : 's'} remain unresolved.` : 'All minimum staffing requirements were filled.',
    underHours.length ? `${underHours.length} employee${underHours.length === 1 ? ' is' : 's are'} below contracted hours because demand or availability is limited.` : 'Contracted hours are balanced within the available demand.',
  ]
  return { shifts, gaps, explanation, generatedAt: new Date().toISOString(), weekStart }
}

export function refreshCompliance(schedule: ScheduleResult, employees: Employee[], settings: BusinessSettings): ScheduleResult {
  return { ...schedule, shifts: applyComplianceRules(schedule.shifts, employees, settings) }
}
