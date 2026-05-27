# CIForce ADR

本目录用于存放 CIForce 的 `Architecture Decision Record`。

ADR 用于记录：

- 重要技术选型
- 平台主模型变化
- 执行框架变化
- 部署架构变化
- 外部框架或产品接入决策

---

## 什么时候写 ADR

以下情况建议新增一份 ADR：

1. 要改变 canonical architecture docs 中的核心结论
2. 要引入新的核心基础设施
3. 要替换或增强执行框架
4. 要调整 `Workspace-first` 的主关系模型
5. 要引入会长期影响运维成本或扩展性的部署方案

---

## 命名规范

推荐格式：

`NNNN-short-kebab-case-title.md`

示例：

- `0001-workspace-first-runtime-model.md`
- `0002-managed-hybrid-deployment-first.md`

---

## 推荐结构

1. Status
2. Context
3. Decision
4. Consequences
5. Alternatives Considered

---

## 当前 ADR

- [0001-workspace-first-runtime-model.md](D:/AI/CIForce/docs/architecture/adr/0001-workspace-first-runtime-model.md)
