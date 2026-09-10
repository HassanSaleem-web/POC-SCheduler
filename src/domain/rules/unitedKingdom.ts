import { dailyAndRestWarnings, weeklyWarning } from './shared'
import type { ComplianceChecker } from './types'

export const checkUnitedKingdom: ComplianceChecker = (context) => [
  ...dailyAndRestWarnings(context, context.settings.maxDailyHours, context.settings.minimumRestHours),
  ...weeklyWarning(context, 48, 'exceeds average weekly-hours guideline'),
]
