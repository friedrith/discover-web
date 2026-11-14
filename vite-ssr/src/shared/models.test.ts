import { describe, expect, it } from "vitest";
import {
  filterFromQuery,
  parsePriority,
  percentDone,
  PRIORITIES,
  relativeTime,
} from "./models.ts";

describe("models", () => {
  it("buckets relative times", () => {
    expect(relativeTime(100, 100)).toBe("just now");
    expect(relativeTime(0, 120)).toBe("2 min ago");
    expect(relativeTime(0, 7_200)).toBe("2 h ago");
    expect(relativeTime(0, 172_800)).toBe("2 d ago");
    // Clock skew never goes negative.
    expect(relativeTime(200, 100)).toBe("just now");
  });

  it("reads the filter from the query string", () => {
    expect(filterFromQuery("done")).toBe("done");
    expect(filterFromQuery("nope")).toBe("all");
    expect(filterFromQuery(null)).toBe("all");
  });

  it("parses priorities", () => {
    for (const p of PRIORITIES) expect(parsePriority(p)).toBe(p);
    expect(parsePriority("urgent")).toBeNull();
  });

  it("computes the done percentage", () => {
    expect(percentDone({ total: 0, active: 0, done: 0 })).toBe(0);
    expect(percentDone({ total: 3, active: 2, done: 1 })).toBe(33);
  });
});
