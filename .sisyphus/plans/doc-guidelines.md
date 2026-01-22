# Update Agent Guidelines and Documentation Integrity

## Context

### Original Request
Update AGENTS.md to remove commands and add guidelines for local-prod sync, staging behavior, and documentation maintenance. Review local-development.md for accuracy.

### Interview Summary
**Key Discussions**:
- Treat local Supabase as a staging environment.
- Integration tests must run against local Supabase.
- Schema changes must be applied locally via migrations.
- Reference the existing local development guide.
- Enforce documentation updates when code interfaces change.

**Research Findings**:
- `docs/guides/local-development.md` is already accurate and comprehensive.
- `AGENTS.md` contains redundant command tables.

### Metis Review
**Identified Gaps** (addressed):
- **Verification Requirement**: Agents should run `npm run test:local-setup` after schema changes.
- **Schema Workflow**: Explicitly mandate migrations over Dashboard edits.
- **PR Definition of Done**: Any change to CLI, API, RPC, or Env requires a corresponding documentation update.

---

## Work Objectives

### Core Objective
Transform `AGENTS.md` into a policy-focused document that ensures development integrity and documentation consistency across the repository.

### Concrete Deliverables
- Updated `AGENTS.md` (policy focused, removed commands).
- Final verification of `docs/guides/local-development.md`.

### Definition of Done
- [ ] `AGENTS.md` contains the new "Core Principles" for sync, staging, and documentation.
- [ ] `AGENTS.md` refers to `./docs/guides/local-development.md`.
- [ ] No redundant command tables remain in `AGENTS.md`.

### Must Have
- Guideline to treat local Supabase as staging for integration tests.
- Guideline to keep local DB in sync with production.
- Mandatory documentation update policy for interface changes.
- Guideline to prevent leaving uncommitted "junk" files in the repository.

### Must NOT Have (Guardrails)
- NO specific command-line strings in `AGENTS.md`.
- NO duplication of setup instructions.

---

## Verification Strategy

### Manual QA Only

| Type | Verification Tool | Procedure |
|------|------------------|-----------|
| **Documentation** | Grep / Visual Check | Ensure all principles are present and no command table exists. |

**Evidence Required:**
- Final content of `AGENTS.md`.

---

## Task Flow

```
Task 1 (Update AGENTS.md)
```

## Parallelization
N/A (Single file update)

---

## TODOs

- [x] 1. Update `AGENTS.md` to policy-first structure

  **What to do**:
  - Remove `## 🛠 Commands` section.
  - Revise `## 🎨 Core Principles`:
    1. Keep "Verify First".
    2. Add "Local Sync with Prod": Local DB = Staging. Run integration tests locally. Reference local dev guide.
    3. Add "Schema Enforcement": No manual prod changes. Use migrations locally first.
    4. Add "Documentation Integrity": Always update guide documentation in `docs/` if parameters, usage, or interfaces change.
    5. Add "Clean Workspace": Do not leave any files in the repository that are not meant to be committed.
    6. Keep/Update Repository Pattern, Typing, Test-Driven, Local Reliability, and Mobile Awareness.

  **Parallelizable**: NO

  **References**:
  - `AGENTS.md` (Current state)
  - `docs/guides/local-development.md` (Reference target)

  **Acceptance Criteria**:
  - [ ] Commands table is gone.
  - [ ] Principles 2, 3, 4, and 5 cover Sync, Staging/Tests, Documentation Integrity, and Clean Workspace respectively.
  - [ ] File references correct guide path.

  **Commit**: YES
  - Message: `docs(meta): refactor agent guidelines for system integrity`
  - Files: `AGENTS.md`

---

## Success Criteria

### Final Checklist
- [x] Commands table removed from AGENTS.md
- [x] Local Supabase defined as staging for integration tests
- [x] Documentation update policy enforced
- [x] Clean workspace constraint added
- [x] Local development guide referenced
