import { hoursBetween, toMinutes } from '../time'
import type { RuleContext, RuleWarning } from './types'

export function dailyAndRestWarnings(context: RuleContext, maxDaily: number, minimumRest: number): RuleWarning[] {
  const warnings: RuleWarning[] = []
  for (const employee of context.employees) {
    const shifts = context.shifts.filter((shift) => shift.employeeId === employee.id)
      .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start))
    const byDay = new Map<string, typeof shifts>()
    for (const shift of shifts) byDay.set(shift.date, [...(byDay.get(shift.date) ?? []), shift])
    for (const dayShifts of byDay.values()) {
      const total = dayShifts.reduce((sum, shift) => sum + hoursBetween(shift.start, shift.end), 0)
      if (total > maxDaily) dayShifts.forEach((shift) => warnings.push({ shiftId: shift.id, employeeId: employee.id, severity: 'warning', message: `${total.toFixed(1)}h exceeds ${maxDaily}h daily limit` }))
    }
    for (let index = 1; index < shifts.length; index += 1) {
      const previous = shifts[index - 1]
      const current = shifts[index]
      const days = (new Date(`${current.date}T12:00:00`).getTime() - new Date(`${previous.date}T12:00:00`).getTime()) / 86_400_000
      const rest = days * 24 + toMinutes(current.start) / 60 - toMinutes(previous.end) / 60
      if (days <= 1 && rest < minimumRest) warnings.push({ shiftId: current.id, employeeId: employee.id, severity: 'warning', message: `${rest.toFixed(1)}h rest; ${minimumRest}h recommended` })
    }
  }
  return warnings
}

export function weeklyWarning(context: RuleContext, limit: number, label: string): RuleWarning[] {
  return context.employees.flatMap((employee) => {
    const total = context.shifts.filter((shift) => shift.employeeId === employee.id)
      .reduce((sum, shift) => sum + hoursBetween(shift.start, shift.end), 0)
    return total > limit ? [{ employeeId: employee.id, severity: 'warning' as const, message: `${total.toFixed(1)}h ${label} (${limit}h)` }] : []
  })
}
