import type { BusinessSettings, Employee, ScheduleResult, Shift } from '../types'
import { DAYS } from '../types'
import { scheduledHours } from './analysis'
import { applyComplianceRules } from './rules'
import { fromMinutes, hoursBetween, overlaps, toMinutes } from './time'
import { isAvailable } from './scheduler'

export interface AssistantResult { text: string; schedule?: ScheduleResult; action?: string }

function employeeByQuery(query: string, employees: Employee[]): Employee | undefined {
  const normalized = query.toLowerCase()
  return employees.find((employee) => employee.name.toLowerCase().split(' ').some((part) => part.length > 2 && normalized.includes(part)))
}

function dayByQuery(query: string): number | undefined {
  const index = DAYS.findIndex((day) => query.toLowerCase().includes(day.toLowerCase()))
  return index >= 0 ? index : undefined
}

function availableCover(dayIndex: number, start: string, end: string, schedule: ScheduleResult, employees: Employee[]): Employee[] {
  const date = schedule.weekStart ? (() => {
    const day = new Date(`${schedule.weekStart}T12:00:00`)
    day.setDate(day.getDate() + dayIndex)
    return day.toISOString().slice(0, 10)
  })() : ''
  return employees.filter((employee) => isAvailable(employee, dayIndex, date, start, end) && !schedule.shifts.some((shift) => shift.employeeId === employee.id && shift.dayIndex === dayIndex && overlaps(start, end, shift.start, shift.end)))
    .sort((a, b) => (a.contractedHours - scheduledHours(schedule, a.id)) - (b.contractedHours - scheduledHours(schedule, b.id))).reverse()
}

export function handleAssistant(query: string, schedule: ScheduleResult, employees: Employee[], settings: BusinessSettings): AssistantResult {
  const normalized = query.toLowerCase()
  const employee = employeeByQuery(query, employees)
  const dayIndex = dayByQuery(query)

  if ((normalized.includes('regenerate') || normalized.includes('more coverage')) && dayIndex !== undefined) {
    const opening = settings.openingHours[dayIndex]
    if (!opening.open) return { text: `${DAYS[dayIndex]} is currently configured as closed, so I left it unchanged.` }
    const openingMinutes = toMinutes(opening.end) - toMinutes(opening.start)
    const split = fromMinutes(toMinutes(opening.start) + Math.min(settings.defaultShiftLength * 60, openingMinutes - 4 * 60))
    const windows = [{ start: opening.start, end: split }, { start: split, end: opening.end }]
    const added: Shift[] = []
    let working: ScheduleResult = { ...schedule, shifts: [...schedule.shifts] }
    for (const window of windows) {
      const candidates = availableCover(dayIndex, window.start, window.end, working, employees)
        .filter((item) => scheduledHours(working, item.id) + hoursBetween(window.start, window.end) <= item.contractedHours + 6)
      const selected = candidates[0]
      if (selected) {
        const shift: Shift = { id: `assistant-${Date.now()}-${window.start}`, employeeId: selected.id, dayIndex, date: dateForScheduleDay(schedule, dayIndex), start: window.start, end: window.end, source: 'manual', warnings: [] }
        added.push(shift)
        working = { ...working, shifts: [...working.shifts, shift] }
      }
    }
    if (!added.length) return { text: `I couldn’t add safe ${DAYS[dayIndex]} coverage without creating an availability conflict or pushing someone too far over target.` }
    const gaps = [...schedule.gaps]
    for (const shift of added) {
      const match = gaps.findIndex((gap) => gap.dayIndex === dayIndex && gap.start < shift.end && gap.end > shift.start)
      if (match >= 0) gaps[match].missing > 1 ? gaps.splice(match, 1, { ...gaps[match], missing: gaps[match].missing - 1 }) : gaps.splice(match, 1)
    }
    const next = { ...schedule, gaps, shifts: applyComplianceRules([...schedule.shifts, ...added], employees, settings) }
    return { text: `I added ${added.length} extra ${DAYS[dayIndex]} shift${added.length === 1 ? '' : 's'} for ${added.map((shift) => employees.find((item) => item.id === shift.employeeId)?.name).join(' and ')}. Coverage and rule checks are updated.`, schedule: next, action: 'coverage_added' }
  }

  if (normalized.includes('below') || normalized.includes('under') && normalized.includes('hour')) {
    const under = employees.filter((item) => item.status === 'active' && scheduledHours(schedule, item.id) < item.contractedHours - 2)
      .sort((a, b) => (a.contractedHours - scheduledHours(schedule, a.id)) - (b.contractedHours - scheduledHours(schedule, b.id))).reverse()
    return { text: under.length ? under.map((item) => `${item.name} is ${(item.contractedHours - scheduledHours(schedule, item.id)).toFixed(1)}h below contract`).join('. ') + '.' : 'Everyone is within two hours of their contracted target.' }
  }

  if (normalized.includes('conflict') || normalized.includes('warning')) {
    const warnings = schedule.shifts.flatMap((shift) => shift.warnings.map((warning) => ({ shift, warning })))
    const gapCount = schedule.gaps.reduce((sum, gap) => sum + gap.missing, 0)
    if (!warnings.length && !gapCount) return { text: 'No compliance warnings or unresolved staffing gaps are currently detected.' }
    return { text: `I found ${warnings.length} shift warning${warnings.length === 1 ? '' : 's'} and ${gapCount} unresolved staffing requirement${gapCount === 1 ? '' : 's'}. Open the Analysis panel for employee-level details.` }
  }

  if ((normalized.includes('cover') || normalized.includes('available')) && dayIndex !== undefined) {
    const evening = normalized.includes('evening')
    const opening = settings.openingHours[dayIndex]
    const start = evening ? '15:00' : opening.start
    const end = opening.end
    const candidates = availableCover(dayIndex, start, end, schedule, employees)
    return { text: candidates.length ? `${candidates.slice(0, 3).map((item) => `${item.name} (${item.role}, ${Math.max(0, item.contractedHours - scheduledHours(schedule, item.id)).toFixed(1)}h below target)`).join(', ')} can cover ${DAYS[dayIndex]} ${evening ? 'evening' : ''}.` : `No one is fully available and conflict-free for that ${DAYS[dayIndex]} window.` }
  }

  if (normalized.includes('why') && employee && dayIndex !== undefined) {
    const opening = settings.openingHours[dayIndex]
    const date = new Date(`${schedule.weekStart}T12:00:00`)
    date.setDate(date.getDate() + dayIndex)
    const dateString = date.toISOString().slice(0, 10)
    const hasShift = schedule.shifts.some((shift) => shift.employeeId === employee.id && shift.dayIndex === dayIndex)
    if (hasShift) return { text: `${employee.name} is already scheduled on ${DAYS[dayIndex]}.` }
    const leave = employee.leave.find((period) => dateString >= period.startDate && dateString <= period.endDate)
    if (leave) return { text: `${employee.name} was not assigned on ${DAYS[dayIndex]} because ${leave.type === 'unavailable' ? 'they are marked unavailable' : `they have ${leave.type}`} (${leave.note ?? 'no additional note'}).` }
    const availability = employee.availability[dayIndex]
    if (!availability) return { text: `${employee.name} has no availability set for ${DAYS[dayIndex]}.` }
    return { text: `${employee.name} is available ${availability.start}–${availability.end}, but the scheduler prioritized colleagues further below their contracted hours while covering the ${opening.minimumStaff}-person staffing target.` }
  }

  if ((normalized.includes('reduce') || normalized.includes('remove')) && employee) {
    const employeeShifts = schedule.shifts.filter((shift) => shift.employeeId === employee.id).sort((a, b) => hoursBetween(b.start, b.end) - hoursBetween(a.start, a.end) || b.dayIndex - a.dayIndex)
    if (!employeeShifts.length) return { text: `${employee.name} has no shifts to reduce.` }
    const removed = employeeShifts[0]
    const shifts = applyComplianceRules(schedule.shifts.filter((shift) => shift.id !== removed.id), employees, settings)
    const gaps = [...schedule.gaps, { dayIndex: removed.dayIndex, start: removed.start, end: removed.end, missing: 1 }]
    return { text: `Done — I removed ${employee.name}'s ${DAYS[removed.dayIndex]} ${removed.start}–${removed.end} shift, reducing their week by ${hoursBetween(removed.start, removed.end).toFixed(1)}h. I flagged the resulting coverage gap.`, schedule: { ...schedule, shifts, gaps }, action: 'Schedule updated' }
  }

  if (!schedule.shifts.length) return { text: 'Generate a schedule first, then I can explain decisions, find cover, identify gaps, or rebalance hours.' }
  return { text: 'I can explain an assignment, find cover for a day, list under-hours employees, check conflicts, reduce someone’s hours, or regenerate a specific day with more coverage.' }
}

function dateForScheduleDay(schedule: ScheduleResult, dayIndex: number) {
  const date = new Date(`${schedule.weekStart}T12:00:00`)
  date.setDate(date.getDate() + dayIndex)
  return date.toISOString().slice(0, 10)
}
