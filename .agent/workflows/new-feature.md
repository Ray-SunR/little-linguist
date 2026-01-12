---
description: Deeply collaborative feature development workflow between Antigravity, Codex, and User.
---

This workflow ensures architectural excellence and robustness through multi-turn discussion between Antigravity (the agent) and Codex.

### 1. Planning & Deep Discussion
Commence a multi-turn conversation with Codex to discuss the implementation details.
- **Focus Areas**: Architecture, simplicity, extensibility, scalability, performance, and tradeoffs.
- **Security & Robustness**: Explicitly evaluate RLS policies, authentication requirements, and error boundary strategies.
- **Session Continuity**: Maintain the same Codex session ID for the entire planning phase.
- **Codex Greenlight**: You MUST continue the discussion with Codex until it explicitly agrees with the proposed approach. Do NOT stop or propose a plan to the User until Codex has given a "greenlight".

### 2. Implementation Plan Proposal
Draft an `implementation_plan.md` only AFTER Codex has agreed on the details.
- **Migration Strategy**: If database changes are needed, detail how to maintain backward compatibility and idempotency.
- **Verification Plan**: Define exact `npm run build` checks and specific browser verification steps.
    - **Tooling**: Explicitly state the use of `firefox-devtools` for UI testing and `supabase-mcp-server` for database verification.
- **Iterative Review Loop**:
    1.  Ask Codex to review the drafted `implementation_plan.md`.
    2.  If Codex has feedback or concerns, address them by updating the plan.
    3.  Ask Codex to review the updated plan again.
    4.  **REPEAT THIS LOOP** until Codex explicitly signs off (agrees) on the plan.
- **Final Proposal**: Only once Codex gives a final "greenlight" sign-off, propose the plan to the User.

### 3. Three-Way Alignment
Present the agreed-upon plan to the User.
- If the User provides feedback, return to the Codex session to review the comments together.
- Iterate until all three (User, Antigravity, and Codex) agree on the plan.
- **CRITICAL**: Do not proceed to implementation until the User approves.

### 4. Implementation Phase
Execute the changes as outlined in the approved plan.
- Use `task_boundary` and `task.md` to track progress.
- **Maintenance**: Implement audit logs for critical actions and document technical debt/trade-offs in comments or `MAINTAINERS.md`.
- **Database**: Use `supabase-mcp-server` for all DB schema modifications and data verification.

### 5. Post-Implementation Collaborative Review
Review the implementation carefully with Codex in the same session.
- **Audit Checklist**:
    - [ ] Security: Are RLS and auth guards in place? (Verify via Supabase MCP)
    - [ ] Performance: Are there any N+1 queries or heavy re-renders?
    - [ ] Observability: Are critical paths logged?
    - [ ] Quality: Does it pass `npm run build` and linting?
- Address all valuable Codex feedback. Clarify with User if significant changes are needed.

### 6. Completion
The task is only considered "Done" when comprehensive results are provided:
- **Visual Proof**: Screenshots and/or recordings captured via `firefox-devtools`.
- **Data Proof**: Query results from `supabase-mcp-server` showing correct DB states/records.
- **System Proof**: Terminal outputs and build logs showing successful compilation.
- **Agreed Finality**: Antigravity and Codex BOTH agree that the final implementation meets production standards.
- **Handover**: The User is notified with a final `walkthrough.md` containing all of the above artifacts.
