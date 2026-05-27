# CIForce Architecture Docs

本目录用于作为 CIForce 的架构单一事实来源。

推荐阅读顺序：

1. [2026-05-08-ciforce-system-architecture.md](D:/AI/CIForce/docs/architecture/2026-05-08-ciforce-system-architecture.md)
   平台总体架构、VEGA 角色、系统分层
2. [2026-05-26-digital-labor-execution-framework.md](D:/AI/CIForce/docs/architecture/2026-05-26-digital-labor-execution-framework.md)
   数字劳动力定位、执行框架、DeerFlow 适配判断
3. [2026-05-26-workspace-canvas-ui-data-model.md](D:/AI/CIForce/docs/architecture/2026-05-26-workspace-canvas-ui-data-model.md)
   Workspace、画布、数据模型与 UI 关系
4. [2026-05-26-backend-infrastructure-workspace-tools-deployment.md](D:/AI/CIForce/docs/architecture/2026-05-26-backend-infrastructure-workspace-tools-deployment.md)
   后端基础设施、tools、云部署、Docker、负载均衡
5. [2026-05-26-architecture-governance-and-delivery-process.md](D:/AI/CIForce/docs/architecture/2026-05-26-architecture-governance-and-delivery-process.md)
   如何长期维护这套技术路线，确保后续设计与开发清晰一致
6. [adr/README.md](D:/AI/CIForce/docs/architecture/adr/README.md)
   重大技术决策记录
7. [2026-05-26-workspace-runtime-database-schema-v1.md](D:/AI/CIForce/docs/architecture/2026-05-26-workspace-runtime-database-schema-v1.md)
   第一版 Workspace runtime 数据库表设计
8. [2026-05-26-deployment-topology-v1.md](D:/AI/CIForce/docs/architecture/2026-05-26-deployment-topology-v1.md)
   第一版正式部署拓扑建议
9. [2026-05-26-agent-performance-observability-metrics-v1.md](D:/AI/CIForce/docs/architecture/2026-05-26-agent-performance-observability-metrics-v1.md)
   Agent 绩效、ROI、token 与流量观测设计
10. [2026-05-26-config-center-worker-assignment-v1.md](D:/AI/CIForce/docs/architecture/2026-05-26-config-center-worker-assignment-v1.md)
   统一配置中心与数字劳动力分配模型
11. [2026-05-26-runtime-extension-schema-v1.md](D:/AI/CIForce/docs/architecture/2026-05-26-runtime-extension-schema-v1.md)
   绩效观测与配置中心的扩展表设计

---

## 文档分层

建议把架构文档按以下层次理解：

- `L0`: 平台总架构
- `L1`: 产品定位与执行框架
- `L2`: 核心业务模型与 UI 信息架构
- `L3`: 基础设施与部署
- `L4`: 单次重大决策、ADR、迁移说明

---

## 当前 canonical docs

| 层级 | 文档 | 作用 |
|---|---|---|
| L0 | `2026-05-08-ciforce-system-architecture.md` | 平台总架构 |
| L1 | `2026-05-26-digital-labor-execution-framework.md` | 数字劳动力与执行框架 |
| L2 | `2026-05-26-workspace-canvas-ui-data-model.md` | Workspace / 画布 / 数据模型 |
| L3 | `2026-05-26-backend-infrastructure-workspace-tools-deployment.md` | 后端与部署 |
| L4 | `2026-05-26-workspace-runtime-database-schema-v1.md` | 数据库 schema |
| L5 | `2026-05-26-deployment-topology-v1.md` | 部署拓扑 |
| L6 | `2026-05-26-agent-performance-observability-metrics-v1.md` | 绩效与观测 |
| L7 | `2026-05-26-config-center-worker-assignment-v1.md` | 配置中心与分配 |
| L8 | `2026-05-26-runtime-extension-schema-v1.md` | 扩展 schema |
| L9 | 后续新增 ADR / migration docs | 重大变更记录 |

---

## 使用规则

1. 任何影响平台主模型的改动，都必须先更新 `L1-L3` 中至少一份文档。
2. 任何影响 `Workspace / TaskRun / Tool / Remote Agent Contract` 的改动，都必须记录到对应架构文档。
3. 任何会改变技术路线的决定，都应新增独立文档或 ADR，而不是只改代码。
4. 如果多个文档冲突，以日期更新更晚且被本索引列为 canonical 的文档为准。

---

## 后续建议补充

- `ADR` 目录
- 数据库 schema 文档
- 部署拓扑图
- API contract 文档
- Tool manifest 与 Remote Agent contract 文档
- `_templates/database-schema-template.md`
- `_templates/deployment-topology-template.md`
