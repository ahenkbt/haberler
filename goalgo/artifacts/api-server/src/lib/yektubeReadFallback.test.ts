import { describe, expect, it } from "vitest";
import { createQueryFallbackProxy, decideYektubeReadFallback, isYektubeReadFallbackError } from "@workspace/db";

function pgError(message: string, code: string): Error {
  return Object.assign(new Error(message), { code });
}

type Builder = {
  from: (table: string) => Builder;
  where: (cond: string) => Builder;
  then: (
    onFulfilled?: ((value: unknown) => unknown) | null,
    onRejected?: ((reason: unknown) => unknown) | null,
  ) => Promise<unknown>;
};

function builder(exec: () => Promise<unknown>, trace: string[]): Builder {
  const b: Builder = {
    from(table: string) {
      trace.push(`from:${table}`);
      return b;
    },
    where(cond: string) {
      trace.push(`where:${cond}`);
      return b;
    },
    then(onFulfilled, onRejected) {
      return exec().then(onFulfilled ?? undefined, onRejected ?? undefined);
    },
  };
  return b;
}

describe("isYektubeReadFallbackError", () => {
  it("matches missing relation/column and connection failures, including drizzle cause", () => {
    expect(isYektubeReadFallbackError(pgError('relation "videos" does not exist', "42P01"))).toBe(true);
    expect(isYektubeReadFallbackError(pgError('column "seo_title" does not exist', "42703"))).toBe(true);
    const wrapped = new Error("Failed query: select seo_title");
    (wrapped as { cause?: unknown }).cause = pgError("column missing", "42703");
    expect(isYektubeReadFallbackError(wrapped)).toBe(true);
    expect(isYektubeReadFallbackError(new Error("timeout exceeded when trying to connect"))).toBe(true);
    expect(isYektubeReadFallbackError(pgError("duplicate key", "23505"))).toBe(false);
    expect(isYektubeReadFallbackError(pgError("syntax error", "42601"))).toBe(false);
  });
});

describe("decideYektubeReadFallback", () => {
  it("does not pin reads to a main DB whose video probe failed", () => {
    expect(
      decideYektubeReadFallback({
        readMode: "yektube",
        configured: true,
        yektubeProbeOk: true,
        mainProbeOk: false,
        yektubeLagging: false,
      }),
    ).toBe(false);
    expect(
      decideYektubeReadFallback({
        readMode: "yektube",
        configured: true,
        yektubeProbeOk: false,
        mainProbeOk: false,
        yektubeLagging: false,
      }),
    ).toBe(false);
  });

  it("pins to main only when main can actually serve video reads", () => {
    expect(
      decideYektubeReadFallback({
        readMode: "yektube",
        configured: true,
        yektubeProbeOk: false,
        mainProbeOk: true,
        yektubeLagging: false,
      }),
    ).toBe(true);
    expect(
      decideYektubeReadFallback({
        readMode: "yektube",
        configured: true,
        yektubeProbeOk: true,
        mainProbeOk: true,
        yektubeLagging: true,
      }),
    ).toBe(true);
    expect(
      decideYektubeReadFallback({
        readMode: "main",
        configured: true,
        yektubeProbeOk: false,
        mainProbeOk: true,
        yektubeLagging: false,
      }),
    ).toBe(false);
  });
});

describe("createQueryFallbackProxy", () => {
  it("replays the query chain on the main DB when yektube lacks a column", async () => {
    const primaryTrace: string[] = [];
    const fallbackTrace: string[] = [];
    let recovered = 0;
    const primary = {
      select(cols: string) {
        primaryTrace.push(`select:${cols}`);
        return builder(
          () => Promise.reject(pgError('column "seo_title" does not exist', "42703")),
          primaryTrace,
        );
      },
    };
    const fallback = {
      select(cols: string) {
        fallbackTrace.push(`select:${cols}`);
        return builder(() => Promise.resolve([{ id: 9 }]), fallbackTrace);
      },
    };
    const db = createQueryFallbackProxy(primary, fallback, { onRecovered: () => { recovered += 1; } });
    const rows = await db.select("id").from("videos").where("active");
    expect(rows).toEqual([{ id: 9 }]);
    expect(primaryTrace).toEqual(["select:id", "from:videos", "where:active"]);
    expect(fallbackTrace).toEqual(["select:id", "from:videos", "where:active"]);
    expect(recovered).toBe(1);
  });

  it("does not replay unique violations or a fallback that also fails", async () => {
    let fallbackSelects = 0;
    let recovered = 0;
    const primary = {
      select() {
        return {
          then(onFulfilled?: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) {
            return Promise.reject(pgError("duplicate", "23505")).then(onFulfilled, onRejected);
          },
        };
      },
    };
    const fallback = {
      select() {
        fallbackSelects += 1;
        return { then: () => Promise.resolve([]) };
      },
    };
    const db = createQueryFallbackProxy(primary, fallback, { onRecovered: () => { recovered += 1; } });
    await expect(db.select()).rejects.toMatchObject({ code: "23505" });
    expect(fallbackSelects).toBe(0);
    expect(recovered).toBe(0);

    const bothDown = createQueryFallbackProxy(
      {
        select() {
          return Promise.reject(pgError('relation "videos" does not exist', "42P01"));
        },
      },
      {
        select() {
          return Promise.reject(pgError('relation "videos" does not exist', "42P01"));
        },
      },
      { onRecovered: () => { recovered += 1; } },
    );
    await expect(bothDown.select()).rejects.toMatchObject({ code: "42P01" });
    expect(recovered).toBe(0);
  });
});
