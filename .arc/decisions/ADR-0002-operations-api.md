---
id: ADR-0002
category: component
title: Operations API
status: accepted
superseded_by: null
component_id: comp_operations_api
responsibility: Backend REST service holding business logic and data processing for
  business records and workflows, called directly by the Web App with no gateway;
  the only writer of the Relational Database.
kind: api_service
split_reason: Central service that clients call for business logic; REST or GraphQL
  style is still open.
talks_to:
- component_id: comp_relational_database
  interaction: shared-storage
  evidence: 'Database: Stores users, transactions, and application data'
- component_id: comp_identity_provider
  interaction: sync
  evidence: Corporate SSO (Entra or Okta).
rule: The Operations API exposes a REST interface that the Web App calls directly,
  without a gateway or BFF.
evidence:
- type: human
  ref: REST, with the Web App calling it directly
basis: stated
contested: true
alternatives:
- option: GraphQL API
  why_not: REST chosen by the human.
- option: REST behind a gateway/BFF
  why_not: Extra layer not needed; human chose direct calls.
consequences:
- Web App authenticates and calls the API itself; CORS and auth are handled in the
  API.
---

## Context

The draft recorded none for this component.

## Decision

**Rule.** The Operations API exposes a REST interface that the Web App calls directly, without a gateway or BFF.

Backend REST service holding business logic and data processing for business records and workflows, called directly by the Web App with no gateway; the only writer of the Relational Database.

Kept separate because Central service that clients call for business logic; REST or GraphQL style is still open..

## Talks to

- **Relational Database** (shared-storage) — Database: Stores users, transactions, and application data
- **Identity Provider** (sync) — Corporate SSO (Entra or Okta).

## Alternatives considered

- GraphQL API — REST chosen by the human.
- REST behind a gateway/BFF — Extra layer not needed; human chose direct calls.

## Consequences

- Web App authenticates and calls the API itself; CORS and auth are handled in the API.

## Evidence

Basis: stated.
- human: REST, with the Web App calling it directly
