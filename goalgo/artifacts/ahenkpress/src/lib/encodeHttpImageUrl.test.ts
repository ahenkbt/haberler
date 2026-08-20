import { describe, expect, it } from "vitest";
import { encodeHttpImageUrl } from "./encodeHttpImageUrl";

describe("encodeHttpImageUrl", () => {
  it("percent-encodes NTV Turkish filenames", () => {
    expect(
      encodeHttpImageUrl(
        "https://images.ntv.com.tr/images/Ekrangörüntüsü2026-08-15091745-610242.png?width=930&format=webp",
      ),
    ).toContain("Ekrang%C3%B6r%C3%BCnt%C3%BCs%C3%BC");
  });

  it("leaves relative media paths unchanged", () => {
    expect(encodeHttpImageUrl("/api/media/uploads/a.jpg")).toBe("/api/media/uploads/a.jpg");
  });
});
