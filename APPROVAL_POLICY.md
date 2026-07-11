# Solo developer approval policy (Ahenk-BT/goalgo)

This repository is maintained by a single human collaborator. Low-risk pull requests may be auto-approved without assigning human reviewers.

## Auto-approve when all are true

- Risk is Very Low or Low
- GitHub Actions `build` (Goalgo CI) passed
- No secrets, credentials, or production infra changes
- No database migrations unless explicitly scoped and reviewed

## Do not auto-approve

- Auth, billing, payments, or security-sensitive changes
- Database schema migrations
- Changes to this file, `.cursor/approval-policies/**`, or branch protection settings
- High-risk refactors touching many unrelated modules

## Bugbot / checks

- If **Cursor Bugbot** is still `pending` after 15 minutes, do not block approval solely for pending Bugbot when risk is Very Low/Low and CI passed.
- If Bugbot concludes `failure` or leaves unresolved blocking findings, do not auto-approve.
- If Bugbot concludes `success` with no blocking findings, treat Bugbot as passed.

## Reviewers

No human reviewers are available (sole collaborator is the PR author). Rely on CI, Bugbot (when available), and risk scoring instead of reviewer assignment.
