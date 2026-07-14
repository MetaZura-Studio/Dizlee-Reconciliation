export type SortDirection = "asc" | "desc";

/** Next sort field + direction when a column header is clicked. */
export function nextSortState<TField extends string>(
  currentField: TField,
  currentDir: SortDirection,
  nextField: TField,
): { sortBy: TField; sortDir: SortDirection } {
  if (currentField === nextField) {
    return {
      sortBy: currentField,
      sortDir: currentDir === "asc" ? "desc" : "asc",
    };
  }
  return { sortBy: nextField, sortDir: "asc" };
}
