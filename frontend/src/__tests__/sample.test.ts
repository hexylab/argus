import { describe, it, expect } from "vitest";

describe("Sample Tests", () => {
  it("should pass basic assertion", () => {
    expect(true).toBe(true);
  });

  it("should perform arithmetic correctly", () => {
    expect(1 + 1).toBe(2);
    expect(10 - 5).toBe(5);
    expect(3 * 4).toBe(12);
  });

  it("should handle string operations", () => {
    expect("hello".toUpperCase()).toBe("HELLO");
    expect("WORLD".toLowerCase()).toBe("world");
    expect("foo" + "bar").toBe("foobar");
  });

  it("should handle array operations", () => {
    const arr = [1, 2, 3];
    expect(arr.length).toBe(3);
    expect(arr.includes(2)).toBe(true);
    expect(arr.map((x) => x * 2)).toEqual([2, 4, 6]);
  });
});
