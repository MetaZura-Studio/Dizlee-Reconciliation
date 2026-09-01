/**
 * Email template placeholder rendering — `{{key}}` substitution and period labels.
 */

import { formatAppMonthYear } from "@/lib/platform/format-datetime";

/** mm/yyyy — e.g. 08/2026 */
export function periodLabel(month: number, year: number): string {
  return formatAppMonthYear(month, year);
}

/** Replace `{{key}}` placeholders in template strings with supplied values. */
export function applyTemplate(
  template: string,
  values: Record<string, string>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(values)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}
