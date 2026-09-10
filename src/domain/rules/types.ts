import type { BusinessSettings, Employee, Shift } from '../../types'

export interface RuleContext { shifts: Shift[]; employees: Employee[]; settings: BusinessSettings }
export interface RuleWarning { shiftId?: string; employeeId?: string; message: string; severity: 'info' | 'warning' }
export type ComplianceChecker = (context: RuleContext) => RuleWarning[]
