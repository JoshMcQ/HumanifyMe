<!--
Thanks for contributing to HumanifyMe. Read CONTRIBUTING.md once if you haven't.
Keep this PR to a single task. Delete sections that don't apply.
-->

## What this changes

<!-- One or two sentences. What does this PR do and why? -->

## Task / acceptance criteria

<!--
Which task in tasks/task-breakdown.md does this satisfy? Restate the acceptance
criteria in your own words and confirm each one is met. If this isn't tied to a
task, say so and explain the motivation.
-->

- Task:
- Acceptance criteria met:

## Checklist

- [ ] `npm run typecheck` passes (zero errors)
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] `npm run build` succeeds
- [ ] Tests added or updated per `tasks/test-plan.md`
- [ ] No raw user content is logged or persisted outside `~/.humanifyme/`
- [ ] Any user-facing copy clears the banned-words gate (see CONTRIBUTING §8)

## Sensitive surfaces touched

<!-- Tick any that apply so reviewers know to look closely. -->

- [ ] `specs/` (spec change, explain why the spec was wrong/incomplete)
- [ ] `src/privacy/` (redaction / restore / patterns, MIT)
- [ ] `src/network/` (outbound calls / telemetry, MIT)
- [ ] `src/engine/verify.ts` (the deterministic quality gate, MIT)
- [ ] None of the above

## Notes for reviewers

<!-- Anything non-obvious: ordering subtleties, tradeoffs, follow-ups you deliberately deferred. -->
