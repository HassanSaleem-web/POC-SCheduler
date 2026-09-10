export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

export function fromMinutes(value: number): string {
  const hours = Math.floor(value / 60).toString().padStart(2, '0')
  const minutes = Math.round(value % 60).toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

export function hoursBetween(start: string, end: string): number {
  return Math.max(0, (toMinutes(end) - toMinutes(start)) / 60)
}

export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return toMinutes(aStart) < toMinutes(bEnd) && toMinutes(aEnd) > toMinutes(bStart)
}

export function formatHours(value: number): string {
  return Number.isInteger(value) ? `${value}h` : `${value.toFixed(1)}h`
}
