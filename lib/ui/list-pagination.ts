export const LIST_PAGE_SIZE = 10;

export type PaginatedSlice<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function paginateItems<T>(
  items: T[],
  page: number,
  pageSize: number = LIST_PAGE_SIZE,
): PaginatedSlice<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}
