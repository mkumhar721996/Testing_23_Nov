---
id: ADR-0009
category: cross_cutting
title: 'Cross-cutting: Project constraints'
status: accepted
superseded_by: null
component_id: null
rule: Run all components in one region; no residency or compliance-regime constraint
  applies to stored data.
decision: '- Single region, no replicas, no data-residency rule.

  - No compliance regime (SOC 2, GDPR, HIPAA) is mandatory at this stage.'
evidence:
- type: human
  ref: One region, no replicas, no residency rule
- type: human
  ref: No specific compliance requirements at this stage.
basis: stated
---

## Decision

**Rule.** Run all components in one region; no residency or compliance-regime constraint applies to stored data.

- Single region, no replicas, no data-residency rule.
- No compliance regime (SOC 2, GDPR, HIPAA) is mandatory at this stage.

## Evidence

Basis: stated.
- human: One region, no replicas, no residency rule
- human: No specific compliance requirements at this stage.
