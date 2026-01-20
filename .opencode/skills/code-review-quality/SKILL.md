---
name: code-review-quality
description: "Perform concise, high-quality code reviews focused on hygiene, simplicity, maintainability, documentation, correctness, performance, security, and robustness. Use when reviewing PRs/diffs/files to surface risks and fixes with clear severity and evidence."
---

# Code Review Quality

## Overview

Concise playbook for reviewing code or PRs with clear severity-tagged findings and actionable fixes across eight quality pillars.

## Quick Workflow
- Clarify scope: issue/PR description, acceptance criteria, runtime assumptions.
- Map changes: list touched files/areas; scan diffs first, then full files if needed.
- Run lightweight checks when allowed: lint/tests/static analysis; note if not run.
- Review using the focus checklists below; cite file:line and evidence.
- Rate severity (`P0` critical → `P3` nit) and propose concrete fixes.
- Summarize residual risk and untested areas if nothing was run.

## Severity & Reporting Format
- `P0` blocker (crashes/data loss/security exploit); `P1` high risk; `P2` medium; `P3` low/nit.
- Report each finding as `- [P#] Title — path:line — impact; fix`. Keep bullet style.
- Prefer grouped findings (by area) over long paragraphs; include quick rationale.

## Focus Checklists

**Hygiene**: remove dead/commented-out code; unused imports/vars; noisy logs; feature flags cleaned or scoped; consistent formatting.

**Simplicity**: favor straightforward control flow; avoid premature abstractions; keep small functions/components; prefer configuration over duplication only when it reduces complexity.

**Maintainability**: clear naming; avoid duplication (DRY) but keep readability; respect module boundaries; isolate side effects; add/adjust tests near changed logic.

**Documentation**: update READMEs/config docs/migrations; inline comments only for non-obvious intent; note new env vars/flags; record behavioral changes and risks.

**Correctness**: verify logic matches requirements and edge cases (empty states, null/undefined, timezones, pagination, retries, ordering); validate input/output types; ensure error handling and propagation are appropriate.

**Performance**: watch for N+1s, unnecessary renders/allocations, unbounded loops; prefer lazy/deferred work; guard heavy operations behind limits/caching; ensure batch APIs where needed.

**Security**: validate/sanitize inputs; enforce authz on new paths; avoid leaking secrets/PII in logs; safe defaults for cookies/headers; resist injection (SQL/NoSQL/XSS/command); prefer vetted crypto libs.

**Robustness**: timeouts, retries with backoff/idempotency, circuit breakers where relevant; handle partial failures; close resources; defensive parsing; telemetry for critical paths.

## When Evidence Is Thin
- If code is unclear, call it out as an open question with hypotheses.
- If tests or repro steps are missing, note the gap and potential risk area.
