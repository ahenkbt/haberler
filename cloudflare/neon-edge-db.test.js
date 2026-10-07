import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isNeonReadOnlyRoleUrl,
  isNeonServerlessUrl,
  preferNeonDirectWriteUrl,
  shouldEdgeDualWriteNewsDb,
} from "./neon-edge-db.js";

describe("neon-edge-url", () => {
  it("detects Neon serverless URLs", () => {
    assert.equal(isNeonServerlessUrl("postgresql://u:p@ep-x.eu-central-1.aws.neon.tech/neondb"), true);
    assert.equal(isNeonServerlessUrl("postgres://u:p@203.0.113.10:5432/mysite_db?sslmode=disable"), false);
    assert.equal(isNeonServerlessUrl("postgresql://mysite_user@db.example.hstgr.cloud:5432/mysite_db"), false);
    assert.equal(isNeonServerlessUrl(""), false);
  });

  it("strips -pooler for direct write endpoints", () => {
    assert.equal(
      preferNeonDirectWriteUrl(
        "postgresql://neondb_owner:x@ep-twilight-pine-as13ym9z-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require",
      ),
      "postgresql://neondb_owner:x@ep-twilight-pine-as13ym9z.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require",
    );
    assert.equal(
      preferNeonDirectWriteUrl(
        "postgresql://neondb_owner:x@ep-bitter-mouse-asfs3hba.c-4.eu-central-1.aws.neon.tech/neondb",
      ),
      "postgresql://neondb_owner:x@ep-bitter-mouse-asfs3hba.c-4.eu-central-1.aws.neon.tech/neondb",
    );
  });

  it("flags known read-only Neon roles", () => {
    assert.equal(
      isNeonReadOnlyRoleUrl(
        "postgres://php_theme_ro:secret@ep-twilight-pine-as13ym9z-pooler.c-4.eu-central-1.aws.neon.tech/neondb",
      ),
      true,
    );
    assert.equal(
      isNeonReadOnlyRoleUrl("postgresql://neondb_owner:x@ep-twilight-pine-as13ym9z.c-4.eu-central-1.aws.neon.tech/neondb"),
      false,
    );
  });

  it("disables dual-write when NEWS_DATABASE_URL is a RO role", () => {
    assert.equal(
      shouldEdgeDualWriteNewsDb({
        NEWS_DATABASE_URL: "postgres://php_theme_ro:x@ep-x.neon.tech/neondb",
        NEWS_DB_WRITE: "dual",
      }),
      false,
    );
    assert.equal(
      shouldEdgeDualWriteNewsDb({
        NEWS_DATABASE_URL: "postgresql://neondb_owner:x@ep-x.neon.tech/neondb",
        NEWS_DB_WRITE: "dual",
      }),
      true,
    );
  });
});
