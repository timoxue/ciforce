# ADR 0001: Workspace-First Runtime Model

**Status**: Accepted  
**Date**: 2026-05-26

---

## Context

CIForce 当前同时存在几种潜在的上下文中心：

- 会话 / thread
- 数字工位 / agent
- 业务板块
- Workspace

如果不尽早固定主上下文容器，后续会出现：

- 文件归属不清
- TaskRun 与运行态无法稳定映射
- tool 权限边界混乱
- DeerFlow / LangGraph 一类框架的 thread 模型反向影响平台主模型

与此同时，CIForce 的产品形态已经明确包含：

- `Business Sector`
- `Workspace`
- `Canvas`
- `Files`
- `Task Runs`
- `Memory`

这些对象都天然更接近项目容器，而不是聊天线程。

---

## Decision

CIForce 采用 `Workspace-first runtime model`。

固定关系如下：

`Business Sector -> Workspace -> TaskRun -> Runtime Thread`

具体解释：

1. `Business Sector`
   负责业务分类、模板和默认能力边界
2. `Workspace`
   是平台中的主上下文容器
3. `TaskRun`
   是一次执行记录与审计单位
4. `Runtime Thread`
   是 LangGraph 或其他执行引擎的运行态会话容器

补充决策：

- 文件默认归属 `Workspace`
- Memory 默认归属 `Workspace`
- 任务日志和计费主归属 `TaskRun`
- thread 只服务执行恢复与运行态，不作为平台主归属对象

---

## Consequences

### 正向影响

- 平台主模型稳定
- 后端权限模型清晰
- 文件和 Memory 归属清晰
- 更容易支持多项目隔离
- 更容易把 DeerFlow、LangGraph、远程 agent 接到执行层

### 约束

- 后端所有运行入口都需要显式传入 `workspace_id`
- `TaskState` 需要补齐 workspace context
- 不能把 thread 直接暴露为产品主对象

### 对代码的影响

- `backend/vega/state.py` 需要增加 workspace 相关字段
- `backend/routes/vega.py` 需要接受 workspace 上下文
- 前端 task / file / memory store 需要以 workspace 为主键组织

---

## Alternatives Considered

### A. Thread-first

优点：

- 与 LangGraph / DeerFlow 天然贴近

缺点：

- 会把执行引擎模型上升为平台主模型
- 不适合项目级文件和 Memory 管理

### B. Agent-first

优点：

- 便于做数字员工 / agent 展示

缺点：

- 容易让资源层压过项目容器
- 文件、任务、知识归属会混乱

### C. Business-Sector-first

优点：

- 便于做能力分类

缺点：

- 业务板块更适合作为模板和分类，不适合承载所有运行态数据

---

## Canonical References

- [2026-05-26-digital-labor-execution-framework.md](D:/AI/CIForce/docs/architecture/2026-05-26-digital-labor-execution-framework.md)
- [2026-05-26-workspace-canvas-ui-data-model.md](D:/AI/CIForce/docs/architecture/2026-05-26-workspace-canvas-ui-data-model.md)
- [2026-05-26-backend-infrastructure-workspace-tools-deployment.md](D:/AI/CIForce/docs/architecture/2026-05-26-backend-infrastructure-workspace-tools-deployment.md)
