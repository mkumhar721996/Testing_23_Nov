---
id: ADR-0005
category: component
title: Identity Provider
status: accepted
superseded_by: null
component_id: comp_identity_provider
responsibility: Corporate single sign-on for administrators, managers and employees;
  runs on Microsoft Entra ID.
kind: managed_service
split_reason: Sign-in is run by the company's existing SSO provider, which the project
  uses but does not build.
rule: Users sign in only through the corporate Entra ID Identity Provider; the project
  stores no passwords.
evidence:
- type: human
  ref: Microsoft Entra ID
basis: stated
---

## Context

The draft recorded none for this component.

## Decision

**Rule.** Users sign in only through the corporate Entra ID Identity Provider; the project stores no passwords.

Corporate single sign-on for administrators, managers and employees; runs on Microsoft Entra ID.

Kept separate because Sign-in is run by the company's existing SSO provider, which the project uses but does not build..

## Alternatives considered

The draft recorded none for this component.

## Consequences

The draft recorded none for this component.

## Evidence

Basis: stated.
- human: Microsoft Entra ID
