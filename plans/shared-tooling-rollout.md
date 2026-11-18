# shared-tooling rollout

The passages of shared-tooling's cross-project plan (`PLAN.md` at v2.6.0) that name this project, moved here word for word on 2026-11-10 when shared-tooling became project-agnostic. The portfolio-wide rest is in `PLAN.md` beside the project folders.

## Summary

Four follow-up questions are answered below. Vue's Vapor mode is still a release candidate and will help these sites only a little. Only Home Library gains from a real-time change, and it's a server-sent event stream, not WebSockets. Two shared repos are worth building: one tooling submodule for every stack's lint, tests, CI and deploys, and the component kit. Rust isn't a fit for any migration.

## Decisions so far

The standardization work starts from these, so it doesn't reopen them. All were decided on November 5, 2026.

- Two shared repos, both named with "shared": shared-tooling (public, one submodule per project, folders named `<purpose>/<target>`) and shared-components-vue.
- The component kit's own decisions are in shared-components-vue's `PLAN.md`.

Decided 2026-11-06, after the Gallery's pilot:

- End-to-end suites find elements by role and label (`getByRole`, `getByLabel`), never by a Bulma or PrimeVue class, so they still pass when an app swaps in the component kit. An app adopts the kit only after its rollout, and never in the same pass as a backend change, so the suite checks one side at a time.

## Where the real gains are

### 2. Consolidate the UI components

This is the biggest gain for WCAG and reuse. The Vue apps use three approaches today (PrimeVue, Bulma with Reka UI, and hand-written components), so the same dialog, toast and page header exist several times over. A shared library, shared-components-vue, replaces them. Its own `PLAN.md`, in that repo, covers why, what it builds, its design tokens and the order the apps adopt it.

## Shared packages

Yes, share them, and stay on ESLint. Two repos are enough: **shared-tooling**, one submodule holding every stack's lint, test, CI and deploy pieces, and **shared-components-vue**, kept apart because it ships code your apps run.

| Where | Purpose | Holds | Used by |
| --- | --- | --- | --- |
| shared-components-vue (own repo) | UI components | Shared Vue components; see that repo's `PLAN.md` | Every Vue front end |

**Why the component kit is its own repo.** It ships code your apps run, so an app should take a new version on purpose, not because a lint rule changed in the same submodule. Its plan is in that repo.

**Write the package choices down, then enforce them.** standards/packages.md holds a Use / Don't use table per stack, and the linter fails the build where it can:

- **Front end:** ESLint's `no-restricted-imports` does the same, such as `bulma` once the kit replaces it.

## Shared standards guide

| File | Covers |
| --- | --- |
| `components.md` | Reaching for shared-components-vue first, and when bespoke code is justified |

**How to gather it:**

- Conflicts come to you as a list to decide; the agent doesn't pick. Three known ones are already settled: Markdown wrapping, OpenAPI, and the split between Bulma, PrimeVue and neither, which the component kit replaces.

## Project gaps

Every repo gets a CLAUDE.md that points at the standards during rollout, so that's left out of the table. So does a Taskfile with `task deploy`: twelve projects have one that isn't committed yet, and MathDad Landing Page, Zealot Gaming, shared-components-vue and shared-tooling have none.

## Where to start

<!-- markdownlint-disable MD029 -->

7. **Then the migrations, in this order:**
   3. The component kit, following its own plan in shared-components-vue.

<!-- markdownlint-enable MD029 -->
