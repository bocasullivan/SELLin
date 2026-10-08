export const PAGE_SIZE = 10;

export function paginate<T>(records: T[], requestedPage: number) {
  const pageCount = Math.max(1, Math.ceil(records.length / PAGE_SIZE));
  const page = Math.min(pageCount, Math.max(1, Math.floor(requestedPage)));
  const offset = (page - 1) * PAGE_SIZE;

  return {
    records: records.slice(offset, offset + PAGE_SIZE),
    page,
    pageCount,
    total: records.length,
    from: records.length ? offset + 1 : 0,
    to: Math.min(offset + PAGE_SIZE, records.length),
  };
}
