# CIForce 架构治理与交付流程

**日期**: 2026-05-26  
**版本**: v0.1  
**状态**: Draft

---

## 1. 文档目标

本文件用于把 CIForce 当前确定下来的技术路线长期固化下来，确保后续每次：

- 做产品设计
- 做后端设计
- 做数据模型调整
- 接入新 agent / tool
- 做部署改造

都能沿着同一套方法推进，而不是每次重新讨论一遍。

---

## 2. 核心原则

### 2.1 单一事实来源

CIForce 的架构不应只存在于口头讨论、聊天记录或代码直觉里。

必须长期落在：

- `docs/architecture/README.md`
- `docs/architecture/*.md`

### 2.2 先定边界，再写代码

任何中大型改动，先回答三件事：

1. 这次改动属于平台层、执行层、工具层还是部署层
2. 这次改动改变的是主模型，还是实现细节
3. 这次改动是否会影响已有 canonical docs

如果会影响主模型或技术路线，先改文档，再改代码。

### 2.3 Workspace-first 不可漂移

后续无论接入什么框架或工具，都不能破坏这个核心原则：

`Business Sector -> Workspace -> TaskRun -> Runtime Thread`

这条链路是平台稳定性的基础。

### 2.4 平台层与执行层分离

后续任何方案评审都应先检查：

- 是否把 thread 当成了 workspace
- 是否把 tool 当成了 agent
- 是否把 runtime 当成了平台主数据模型

如果答案是“是”，说明设计已经漂移。

---

## 3. 文档治理模型

### 3.1 文档层级

建议固定以下层级：

- `L0`: 平台总架构
- `L1`: 平台定位与执行框架
- `L2`: 核心业务模型与 UI
- `L3`: 基础设施与部署
- `L4`: ADR / 迁移 / 特殊专题

### 3.2 每类问题该看哪份文档

| 问题类型 | 首先查阅 |
|---|---|
| 平台到底是什么产品 | `digital-labor-execution-framework` |
| Workspace 和业务板块是什么关系 | `workspace-canvas-ui-data-model` |
| tools / storage / cloud deployment 怎么选 | `backend-infrastructure-workspace-tools-deployment` |
| VEGA 在系统里的定位 | `ciforce-system-architecture` |
| 某次重大变化为什么发生 | 对应 ADR 或专题文档 |

### 3.3 canonical docs 规则

以下文档当前视为 canonical：

- `2026-05-08-ciforce-system-architecture.md`
- `2026-05-26-digital-labor-execution-framework.md`
- `2026-05-26-workspace-canvas-ui-data-model.md`
- `2026-05-26-backend-infrastructure-workspace-tools-deployment.md`

若未来新增替代文档，必须在 `docs/architecture/README.md` 中显式替换。

---

## 4. 每次改动的标准流程

### 4.1 小改动

适用于：

- 不改主模型
- 不改技术路线
- 不改 contract
- 不改部署拓扑

流程：

1. 直接开发
2. 如果实现细节和现有文档轻微偏差，补充原文档
3. 在最终说明里标明影响范围

### 4.2 中改动

适用于：

- 新增一个重要 worker
- 新增一类 tool
- TaskState 字段调整
- Workspace 文件流转规则调整

流程：

1. 先写一个 change note 或专题文档
2. 标明影响的文档和代码
3. 更新 canonical docs
4. 再开始开发

### 4.3 大改动

适用于：

- 改平台主模型
- 改部署模型
- 引入新执行框架
- 接入外部 agent 生态
- 改权限模型、计费模型、文件归属模型

流程：

1. 新增独立架构文档或 ADR
2. 明确：
   - 背景
   - 目标
   - 不做什么
   - 候选方案
   - 最终决策
   - 对现有系统的影响
3. 更新 `docs/architecture/README.md`
4. 再开始开发

---

## 5. 设计到开发的交付物要求

### 5.1 每次中大型改动，至少要有这些交付物

1. 文档
   - 改了什么
   - 为什么改
   - 影响哪些现有模型

2. 数据模型变化
   - 新字段
   - 新表
   - 归属关系

3. 接口变化
   - request / response
   - 事件流变化

4. 实现变化
   - 影响哪些模块

5. 验证方式
   - 测试
   - 手工验证
   - 回滚策略

### 5.2 定义完成的标准

一个架构改动不应只算“代码写完”，而应满足：

- 文档已更新
- contract 已明确
- 影响范围已记录
- 测试方式已明确
- 后续开发者能单独接手继续做

---

## 6. 变更分类与对应更新规则

### 6.1 如果改的是产品概念

例如：

- 从 agent 平台改成数字劳动力平台
- 新增业务板块层级

必须更新：

- `digital-labor-execution-framework`
- 必要时更新 `ciforce-system-architecture`

### 6.2 如果改的是业务模型

例如：

- Workspace 归属关系
- 文件归属
- TaskRun 和 thread 的关系

必须更新：

- `workspace-canvas-ui-data-model`
- 必要时同步更新 `backend-infrastructure...`

### 6.3 如果改的是技术选型或部署

例如：

- 从单机改多副本
- 引入 Redis 队列
- 引入新 sandbox

必须更新：

- `backend-infrastructure-workspace-tools-deployment`

### 6.4 如果改的是执行框架

例如：

- LangGraph 状态模型变更
- worker runtime 升级
- 引入 remote agent contract

必须更新：

- `digital-labor-execution-framework`
- 必要时新增 ADR

---

## 7. ADR 建议

### 7.1 什么情况下写 ADR

以下情况建议单独写 ADR：

- 要不要继续用 LangGraph
- 要不要从 pgvector 拆到独立向量库
- 要不要引入 Kubernetes
- 要不要把 sandbox 改成自建
- 要不要接入 DeerFlow 某一部分能力

### 7.2 ADR 最小结构

建议包含：

1. 背景
2. 问题
3. 备选方案
4. 决策
5. 影响
6. 暂不处理项

---

## 8. 开发前检查清单

每次准备动手前，先检查：

- 这次改动影响的是哪一层
- 是否影响 canonical docs
- 是否需要新增字段或新 contract
- 是否会影响 `Workspace-first` 原则
- 是否会影响部署方式或运行边界
- 是否需要新增文档或 ADR

如果其中任意一项答案不明确，就先补文档。

---

## 9. 推荐的长期维护动作

### 9.1 每周或每个里程碑做一次架构回顾

建议固定检查：

- 文档是否过期
- 代码是否偏离文档
- 是否出现重复概念
- 是否出现新的核心约束但未文档化

### 9.2 每次 PR 或大改动结束时检查

建议至少确认：

- 是否更新了相关文档
- 是否新增了未记录的隐式规则
- 是否引入了新的外部依赖
- 是否改变了部署要求

### 9.3 每次外部 agent / tool 接入时检查

要确认：

- 它属于 worker、tool 还是 remote agent
- 它的输入输出 contract 是否明确
- 它的数据归属是否还是 workspace-first

---

## 10. 最终建议

这条技术路线完全可以持久化，但前提不是“文档多”，而是“文档有分层、有入口、有更新规则”。

推荐长期坚持三件事：

1. 用 `docs/architecture/README.md` 做统一入口
2. 用 canonical docs 固定平台核心设计
3. 用 ADR / change note 记录重大变化，而不是让变化只留在代码里

推荐配套使用：

- `docs/architecture/adr/`
- `docs/architecture/_templates/architecture-change-template.md`
- `docs/architecture/_templates/database-schema-template.md`
- `docs/architecture/_templates/deployment-topology-template.md`

一句话总结：

`要让技术路线可持续，不是一次性写一篇大文档，而是把“先定边界、再写代码、改完回写文档”变成固定流程。`
