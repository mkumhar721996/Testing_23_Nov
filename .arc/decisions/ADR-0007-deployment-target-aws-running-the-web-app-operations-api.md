---
id: ADR-0007
category: deployment_target
title: 'Deployment target: AWS, running the Web App, Operations API and Background
  Worker as containers'
status: accepted
superseded_by: null
component_id: null
rule: Deploy every application component as a container image in one AWS region, with
  no cross-region replicas.
decision: AWS, running the Web App, Operations API and Background Worker as containers
  in a single region with no replicas; no data-residency rule; environments still
  open.
evidence:
- type: human
  ref: AWS, containers
- type: human
  ref: One region, no replicas, no residency rule
basis: stated
---

## Decision

**Rule.** Deploy every application component as a container image in one AWS region, with no cross-region replicas.

AWS, running the Web App, Operations API and Background Worker as containers in a single region with no replicas; no data-residency rule; environments still open.

## Evidence

Basis: stated.
- human: AWS, containers
- human: One region, no replicas, no residency rule
