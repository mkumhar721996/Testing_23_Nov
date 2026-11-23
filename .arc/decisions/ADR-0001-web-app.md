---
id: ADR-0001
category: component
title: Web App
status: accepted
superseded_by: null
component_id: comp_web_app
responsibility: Browser UI for administrators, managers and employees to create, track
  and manage business records and workflows.
kind: web_ui
split_reason: 'Separate client runtime: a browser app, distinct from the services
  it calls.'
talks_to:
- component_id: comp_operations_api
  interaction: sync
  evidence: REST, with the Web App calling it directly
- component_id: comp_identity_provider
  interaction: sync
  evidence: Corporate SSO (Entra or Okta).
rule: The Web App reaches data and business logic only through the Operations API.
evidence:
- type: human
  ref: 'Web UI (Frontend): User-facing application built with React, Angular, or similar
    technology.'
basis: stated
---

## Context

The draft recorded none for this component.

## Decision

**Rule.** The Web App reaches data and business logic only through the Operations API.

Browser UI for administrators, managers and employees to create, track and manage business records and workflows.

Kept separate because Separate client runtime: a browser app, distinct from the services it calls..

## Talks to

- **Operations API** (sync) — REST, with the Web App calling it directly
- **Identity Provider** (sync) — Corporate SSO (Entra or Okta).

## Alternatives considered

The draft recorded none for this component.

## Consequences

The draft recorded none for this component.

## Evidence

Basis: stated.
- human: Web UI (Frontend): User-facing application built with React, Angular, or similar technology.
