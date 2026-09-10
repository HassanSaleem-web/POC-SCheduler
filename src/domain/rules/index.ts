import type { BusinessSettings, Employee, Shift } from '../../types'
import { checkGermany } from './germany'
import { checkUnitedStates } from './unitedStates'
import { checkUnitedKingdom } from './unitedKingdom'

export function applyComplianceRules(shifts: Shift[], employees: Employee[], settings: BusinessSettings): Shift[] {
  const checker = settings.country === 'Germany' ? checkGermany : settings.country === 'United States' ? checkUnitedStates : checkUnitedKingdom
  const warnings = checker({ shifts, employees, settings })
  return shifts.map((shift) => ({ ...shift, warnings: warnings.filter((warning) => warning.shiftId === shift.id).map((warning) => warning.message) }))
}
