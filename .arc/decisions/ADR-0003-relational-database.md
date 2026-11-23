---
id: ADR-0003
category: component
title: Relational Database
status: accepted
superseded_by: null
component_id: comp_relational_database
responsibility: Stores users, transactions and application data; product (PostgreSQL,
  MySQL) not yet chosen.
kind: managed_service
split_reason: Backing store the project uses but does not build.
rule: Application data is persisted only in the Relational Database.
evidence:
- type: human
  ref: 'Database: Stores users, transactions, and application data (e.g., PostgreSQL,
    MySQL).'
basis: stated
---

## Context

The draft recorded none for this component.

## Decision

**Rule.** Application data is persisted only in the Relational Database.

Stores users, transactions and application data; product (PostgreSQL, MySQL) not yet chosen.

Kept separate because Backing store the project uses but does not build..

## Alternatives considered

The draft recorded none for this component.

## Consequences

The draft recorded none for this component.

## Evidence

Basis: stated.
- human: Database: Stores users, transactions, and application data (e.g., PostgreSQL, MySQL).
