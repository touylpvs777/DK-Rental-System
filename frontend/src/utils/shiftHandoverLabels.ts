import type { TFunction } from 'i18next'

// The underlying values ('Morning', 'Issues Found', ...) are the literal
// strings stored on the record and sent to the API — display-only labels are
// translated separately here so the wire format stays stable across locales.
const SHIFT_LABEL_KEYS: Record<string, string> = {
  Morning: 'shiftHandover.shiftOptions.morning',
  Afternoon: 'shiftHandover.shiftOptions.afternoon',
  Night: 'shiftHandover.shiftOptions.night',
}

const STATUS_LABEL_KEYS: Record<string, string> = {
  Normal: 'shiftHandover.statusOptions.normal',
  'Issues Found': 'shiftHandover.statusOptions.issuesFound',
}

export function shiftLabel(t: TFunction, value: string): string {
  const key = SHIFT_LABEL_KEYS[value]
  return key ? t(key, value) : value
}

export function checklistStatusLabel(t: TFunction, value: string): string {
  const key = STATUS_LABEL_KEYS[value]
  return key ? t(key, value) : value
}
