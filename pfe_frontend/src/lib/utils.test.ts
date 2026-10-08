import { cn, resolveUploadUrl } from "./utils";

describe("cn", () => {
  it("merges class names and resolves tailwind conflicts", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-sm", undefined, "font-bold")).toBe("text-sm font-bold");
  });
});

describe("resolveUploadUrl", () => {
  it("returns undefined for empty input", () => {
    expect(resolveUploadUrl(undefined)).toBeUndefined();
    expect(resolveUploadUrl(null)).toBeUndefined();
    expect(resolveUploadUrl("")).toBeUndefined();
  });

  it("returns absolute URLs unchanged", () => {
    expect(resolveUploadUrl("https://example.com/a.png")).toBe(
      "https://example.com/a.png",
    );
  });

  it("resolves relative paths against the API origin", () => {
    expect(resolveUploadUrl("/uploads/a.png")).toBe(
      "http://localhost:3000/uploads/a.png",
    );
  });
});
