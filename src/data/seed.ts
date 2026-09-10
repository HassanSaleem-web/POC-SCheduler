import type { BusinessSettings, Employee, ScheduleResult } from '../types'

const allDay = (start = '09:00', end = '20:00') => ({ start, end })
const weekdays = (start = '09:00', end = '20:00') => ({
  0: allDay(start, end), 1: allDay(start, end), 2: allDay(start, end),
  3: allDay(start, end), 4: allDay(start, end), 5: null, 6: null,
})

export function getMonday(date = new Date()): Date {
  const next = new Date(date)
  const day = next.getDay()
  next.setDate(next.getDate() - (day === 0 ? 6 : day - 1))
  next.setHours(12, 0, 0, 0)
  return next
}

export function toISODate(date: Date): string { return date.toISOString().slice(0, 10) }

function dateFor(day: number, offsetWeeks = 0): string {
  const date = getMonday()
  date.setDate(date.getDate() + day + offsetWeeks * 7)
  return toISODate(date)
}

export const seedSettings: BusinessSettings = {
  name: 'Nova Retail Berlin', country: 'Germany', timezone: 'Europe/Berlin',
  openingHours: {
    0: { open: true, start: '09:00', end: '20:00', minimumStaff: 3 },
    1: { open: true, start: '09:00', end: '20:00', minimumStaff: 3 },
    2: { open: true, start: '09:00', end: '20:00', minimumStaff: 3 },
    3: { open: true, start: '09:00', end: '20:00', minimumStaff: 3 },
    4: { open: true, start: '09:00', end: '20:00', minimumStaff: 4 },
    5: { open: true, start: '09:00', end: '20:00', minimumStaff: 4 },
    6: { open: false, start: '09:00', end: '18:00', minimumStaff: 0 },
  },
  roleRequirements: { 'Store Manager': 1, Cashier: 1 }, defaultShiftLength: 6.5,
  maxShiftLength: 8, maxDailyHours: 8, weeklyOvertimeThreshold: 40, minimumRestHours: 11,
}

export const seedEmployees: Employee[] = [
  { id: 'emp-hannah', name: 'Hannah Müller', email: 'hannah@novaretail.de', role: 'Store Manager', contractedHours: 38, status: 'active', preferredDays: [0,1,2,3,4], availability: weekdays('08:30','18:30'), color: '#6c5ce7', leave: [{ id: 'leave-hannah', type: 'meeting', startDate: dateFor(2), endDate: dateFor(2), startTime: '09:00', endTime: '11:00', note: 'Regional leadership call' }] },
  { id: 'emp-lukas', name: 'Lukas Weber', email: 'lukas@novaretail.de', role: 'Supervisor', contractedHours: 35, status: 'active', preferredDays: [0,1,3,4,5], availability: { ...weekdays(), 5: allDay('09:00','20:00') }, color: '#0ea5e9', leave: [] },
  { id: 'emp-sarah', name: 'Sarah Klein', email: 'sarah@novaretail.de', role: 'Sales Associate', contractedHours: 30, status: 'active', preferredDays: [0,2,3,4], availability: { ...weekdays('09:00','19:00'), 1: null, 5: allDay('10:00','18:00') }, color: '#f97316', leave: [{ id: 'leave-sarah', type: 'unavailable', startDate: dateFor(1), endDate: dateFor(1), note: 'University seminar' }] },
  { id: 'emp-jonas', name: 'John Fischer', email: 'john@novaretail.de', role: 'Cashier', contractedHours: 25, status: 'active', preferredDays: [0,1,2,3,4,5], availability: { 0:allDay('14:00','20:00'), 1:allDay('14:00','20:00'), 2:allDay('14:00','20:00'), 3:allDay('14:00','20:00'), 4:allDay('14:00','20:00'), 5:allDay('14:00','20:00'), 6:null }, color: '#ec4899', leave: [] },
  { id: 'emp-emma', name: 'Emma Schneider', email: 'emma@novaretail.de', role: 'Sales Associate', contractedHours: 24, status: 'active', preferredDays: [0,1,3,5], availability: { 0:allDay(), 1:allDay(), 2:null, 3:allDay(), 4:allDay('09:00','14:30'), 5:allDay('09:00','17:00'), 6:null }, color: '#22c55e', leave: [{ id:'leave-emma', type:'vacation', startDate:dateFor(3), endDate:dateFor(5), note:'Annual leave' }] },
  { id: 'emp-david', name: 'David Hoffmann', email: 'david@novaretail.de', role: 'Stock Associate', contractedHours: 32, status: 'active', preferredDays: [0,1,2,3,4,5], availability: { ...weekdays('08:00','17:00'), 5:allDay('08:00','15:00') }, color: '#14b8a6', leave: [] },
  { id: 'emp-aisha', name: 'Aisha Rahman', email: 'aisha@novaretail.de', role: 'Cashier', contractedHours: 20, status: 'active', preferredDays: [0,2,4,5], availability: { 0:allDay('09:00','15:00'), 1:null, 2:allDay('09:00','15:00'), 3:null, 4:allDay('09:00','16:00'), 5:allDay('09:00','16:00'), 6:null }, color: '#eab308', leave: [] },
  { id: 'emp-felix', name: 'Felix Wagner', email: 'felix@novaretail.de', role: 'Sales Associate', contractedHours: 20, status: 'active', preferredDays: [0,1,2,3,4,5], availability: { 0:allDay('15:00','20:00'), 1:allDay('15:00','20:00'), 2:allDay('15:00','20:00'), 3:allDay('15:00','20:00'), 4:allDay('15:00','20:00'), 5:allDay('15:00','20:00'), 6:null }, color: '#8b5cf6', leave: [] },
  { id: 'emp-sofia', name: 'Sofia Petrova', email: 'sofia@novaretail.de', role: 'Supervisor', contractedHours: 28, status: 'active', preferredDays: [1,2,3,4,5], availability: { 0:null, 1:allDay(), 2:allDay(), 3:allDay(), 4:allDay(), 5:allDay('09:00','20:00'), 6:null }, color: '#ef4444', leave: [{ id:'leave-sofia', type:'sick', startDate:dateFor(0), endDate:dateFor(1), note:'Reported sick' }] },
  { id: 'emp-noah', name: 'Noah Becker', email: 'noah@novaretail.de', role: 'Stock Associate', contractedHours: 16, status: 'active', preferredDays: [2,4,5], availability: { 0:null, 1:null, 2:allDay('09:00','16:00'), 3:null, 4:allDay('12:00','20:00'), 5:allDay('09:00','20:00'), 6:null }, color: '#3b82f6', leave: [] },
]

export const emptySchedule: ScheduleResult = { shifts: [], gaps: [], explanation: [], generatedAt: '', weekStart: toISODate(getMonday()) }
