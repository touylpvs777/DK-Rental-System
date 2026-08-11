/**
 * Every module's page header banner shares the same solid DK Blue background
 * (brand color, matches the sidebar and the Dashboard's main banner) instead
 * of the old per-category solid colors or gradients.
 */
const HEADER_BANNER_CLASS = 'bg-[#003366]'

export function getHeaderColorClass(_pathname: string): string {
  return HEADER_BANNER_CLASS
}
