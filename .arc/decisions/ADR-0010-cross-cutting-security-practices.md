---
id: ADR-0010
category: cross_cutting
title: 'Cross-cutting: Security practices'
status: accepted
superseded_by: null
component_id: null
rule: Enforce role-based access in the Operations API, encrypt all traffic in transit,
  and audit-log security-relevant actions and record changes.
decision: Access is controlled by role-based access control (administrator, manager,
  employee). All traffic between components and to users is encrypted in transit.
  Security-relevant actions and changes to business records are written to an audit
  log.
evidence:
- type: human
  ref: standard security practices, role-based access control, encryption in transit,
    and audit logging should be followed
basis: stated
scope:
- comp_web_app
- comp_operations_api
- comp_background_worker
enforcement:
  mode: judge
  how: Reviewer checks diffs for role checks on endpoints, TLS-only connections and
    audit-log writes.
---

## Decision

**Rule.** Enforce role-based access in the Operations API, encrypt all traffic in transit, and audit-log security-relevant actions and record changes.

Access is controlled by role-based access control (administrator, manager, employee). All traffic between components and to users is encrypted in transit. Security-relevant actions and changes to business records are written to an audit log.

## Enforcement

judge — Reviewer checks diffs for role checks on endpoints, TLS-only connections and audit-log writes.

## Evidence

Basis: stated.
- human: standard security practices, role-based access control, encryption in transit, and audit logging should be followed
