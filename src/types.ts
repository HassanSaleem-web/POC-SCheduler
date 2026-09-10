export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const
export type Country = 'Germany' | 'United States' | 'United Kingdom'
export type Role = 'Store Manager' | 'Supervisor' | 'Sales Associate' | 'Cashier' | 'Stock Associate'
export type LeaveType = 'vacation' | 'sick' | 'meeting' | 'unavailable'

export interface TimeWindow { start: string; end: string }

export interface LeavePeriod {
  id: string
  type: LeaveType
  startDate: string
  endDate: string
  startTime?: string
  endTime?: string
  note?: string
}

export interface Employee {
  id: string
  name: string
  email: string
  role: Role
  contractedHours: number
  status: 'active' | 'inactive'
  preferredDays: number[]
  availability: Record<number, TimeWindow | null>
  leave: LeavePeriod[]
  color: string
}

export interface OpeningDay { open: boolean; start: string; end: string; minimumStaff: number }

export interface BusinessSettings {
  name: string
  country: Country
  timezone: string
  openingHours: Record<number, OpeningDay>
  roleRequirements: Partial<Record<Role, number>>
  defaultShiftLength: number
  maxShiftLength: number
  maxDailyHours: number
  weeklyOvertimeThreshold: number
  minimumRestHours: number
}

export interface Shift {
  id: string
  employeeId: string
  dayIndex: number
  date: string
  start: string
  end: string
  source: 'generated' | 'manual'
  warnings: string[]
}

export interface StaffingGap { dayIndex: number; start: string; end: string; missing: number; role?: Role }

export interface ScheduleResult {
  shifts: Shift[]
  gaps: StaffingGap[]
  explanation: string[]
  generatedAt: string
  weekStart: string
}

export interface ChatMessage { id: string; sender: 'assistant' | 'user'; text: string; timestamp: string }
export type Page = 'dashboard' | 'schedule' | 'employees' | 'availability' | 'settings'
