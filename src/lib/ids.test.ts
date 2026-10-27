import { describe, expect, it } from "vitest";
import { isUuid, newId } from "./ids";

describe("ids", () => {
  it("newId geçerli ve benzersiz uuid üretir", () => {
    const ids = new Set(Array.from({ length: 200 }, () => newId()));
    expect(ids.size).toBe(200);
    for (const id of Array.from(ids)) expect(isUuid(id)).toBe(true);
  });

  it("isUuid eski biçimli kimlikleri reddeder", () => {
    expect(isUuid("note-1730000000000")).toBe(false);
    expect(isUuid("")).toBe(false);
    expect(isUuid("11111111-1111-1111-1111-111111111111")).toBe(true);
    expect(isUuid("AAAAAAAA-0000-4000-8000-000000000001")).toBe(true);
  });
});
