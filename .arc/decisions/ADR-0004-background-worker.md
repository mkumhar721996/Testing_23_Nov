---
id: ADR-0004
category: component
title: Background Worker
status: accepted
superseded_by: null
component_id: comp_background_worker
responsibility: 'Runs all background jobs: notifications, scheduled tasks, reports
  and integrations with external systems.'
kind: worker
split_reason: Background and scheduled work runs outside the request path of the API.
talks_to:
- component_id: comp_relational_database
  interaction: shared-storage
  evidence: 'Background Jobs/Workers: Handle notifications, scheduled tasks, reports'
rule: Notifications, scheduled tasks, reports and external-system sync run in the
  Background Worker, not in API requests.
evidence:
- type: human
  ref: 'Background Jobs/Workers: Handle notifications, scheduled tasks, reports, and
    integrations with external systems'
basis: stated
---

## Context

The draft recorded none for this component.

## Decision

**Rule.** Notifications, scheduled tasks, reports and external-system sync run in the Background Worker, not in API requests.

Runs all background jobs: notifications, scheduled tasks, reports and integrations with external systems.

Kept separate because Background and scheduled work runs outside the request path of the API..

## Talks to

- **Relational Database** (shared-storage) — Background Jobs/Workers: Handle notifications, scheduled tasks, reports

## Alternatives considered

The draft recorded none for this component.

## Consequences

The draft recorded none for this component.

## Evidence

Basis: stated.
- human: Background Jobs/Workers: Handle notifications, scheduled tasks, reports, and integrations with external systems
