import { test } from "node:test";
import assert from "node:assert/strict";
import { paginate } from "../src/lib/pagination.ts";

test("tables show ten records per page", () => {
  const records = Array.from({ length: 23 }, (_, index) => index + 1);
  assert.deepEqual(paginate(records, 1).records, records.slice(0, 10));
  assert.deepEqual(paginate(records, 2).records, records.slice(10, 20));
  assert.deepEqual(paginate(records, 3).records, [21, 22, 23]);
});

test("pagination clamps the page after deletion and handles empty results", () => {
  assert.equal(paginate([1, 2], 3).page, 1);
  assert.deepEqual(paginate([], 2), {
    records: [],
    page: 1,
    pageCount: 1,
    total: 0,
    from: 0,
    to: 0,
  });
});
