import { describe, expect, it } from "vitest";
import {
  newsMatchesSuperligTeam,
  resolveSuperligTeamMeta,
} from "@/lib/superligTeamMeta";

describe("superligTeamMeta", () => {
  it("resolves sponsored TFF team labels", () => {
    expect(resolveSuperligTeamMeta("GALATASARAY A.Ş.")?.key).toBe("galatasaray");
    expect(resolveSuperligTeamMeta("CORENDON ALANYASPOR")?.key).toBe("alanyaspor");
    expect(resolveSuperligTeamMeta("MISIRLI.COM.TR FATİH KARAGÜMRÜK")?.key).toBe("karagumruk");
  });

  it("filters news by team terms in title and tags", () => {
    const gs = resolveSuperligTeamMeta("Galatasaray A.Ş.");
    expect(gs).not.toBeNull();
    expect(newsMatchesSuperligTeam({ title: "Galatasaray derbide kazandı" }, gs!)).toBe(true);
    expect(newsMatchesSuperligTeam({ title: "Fenerbahçe transferi", tags: ["galatasaray"] }, gs!)).toBe(true);
    expect(newsMatchesSuperligTeam({ title: "Beşiktaş maçı" }, gs!)).toBe(false);
  });
});
