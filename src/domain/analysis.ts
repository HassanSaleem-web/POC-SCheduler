import type { BusinessSettings, Employee, ScheduleResult } from '../types'
import { hoursBetween } from './time'

export function scheduledHours(schedule: ScheduleResult, employeeId?: string): number {
  return schedule.shifts.filter((shift) => !employeeId || shift.employeeId === employeeId)
    .reduce((sum, shift) => sum + hoursBetween(shift.start, shift.end), 0)
}

export function employeeStatus(employee: Employee, schedule: ScheduleResult) {
  const hours = scheduledHours(schedule, employee.id)
  const hasWarning = schedule.shifts.some((shift) => shift.employeeId === employee.id && shift.warnings.some((warning) => !warning.toLowerCase().includes('break')))
  if (hasWarning) return 'Conflict' as const
  if (hours < employee.contractedHours - 2) return 'Under hours' as const
  if (hours > employee.contractedHours + 2) return 'Over hours' as const
  return 'Good' as const
}

export function scheduleAnalysis(schedule: ScheduleResult, employees: Employee[], settings: BusinessSettings) {
  const totalHours = scheduledHours(schedule)
  const missing = schedule.gaps.reduce((sum, gap) => sum + gap.missing, 0)
  const required = Object.values(settings.openingHours).reduce((sum, day) => {
    if (!day.open) return sum
    const windows = Math.max(1, Math.ceil(hoursBetween(day.start, day.end) / settings.defaultShiftLength))
    return sum + day.minimumStaff * windows
  }, 0)
  const coverage = required ? Math.max(0, Math.round(((required - missing) / required) * 100)) : 100
  const warningCount = schedule.shifts.reduce((sum, shift) => sum + shift.warnings.length, 0)
  const active = employees.filter((employee) => employee.status === 'active')
  const differences = active.map((employee) => Math.abs(scheduledHours(schedule, employee.id) - employee.contractedHours) / Math.max(employee.contractedHours, 1))
  const fairness = Math.max(0, Math.round(100 - (differences.reduce((sum, value) => sum + value, 0) / Math.max(differences.length, 1)) * 60))
  return { totalHours, missing, coverage, warningCount, fairness }
}

export function scheduleMetrics(schedule: ScheduleResult, employees: Employee[], settings: BusinessSettings) {
  const totalHours = scheduledHours(schedule)
  const requirements = Object.values(settings.openingHours).reduce((sum, day) => day.open ? sum + day.minimumStaff * 2 : sum, 0)
  const missing = schedule.gaps.reduce((sum, gap) => sum + gap.missing, 0)
  const coverage = requirements ? Math.max(0, Math.round(((requirements - missing) / requirements) * 100)) : 100
  const warningCount = schedule.shifts.reduce((sum, shift) => sum + shift.warnings.length, 0)
  const differences = employees.filter((employee) => employee.status === 'active').map((employee) => Math.abs(scheduledHours(schedule, employee.id) - employee.contractedHours) / Math.max(employee.contractedHours, 1))
  const fairness = Math.max(0, Math.round(100 - (differences.reduce((sum, value) => sum + value, 0) / Math.max(differences.length, 1)) * 60))
  return { totalHours, missing, coverage, warningCount, fairness }
}
