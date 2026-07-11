- product: "Goalgo default"
  boundary: "**/*"
  policies: "APPROVAL_POLICY.md"

- product: "Database migrations"
  boundary: "goalgo/artifacts/api-server/lib/db/migrations/**"
  policies: "Require human review for schema migrations. Do not auto-approve."
