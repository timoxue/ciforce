# Database Schema Template

## 1. Scope

这次 schema 设计覆盖哪些实体？

## 2. Business Goal

为什么需要这组表？

## 3. Canonical References

- Relevant architecture docs:
- Relevant ADRs:

## 4. Entities

### Entity: <name>

- Purpose:
- Owner:
- Lifecycle:

## 5. Tables

### Table: <table_name>

Purpose:

Columns:

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | primary key |

Indexes:

- 

Constraints:

- 

Relations:

- 

## 6. Ownership Model

- Tenant scope:
- Business sector scope:
- Workspace scope:
- Task run scope:

## 7. Migration Plan

- New tables:
- Altered tables:
- Backfill:
- Compatibility strategy:

## 8. Access Pattern

- Read patterns:
- Write patterns:
- Reporting patterns:

## 9. Risks

- 

## 10. Verification

- Migration test:
- Query test:
- Rollback plan:
