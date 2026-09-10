import { hoursBetween } from '../time'
import { weeklyWarning } from './shared'
import type { ComplianceChecker } from './types'

export const checkUnitedStates: ComplianceChecker = (context) => [
  ...weeklyWarning(context, context.settings.weeklyOvertimeThreshold, 'may trigger overtime'),
  ...context.shifts.flatMap((shift) => hoursBetween(shift.start, shift.end) >= 6
    ? [{ shiftId: shift.id, employeeId: shift.employeeId, severity: 'info' as const, message: 'Review applicable state break policy' }]
    : []),
]
