import { describe, expect, it } from "vitest";
import { assertMoneyCents, lineTotal, rejectClientTotals } from "./money.js";

describe("money integrity", () => {
  it("accepts integer COP minor units", () => {
    expect(assertMoneyCents(49900)).toBe(49900);
  });

  it("rejects floats", () => {
    expect(() => assertMoneyCents(49.9)).toThrow();
  });

  it("computes line totals without float drift", () => {
    expect(lineTotal(79900, 3)).toBe(239700);
  });

  it("rejects client-supplied totals", () => {
    expect(() => rejectClientTotals({ totalCents: 1 })).toThrow("CLIENT_TOTALS_REJECTED");
    expect(() => rejectClientTotals({ quantity: 1 })).not.toThrow();
  });
});
