export { cn } from "cn"

const dateTimeFormat = new Intl.DateTimeFormat("en-US", {
  day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
})

/** Formats an ISO timestamp as "Sep 26, 2026, 23:04" in the viewer's time zone. */
export function formatDateTime(value: string | null | undefined) {
  if (!value) return ""
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : dateTimeFormat.format(date)
}
