import { describe, expect, it } from "vitest";
import { enforceRole, roleFromRequest } from "@/lib/auth";

function requestFor(role: string, path = "/api/test") {
  return new Request(`https://example.test${path}`, {
    headers: { "x-demonstration-role": role },
  });
}

describe("demonstration-role enforcement", () => {
  it("accepts the selected role from a request header", () => {
    expect(roleFromRequest(requestFor("richard"))).toBe("richard");
  });

  it("denies manager actions to a salesperson", () => {
    expect(() => enforceRole(requestFor("richard"), ["manager"])).toThrow(
      "not permitted",
    );
  });

  it("denies sales entry to Kevin", () => {
    expect(() => enforceRole(requestFor("kevin"), ["sales"])).toThrow(
      "not permitted",
    );
  });

  it("accepts manager actions only for Svetlana", () => {
    expect(enforceRole(requestFor("svetlana"), ["manager"])).toBe("svetlana");
  });

  it("rejects unknown roles instead of trusting arbitrary headers", () => {
    expect(() => roleFromRequest(requestFor("administrator"))).toThrow(
      "valid demonstration role",
    );
  });
});
