import { describe, expect, it } from "vitest";
import { createClock, formatClock, getTimeLeft, passTurn, parseTimeLimit } from "./clock";

describe("clock", () => {
  it("only charges the active player and never goes negative", () => {
    const clock = createClock(60, 1000);
    expect(getTimeLeft(clock, "X", "X", 11_000)).toBe(50_000);
    expect(getTimeLeft(clock, "O", "X", 11_000)).toBe(60_000);
    expect(getTimeLeft(clock, "X", "X", 1_000_000)).toBe(0);
    expect(getTimeLeft(clock, "X", "X", 0)).toBe(60_000);
    expect(getTimeLeft(clock, "X", null, 11_000)).toBe(60_000);
  });

  it("passTurn banks the elapsed time and restarts the turn", () => {
    const next = passTurn(createClock(60, 0), "X", 5_000);
    expect(next).toEqual({ remaining: { X: 55_000, O: 60_000 }, turnStartedAt: 5_000 });
  });

  it("formats with rounded-up seconds", () => {
    expect(formatClock(300_000)).toBe("5:00");
    expect(formatClock(150_000)).toBe("2:30");
    expect(formatClock(59_001)).toBe("1:00");
    expect(formatClock(1)).toBe("0:01");
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(-5)).toBe("0:00");
  });

  it("parses m:ss input", () => {
    expect(parseTimeLimit("2:30")).toBe(150);
    expect(parseTimeLimit("5:00")).toBe(300);
    expect(parseTimeLimit("7")).toBe(420);
    expect(parseTimeLimit("0:00")).toBeNull();
    expect(parseTimeLimit("1:75")).toBeNull();
    expect(parseTimeLimit("abc")).toBeNull();
    expect(parseTimeLimit("")).toBeNull();
  });
});
