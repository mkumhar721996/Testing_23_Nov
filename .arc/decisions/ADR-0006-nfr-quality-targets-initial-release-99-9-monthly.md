---
id: ADR-0006
category: nfr
title: "NFR: Quality targets \u2014 Initial release: 99.9% monthly availability of\
  \ the sign-in and open-a-record"
status: accepted
superseded_by: null
dimension: Quality targets
metric: Monthly availability of the sign-in-and-open-a-record user journey; peak concurrent
  users
threshold: 'Initial release: 99.9% monthly availability of the sign-in and open-a-record
  journey, excluding announced maintenance outside business hours; supports 500-1,000
  users with 100-200 concurrent at peak under standard transactional and reporting
  load.'
component_id: null
needs_dedicated_tracking: true
rule: Keep the system at 99.9% monthly availability for the main user journey and
  sized for 200 concurrent users; schedule maintenance outside business hours with
  prior notice.
evidence:
- type: human
  ref: Approximately 500-1,000 users initially, with around 100-200 concurrent users
    during peak hours.
- type: human
  ref: Target 99.9% availability. Planned maintenance windows are acceptable outside
    business hours
basis: stated
---

## Decision

**Rule.** Keep the system at 99.9% monthly availability for the main user journey and sized for 200 concurrent users; schedule maintenance outside business hours with prior notice.

Monthly availability of the sign-in-and-open-a-record user journey; peak concurrent users: Initial release: 99.9% monthly availability of the sign-in and open-a-record journey, excluding announced maintenance outside business hours; supports 500-1,000 users with 100-200 concurrent at peak under standard transactional and reporting load.

## Evidence

Basis: stated.
- human: Approximately 500-1,000 users initially, with around 100-200 concurrent users during peak hours.
- human: Target 99.9% availability. Planned maintenance windows are acceptable outside business hours
