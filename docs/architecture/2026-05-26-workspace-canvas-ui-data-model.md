# CIForce Workspace / 画布 UI 与数据模型设计

**日期**: 2026-05-26  
**版本**: v0.1  
**状态**: Draft

---

## 0. 关联文档

- `docs/architecture/README.md`
- `docs/architecture/2026-05-26-digital-labor-execution-framework.md`
- `docs/architecture/2026-05-26-backend-infrastructure-workspace-tools-deployment.md`
- `docs/architecture/2026-05-08-ciforce-system-architecture.md`

---

## 1. 文档目标

本文件用于明确 CIForce 在“数字工位、业务板块、Workspace、无限画布、文件、任务、记忆”之间的关系设计，并给出可直接指导前后端实现的 UI 信息架构与数据模型。

目标：

1. 统一概念，避免“业务板块”和“Workspace”混用
2. 明确哪些对象是模板，哪些对象是执行实例
3. 明确画布、文件、任务、Memory 的归属关系
4. 为前端页面拆分、Zustand Store、后端 TaskState 和后续数据库表设计提供依据

---

## 2. 核心结论

### 2.1 推荐关系

采用如下层级：

`Business Sector -> Workspace -> Canvas / Files / Tasks / Memory`

即：

- `业务板块` 是业务能力分类与模板容器
- `Workspace` 是具体项目、具体执行空间
- `画布` 属于 Workspace
- `文件` 属于 Workspace
- `任务运行记录` 属于 Workspace
- `Memory` 默认属于 Workspace，可选择挂接业务板块级公共知识

### 2.2 关键原则

1. `业务板块` 是模板，不是最终执行现场
2. `Workspace` 才是最终执行现场
3. `数字工位` 是资源池，不是业务容器
4. `无限画布` 不应直接全局共享，应绑定到具体 Workspace
5. 一个 Workspace 只能属于一个业务板块
6. 一个业务板块可以有多个 Workspace

---

## 3. 概念定义

### 3.1 数字工位

定义：平台上的可调用数字劳动力与工具资源池。

职责：

- 展示可用 Agent / Tool / Pipeline Node
- 作为画布拖拽资源来源
- 作为 VEGA 编排时的候选执行能力

不负责：

- 持有项目文件
- 承载任务历史
- 作为用户业务上下文的归属对象

### 3.2 业务板块

定义：某一类业务能力域的抽象容器。

示例：

- 亚马逊增长
- 短视频投放
- 竞品数据洞察
- 出海本地化

职责：

- 组织同类 Workspace
- 提供默认模板画布
- 提供默认知识边界和默认可见工位
- 提供业务分类视图与指标总览

### 3.3 Workspace

定义：某个业务板块下的实际工作项目空间。

示例：

- 亚马逊增长 / 美国站防晒喷雾冷启动
- 亚马逊增长 / 竞品评论拆解 Q2
- 短视频投放 / 618 大促首波脚本验证

职责：

- 承载当前项目画布
- 承载上传文件
- 承载任务记录
- 承载工作记忆
- 承载运行中的上下文

### 3.4 无限画布

定义：Workspace 的流程编排与协作操作界面。

职责：

- 展示节点、边、分组、布局
- 支持拖拽数字工位进入画布
- 支持查看节点状态、参数、依赖关系
- 作为当前 Workspace 的主操作界面

### 3.5 文件

定义：Workspace 的输入资产与上下文资料。

示例：

- Brief
- 商品图
- 客户资料
- 评论导出
- 报表
- 知识库附件

规则：

- 文件默认归属到 Workspace
- 文件可以被节点引用
- 文件不直接归属到数字工位

---

## 4. 实体关系

### 4.1 关系总览

```text
Organization / User
  └─ Business Sector (1..N)
       └─ Workspace (1..N)
            ├─ Canvas (1..1)
            ├─ Files (0..N)
            ├─ Task Runs (0..N)
            ├─ Memory Refs (0..N)
            └─ Runtime Context (0..1)
```

### 4.2 强约束

1. 一个 `Workspace` 只能属于一个 `Business Sector`
2. 一个 `Workspace` 必须有且仅有一个当前画布
3. 一个 `File` 必须属于一个 `Workspace`
4. 一个 `Task Run` 必须至少关联一个 `Workspace`
5. `Task Run` 允许额外记录 `business_sector_id` 作为冗余查询字段
6. `Memory Ref` 默认属于 `Workspace`

### 4.3 弱联动

业务板块与 Workspace 的关系是“模板级联动”，不是“运行态强绑定联动”。

这意味着：

- 业务板块的模板更新，不应自动覆盖正在运行的 Workspace 画布
- 新建 Workspace 时，默认继承该业务板块的模板
- 老 Workspace 是否同步模板，应由显式操作触发

---

## 5. UI 信息架构

### 5.1 一级导航

一级导航是平台级别入口，不承载具体项目上下文：

- 工作台
- 编排画布
- 人才市场
- 服务商控制台

### 5.2 二级上下文

编排画布页中，真正的用户上下文由以下两层组成：

1. 业务板块
2. Workspace

推荐路径：

`先选业务板块 -> 再选 Workspace -> 再进入该 Workspace 画布`

### 5.3 三级操作对象

进入 Workspace 后，主界面围绕以下对象展开：

- 画布
- 文件
- 任务
- Memory
- 节点属性

---

## 6. 画布页 UI 设计

### 6.1 页面骨架

```text
Top Bar
├─ 全局导航
├─ 面包屑：业务板块 / Workspace / 当前视图
└─ VEGA / 搜索 / 用户

Main Area
├─ 左侧上下文栏
│  ├─ 业务板块列表
│  └─ 当前板块下的 Workspace 列表
├─ 中央主工作区
│  ├─ Workspace 标题栏
│  └─ 无限画布
└─ 右侧资产栏
   ├─ 文件
   ├─ 任务
   ├─ Memory
   └─ 属性
```

### 6.2 左侧上下文栏

上半部分：业务板块列表

- 展示业务板块名称、说明、状态、版本
- 可显示 Workspace 数量、最近活跃时间
- 点击业务板块后刷新下方 Workspace 列表

下半部分：Workspace 列表

- 展示当前业务板块下的 Workspace
- 显示名称、状态、文件数、最近运行
- 支持“新建 Workspace”
- 点击切换当前工作上下文

### 6.3 中央主工作区

仅服务于当前 Workspace。

顶部建议显示：

- Workspace 名称
- 所属业务板块
- 状态
- 最近运行时间
- 上传文件按钮
- 运行按钮
- 分享 / 归档按钮

中部：

- 无限画布
- 节点拖拽
- 依赖关系
- 小地图 / 缩放 / 模式切换

### 6.4 右侧资产栏

建议使用 Tabs：

#### 文件

- 上传文件
- 文件列表
- 文件标签
- 文件预览
- 挂接到节点

#### 任务

- 当前 Workspace 的运行记录
- 任务状态
- thread_id
- 调用 agent
- 结果摘要

#### Memory

- 当前 Workspace 记忆
- 与业务板块共享的知识摘要
- 可标记为长期保留

#### 属性

- 当前选中节点的配置
- 输入参数
- 输出映射
- 依赖关系

### 6.5 数字工位 UI 位置

数字工位不建议和文件、任务、Memory 混放在同一个普通“资源栏”里。

数字劳动力的地位介于“平台能力资源”和“当前 Workspace 团队成员”之间：

- 不是 Workspace 的主容器，不能压过 Workspace
- 也不是普通文件资源，不能和文件 / Memory / 任务记录等价
- 应作为当前 Workspace 可调度、可分配、可考核的团队成员出现

因此 UI 上应区别对待：

- `Workspace` 是主工作现场
- `数字劳动力` 是当前现场可调用的团队 / 工位
- `文件 / 任务 / Memory / 属性` 是 Workspace 上下文资料

推荐方式：

- 作为画布底部或侧边的 `数字劳动力调度台`
- 或作为独立的 `Team / Workforce` 抽屉
- 或作为右侧上下文区里的独立一级 Tab，但不与文件等资源混在同一列表
- 支持拖拽到画布节点、查看状态、绩效、成本、可用范围

当前前端实现先采用 `画布底部居中的数字劳动力调度台`，视觉形态接近 Apple Dock：

- 左侧只负责选择 `业务板块 / Workspace`
- 中间顶部显示当前 Workspace 现场信息
- 中间底部显示当前 Workspace 可调度的数字劳动力团队，鼠标经过时头像放大并显示身份
- 调度台支持 `紧凑 Dock 模式 / 底部详情面板模式` 切换
- 详情模式采用自动换行卡片，不使用横向拖动，超出时仅纵向滚动
- 展开 / 收起动画采用同一套 layout spring，卡片尺寸、头像、文字区域、ROI 标签需要同步过渡，避免文字先跳出或滞后
- 调度台末尾保留一个空的 `添加席位`，用于后续招募或绑定已有数字劳动力
- 右侧 `Workspace 上下文` 只放文件、任务、Memory、节点属性
- 数字劳动力的招募、配置、绩效、ROI 入口从调度台进入，不放入普通资源栏

原因：

- 数字工位是“可调度团队层”，不应压过 Workspace 作为主视角
- 用户当前真正的工作对象是 Workspace
- 数字劳动力需要长期考核成功率、失效率、投入产出和 ROI，因此需要比普通资源更强的身份感和绩效入口

---

## 7. 交互规则

### 7.1 创建流程

推荐流程：

1. 新建业务板块
2. 为业务板块新建 Workspace
3. 选择模板画布或空白画布
4. 进入该 Workspace
5. 上传文件到该 Workspace
6. 从数字工位拖拽节点进入画布
7. 交给 VEGA 执行

### 7.2 上传文件

上传入口建议在两个位置：

1. Workspace 标题栏
2. 右侧 `文件` Tab

规则：

- 文件默认写入当前 Workspace
- 后续可选择挂接到指定节点或全局 Workspace 上下文

### 7.3 切换业务板块

切换业务板块时：

- 不直接切换中央画布
- 先刷新 Workspace 列表
- 默认选中该板块最近使用的 Workspace，或第一个 Workspace

### 7.4 切换 Workspace

切换 Workspace 时：

- 中央画布切换到该 Workspace 的 canvas
- 右侧文件、任务、Memory 一并切换
- 顶部面包屑同步更新

### 7.5 模板同步

模板同步必须是显式动作：

- 重新套用板块模板
- 从模板增量同步
- 不允许后台静默覆盖 Workspace 运行态画布

---

## 8. 数据模型设计

### 8.1 Business Sector

```ts
type BusinessSectorStatus = 'draft' | 'published' | 'live'

interface BusinessSector {
  id: string
  name: string
  description: string
  status: BusinessSectorStatus
  version: string
  templateCanvas: WorkspaceCanvas
  workspaceIds: string[]
  summaryAgents?: BusinessSectorAgentSummary[]
  summarySteps?: string[]
  summaryMetric?: { label: string; val: string }
  vegaMessage?: string
  createdAt: string
  updatedAt: string
}
```

### 8.2 Workspace

```ts
type WorkspaceStatus = 'draft' | 'active' | 'archived'

interface Workspace {
  id: string
  businessSectorId: string
  name: string
  description: string
  status: WorkspaceStatus
  canvas: WorkspaceCanvas
  fileIds: string[]
  taskIds: string[]
  memoryIds: string[]
  createdAt: string
  updatedAt: string
}
```

### 8.3 Canvas

```ts
interface WorkspaceCanvas {
  nodes: Node[]
  edges: Edge[]
}
```

### 8.4 Workspace File

```ts
type WorkspaceFileKind = 'brief' | 'asset' | 'report' | 'knowledge' | 'other'

interface WorkspaceFile {
  id: string
  workspaceId: string
  name: string
  kind: WorkspaceFileKind
  mimeType?: string
  sizeBytes?: number
  source?: 'upload' | 'generated' | 'linked'
  createdAt: string
}
```

### 8.5 Task Run

```ts
type WorkspaceTaskStatus = 'idle' | 'queued' | 'running' | 'done' | 'error'

interface WorkspaceTaskRun {
  id: string
  workspaceId: string
  businessSectorId: string
  agentKey: string
  title: string
  status: WorkspaceTaskStatus
  threadId?: string
  startedAt: string
  completedAt?: string
}
```

### 8.6 Memory Ref

```ts
interface WorkspaceMemoryRef {
  id: string
  workspaceId: string
  title: string
  content: string
  source: 'note' | 'task_output' | 'file_extract'
  createdAt: string
}
```

---

## 9. LangGraph / 后端上下文设计

后端 `TaskState` 需要具备 Workspace 级上下文，而不是只有 `goal`。

推荐字段：

```py
goal: str
user_id: str | None
tenant_id: str | None
business_sector_id: str | None
workspace_id: str | None
workspace_name: str | None
memory_refs: list[dict]
knowledge_refs: list[dict]
file_refs: list[dict]
billing_tags: dict[str, str]
```

说明：

- `goal` 是本次任务目标
- `business_sector_id` 决定所属业务分类
- `workspace_id` 决定本次任务的真实上下文容器
- `memory_refs` 提供历史记忆
- `knowledge_refs` 提供板块级或租户级知识引用
- `file_refs` 提供当前上传文件的引用
- `billing_tags` 用于计费与审计

---

## 10. 前端 Store 建议

推荐新增独立的 Workspace 模型 Store，避免继续把业务板块和工作台状态混在一个 UI Store 里。

建议能力：

- `businessSectors`
- `workspaces`
- `files`
- `taskRuns`
- `memoryRefs`
- `currentBusinessSectorId`
- `currentWorkspaceId`
- `createBusinessSector()`
- `createWorkspace()`
- `updateWorkspaceCanvas()`
- `addWorkspaceFile()`
- `addWorkspaceTaskRun()`
- `addWorkspaceMemoryRef()`

---

## 11. 页面实现建议

### 第一阶段

先落数据骨架：

- 前端类型定义
- Zustand WorkspaceModelStore
- 后端 TaskState 上下文字段

### 第二阶段

改编排画布页：

- 左侧拆成“业务板块 + Workspace”
- 中间显示当前 Workspace 画布
- 右侧新增“文件 / 任务 / Memory / 属性”

### 第三阶段

让任务和文件真正落到 Workspace：

- 上传文件时写入 `workspace_id`
- VEGA 任务运行时写入 `workspace_id`
- 归档、记录、Memory 都带 `workspace_id`

### 第四阶段

做模板与同步机制：

- 业务板块模板画布
- Workspace 派生画布
- 显式同步模板

---

## 12. 反模式

以下做法不推荐：

1. 让一个业务板块只绑定一张全局共享画布
2. 让文件直接挂到业务板块，不区分 Workspace
3. 让一个 Workspace 同时归属多个业务板块
4. 让数字工位成为主视角而非 Workspace
5. 业务板块模板更新时静默覆盖正在运行的 Workspace

---

## 13. 最终判断

CIForce 的推荐结构应当是：

- `业务板块` 作为业务能力分类与模板容器
- `Workspace` 作为具体项目和执行现场
- `画布 / 文件 / 任务 / Memory` 全部归属到 Workspace
- `数字工位` 作为资源池，由 Workspace 在画布中调用

这套设计能够同时满足：

- 多项目隔离
- 模板复用
- 任务追踪
- 文件归档
- LangGraph 上下文注入
- 后续计费与权限扩展

---

## 14. 对应当前实现状态

当前仓库建议按以下路径推进：

- 前端类型与 Store：`app/src/types/index.ts`、`app/src/store/useAppStore.ts`
- 编排画布页：`app/src/pages/quant/index.tsx`
- LangGraph 状态：`backend/vega/state.py`
- VEGA 路由：`backend/routes/vega.py`

本文件是后续实现这几处改造的统一约束来源。
