import { seedEmployees, seedSettings } from '../src/data/seed'
import { handleAssistant } from '../src/domain/assistant'
import { generateSchedule, isAvailable } from '../src/domain/scheduler'
import { hoursBetween, overlaps } from '../src/domain/time'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const schedule = generateSchedule(seedEmployees, seedSettings)
assert(schedule.shifts.length > 20, 'Expected a substantial generated schedule')
assert(schedule.gaps.length > 0, 'Expected intentional demo coverage challenges')
assert(schedule.shifts.some((shift) => shift.warnings.length > 0), 'Expected visible compliance guidance')

for (const shift of schedule.shifts) {
  const employee = seedEmployees.find((item) => item.id === shift.employeeId)
  assert(employee, `Shift ${shift.id} references a missing employee`)
  assert(isAvailable(employee, shift.dayIndex, shift.date, shift.start, shift.end), `${employee.name} is scheduled outside availability or during leave`)
}

for (const employee of seedEmployees) {
  for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
    const shifts = schedule.shifts.filter((shift) => shift.employeeId === employee.id && shift.dayIndex === dayIndex)
    const dailyHours = shifts.reduce((sum, shift) => sum + hoursBetween(shift.start, shift.end), 0)
    assert(dailyHours <= seedSettings.maxDailyHours, `${employee.name} exceeds the configured daily maximum`)
    shifts.forEach((shift, index) => shifts.slice(index + 1).forEach((other) => assert(!overlaps(shift.start, shift.end, other.start, other.end), `${employee.name} has overlapping shifts`)))
  }
}

const whySarah = handleAssistant('Why is Sarah not working Tuesday?', schedule, seedEmployees, seedSettings)
assert(whySarah.text.toLowerCase().includes('unavailable'), 'Assistant did not explain Sarah’s Tuesday constraint')

const reduceJohn = handleAssistant("Reduce John's hours.", schedule, seedEmployees, seedSettings)
assert(reduceJohn.schedule && reduceJohn.schedule.shifts.length === schedule.shifts.length - 1, 'Assistant did not reduce John’s hours')

const addFriday = handleAssistant('Regenerate Friday with more coverage.', schedule, seedEmployees, seedSettings)
assert(addFriday.text.toLowerCase().includes('friday'), 'Assistant did not process targeted Friday coverage')
assert(addFriday.schedule && addFriday.schedule.shifts.length > schedule.shifts.length, 'Assistant did not add targeted Friday coverage')

console.log(JSON.stringify({
  shifts: schedule.shifts.length,
  staffingGaps: schedule.gaps.reduce((sum, gap) => sum + gap.missing, 0),
  complianceNotes: schedule.shifts.reduce((sum, shift) => sum + shift.warnings.length, 0),
  assistantChecks: 3,
}, null, 2))
