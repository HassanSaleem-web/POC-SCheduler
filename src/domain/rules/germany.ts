import { hoursBetween } from '../time'
import { dailyAndRestWarnings, weeklyWarning } from './shared'
import type { ComplianceChecker } from './types'

export const checkGermany: ComplianceChecker = (context) => [
  ...dailyAndRestWarnings(context, context.settings.maxDailyHours, context.settings.minimumRestHours),
  ...weeklyWarning(context, 48, 'weekly-hours warning'),
  ...context.shifts.flatMap((shift) => hoursBetween(shift.start, shift.end) > 6
    ? [{ shiftId: shift.id, employeeId: shift.employeeId, severity: 'info' as const, message: 'Break required for shift longer than 6h' }]
    : []),
]
