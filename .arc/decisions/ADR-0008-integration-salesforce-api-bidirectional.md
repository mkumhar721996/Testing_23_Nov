---
id: ADR-0008
category: integration_surface
title: 'Integration: Salesforce API (bidirectional)'
status: accepted
superseded_by: null
component_id: comp_background_worker
rule: Only the Background Worker exchanges data with Salesforce, in both directions;
  the API and Web App never call it directly.
evidence:
- type: human
  ref: Salesforce, both ways
basis: stated
---

## Decision

**Rule.** Only the Background Worker exchanges data with Salesforce, in both directions; the API and Web App never call it directly.

Salesforce API (bidirectional)

Applies to Background Worker.

## Evidence

Basis: stated.
- human: Salesforce, both ways
