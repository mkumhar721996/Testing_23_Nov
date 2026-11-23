# ADR Index

One line per decision — the rule, not the reasoning. Read the full ADR (`.arc/decisions/ADR-NNNN-*.md`) for context and rationale.

## Accepted — binding rules

| ADR | Category | Status | Rule |
|---|---|---|---|
| ADR-0001 | component | accepted | The Web App reaches data and business logic only through the Operations API. |
| ADR-0002 | component | accepted | The Operations API exposes a REST interface that the Web App calls directly, without a gateway or BFF. |
| ADR-0003 | component | accepted | Application data is persisted only in the Relational Database. |
| ADR-0004 | component | accepted | Notifications, scheduled tasks, reports and external-system sync run in the Background Worker, not in API requests. |
| ADR-0005 | component | accepted | Users sign in only through the corporate Entra ID Identity Provider; the project stores no passwords. |
| ADR-0006 | nfr | accepted | Keep the system at 99.9% monthly availability for the main user journey and sized for 200 concurrent users; schedule maintenance outside business hours with prior notice. |
| ADR-0007 | deployment_target | accepted | Deploy every application component as a container image in one AWS region, with no cross-region replicas. |
| ADR-0008 | integration_surface | accepted | Only the Background Worker exchanges data with Salesforce, in both directions; the API and Web App never call it directly. |
| ADR-0009 | cross_cutting | accepted | Run all components in one region; no residency or compliance-regime constraint applies to stored data. |
| ADR-0010 | cross_cutting | accepted | Enforce role-based access in the Operations API, encrypt all traffic in transit, and audit-log security-relevant actions and record changes. |
