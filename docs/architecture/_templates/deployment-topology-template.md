# Deployment Topology Template

## 1. Goal

这套部署拓扑解决什么阶段的问题？

## 2. Environment

- Local
- Staging
- Production

## 3. Components

- Frontend
- API Gateway
- Worker
- Queue / Cache
- Database
- Object Storage
- Sandbox Provider
- Observability

## 4. Topology

```text
Internet
  -> Load Balancer / Reverse Proxy
      -> Frontend
      -> API
      -> Worker / Jobs
```

## 5. State Placement

- Which state is local only:
- Which state is externalized:
- Which services must be stateless:

## 6. Scaling Strategy

- Frontend:
- API:
- Worker:
- Sandbox:

## 7. Failure Domains

- Single point of failure:
- Retry behavior:
- Recovery behavior:

## 8. Security Boundary

- Auth entry:
- Internal network:
- Secret management:
- File access:

## 9. Operations

- Deploy method:
- Rollback method:
- Health checks:
- Observability:

## 10. Open Questions

- 
