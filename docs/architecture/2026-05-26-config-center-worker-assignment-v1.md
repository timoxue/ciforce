# CIForce Config Center And Worker Assignment v1

**日期**: 2026-05-26  
**版本**: v0.1  
**状态**: Draft

---

## 1. 文档目标

本文件用于定义 CIForce 的统一配置中心与数字劳动力分配模型，解决以下问题：

1. 平台是否需要一个统一配置模型
2. 配置如何和数字劳动力建立分配关系
3. 配置如何按平台、业务板块、Workspace、单次任务逐层覆盖
4. 如何避免把所有配置塞进单个 agent 身上

---

## 2. 核心结论

### 2.1 不推荐单一“大配置表”

CIForce 不适合做一个无边界的 `agent_config` 大表。

原因：

- 同一个数字劳动力会在不同业务板块下表现不同
- 同一个数字劳动力会在不同 Workspace 下权限不同
- 模型、工具、预算、提示词、观测配置不是一类东西
- 后续会需要版本、灰度、A/B、覆盖和回滚

### 2.2 推荐做“配置模板中心 + 分配关系 + 运行时解析器”

推荐模型：

`Config Profile + Worker Assignment + Runtime Override`

也就是：

- `Config Profile`
  - 定义一组配置
- `Worker Assignment`
  - 定义哪些数字劳动力在什么范围内使用哪些配置
- `Runtime Override`
  - 定义单次任务的临时覆盖

### 2.3 配置解析采用分层覆盖

推荐顺序：

`Global -> Capability Profile -> Worker -> Business Sector -> Workspace -> TaskRun Override`

后面的覆盖前面的。

---

## 3. 为什么需要统一配置中心

CIForce 后续会存在很多类型的配置：

- 默认模型
- 超时设置
- 工具白名单
- 提示词策略
- 预算限制
- 输出格式要求
- 观测策略
- 业务板块默认可见数字劳动力

如果这些配置直接散落在：

- worker manifest
- 代码常量
- workspace json
- 环境变量

就会出现几个问题：

- 配置重复
- 配置来源不清
- 修改后无法追踪
- 同一 agent 在不同上下文中的差异难管理

因此统一配置中心是必要的。

---

## 4. 设计原则

### 4.1 配置和数字劳动力分离

数字劳动力本身应定义：

- 自己是谁
- 能做什么
- 输入输出 contract 是什么

配置中心应定义：

- 它在什么场景下怎么做
- 它能调用哪些工具
- 它使用什么模型和预算

### 4.2 配置应支持分层覆盖

不能只支持“全局默认”，也不能只支持“每个 agent 一份专属配置”。

推荐至少支持：

- 平台默认
- 能力模板默认
- 数字劳动力实例默认
- 业务板块级覆盖
- Workspace 级覆盖
- 单次任务覆盖

### 4.3 配置应可版本化

配置和代码一样，需要：

- version
- status
- effective time
- 回滚能力

### 4.4 配置应可解释

运行时应该能回答：

- 当前这个 agent 为什么用了这个模型
- 为什么这个 tool 可用 / 不可用
- 当前预算从哪里继承来的

也就是说运行时需要有“resolved config explainability”。

---

## 5. 推荐的配置分层模型

### 5.1 Global Config

平台级默认配置。

适合放：

- 默认模型提供商
- 默认超时
- 默认观测开关
- 默认安全策略

### 5.2 Capability Profile

能力模板，不直接等于某个数字劳动力实例。

示例：

- `amazon-research-profile`
- `video-storyboard-profile`
- `data-analyst-profile`

适合放：

- prompt policy
- tool policy
- output policy
- default budget

### 5.3 Worker Default Profile

数字劳动力实例默认配置。

示例：

- `amazon_competitor_analyst`
- `video_storyboard`
- `data_analyst`

适合放：

- 该 worker 的默认模型档位
- 特定默认工具组合
- 自身默认观测标签

### 5.4 Business Sector Override

某个业务板块对配置的覆盖。

适合放：

- 某个板块默认开放哪些数字劳动力
- 某个板块禁用哪些工具
- 某个板块预算上限

### 5.5 Workspace Override

某个项目级别的覆盖。

适合放：

- 本项目专用模型策略
- 本项目预算调整
- 本项目额外允许的工具
- 本项目隐藏的数字劳动力

### 5.6 TaskRun Override

单次任务的临时配置。

适合放：

- 本次任务临时提高预算
- 本次任务禁用联网
- 本次任务切到更便宜模型

---

## 6. 配置分类建议

推荐至少拆成以下六类：

### 6.1 model_policy

用于控制：

- model provider
- model name
- fallback model
- reasoning mode
- token limit

### 6.2 tool_policy

用于控制：

- allowed tools
- denied tools
- tool timeout
- tool retry policy
- remote tool permissions

### 6.3 prompt_policy

用于控制：

- system prompt extensions
- tone / format constraints
- domain guidance
- prohibited outputs

### 6.4 budget_policy

用于控制：

- per-run cost limit
- daily workspace budget
- per-agent budget cap
- token cap

### 6.5 observability_policy

用于控制：

- tracing level
- logging verbosity
- token capture mode
- evaluation / scoring policy

### 6.6 output_contract_policy

用于控制：

- expected schema
- output sections
- mandatory fields
- review thresholds

---

## 7. 推荐的数据模型

### 7.1 config_profiles

存放配置模板定义。

关键字段建议：

- `id`
- `tenant_id`
- `key`
- `name`
- `scope_type`
  - `global | capability | worker | sector | workspace`
- `config_type`
  - `model_policy | tool_policy | prompt_policy | budget_policy | observability_policy | output_contract_policy`
- `version`
- `status`
  - `draft | active | archived`
- `payload`
  - jsonb
- `created_by`
- `created_at`
- `updated_at`

### 7.2 capability_profiles

存放能力模板定义。

关键字段建议：

- `id`
- `tenant_id`
- `key`
- `name`
- `description`
- `default_profile_ids`
  - jsonb or relation table
- `created_at`
- `updated_at`

### 7.3 worker_profiles

存放数字劳动力实例档案。

关键字段建议：

- `id`
- `tenant_id`
- `agent_key`
- `name`
- `manifest_ref`
- `default_capability_profile_id`
- `status`
- `created_at`
- `updated_at`

### 7.4 config_bindings

存放配置分配关系。

关键字段建议：

- `id`
- `tenant_id`
- `target_type`
  - `worker | capability | business_sector | workspace | task_run`
- `target_id`
- `profile_id`
- `priority`
- `is_enabled`
- `effective_from`
- `effective_to`
- `created_at`

### 7.5 worker_assignments

存放数字劳动力在业务板块 / Workspace 下的分配关系。

关键字段建议：

- `id`
- `tenant_id`
- `worker_profile_id`
- `business_sector_id`
- `workspace_id`
- `assignment_mode`
  - `default | optional | hidden | required`
- `visibility_scope`
  - `sector | workspace`
- `created_at`
- `updated_at`

### 7.6 runtime_resolved_configs

可选表，用于保存运行时解析后的配置快照。

关键字段建议：

- `id`
- `task_run_id`
- `worker_profile_id`
- `resolved_payload`
- `resolution_trace`
- `created_at`

这个表的价值在于：

- 审计
- 回放
- 调试
- 为什么这次任务用了这个配置

---

## 8. 数字劳动力分配模型

### 8.1 分配不等于启用

建议区分：

- `assigned`
  - 这个数字劳动力在这个范围内可用
- `default`
  - 默认可见 / 默认优先
- `required`
  - 某流程必须可用
- `hidden`
  - 平台存在，但当前场景不展示

### 8.2 业务板块级分配

适合做：

- 某板块默认有哪些数字劳动力
- 某板块默认隐藏哪些数字劳动力

### 8.3 Workspace 级分配

适合做：

- 某项目临时启用特定数字劳动力
- 某项目关闭某些高成本数字劳动力

### 8.4 分配与配置绑定是两层关系

不要把“可见性”和“配置覆盖”混成一个字段。

应该拆开：

- `worker_assignments`
  - 解决“谁能用”
- `config_bindings`
  - 解决“怎么用”

---

## 9. 运行时配置解析器

### 9.1 解析顺序

运行时建议按以下顺序合并：

1. Global Config
2. Capability Profile
3. Worker Default Profile
4. Business Sector Override
5. Workspace Override
6. TaskRun Override

### 9.2 解析结果

运行时应得到一份最终配置对象，例如：

```ts
interface ResolvedWorkerConfig {
  modelPolicy: object
  toolPolicy: object
  promptPolicy: object
  budgetPolicy: object
  observabilityPolicy: object
  outputContractPolicy: object
}
```

### 9.3 解析器还应产出 trace

建议同时返回：

- 最终值
- 来自哪一层
- 被哪一层覆盖

示例：

```ts
interface ConfigResolutionTrace {
  field: string
  finalValue: unknown
  resolvedFrom: string
  overriddenSources: string[]
}
```

这样 UI 和运维都能解释“为什么”。

---

## 10. 推荐的管理界面

### 10.1 Config Center

统一配置中心，按配置类型查看：

- 模型策略
- 工具策略
- 预算策略
- 观测策略
- 输出策略

### 10.2 Worker Assignment Console

按业务板块或 Workspace 管理数字劳动力分配：

- 默认启用
- 可选启用
- 必须启用
- 隐藏

### 10.3 Resolution Inspector

查看某次任务或某个数字劳动力当前生效的最终配置：

- 当前模型
- 当前预算
- 当前工具权限
- 当前 prompt policy
- 配置来源解释

---

## 11. 和现有架构的关系

### 11.1 与 Workspace-first 模型关系

配置中心不能破坏：

`Business Sector -> Workspace -> TaskRun -> Runtime Thread`

配置只是作用在这个主链路上，不应反过来成为主容器。

### 11.2 与 Worker / Agent Manifest 关系

Manifest 负责：

- 角色定义
- 输入输出 contract
- 基础能力说明

Config Profile 负责：

- 实际运行策略
- 环境化配置
- 预算与观测约束

### 11.3 与 Metrics / ROI 模块关系

配置中心后续要支持：

- 不同配置档位的绩效比较
- 不同模型策略的 ROI 比较
- 不同预算策略的成功率比较

因此后续 `agent_runs` 最好记录：

- `resolved_config_id`
- 或 `config_fingerprint`

这样才能做配置效果分析。

---

## 12. 推荐的落地顺序

### 第一阶段

先落最小可用版本：

- `config_profiles`
- `worker_profiles`
- `worker_assignments`
- 基础运行时解析器

### 第二阶段

补：

- `config_bindings`
- Business Sector / Workspace override
- Resolution inspector

### 第三阶段

补：

- 版本控制
- 生效时间
- 灰度发布
- 配置审计日志

### 第四阶段

结合 metrics 模块，做：

- 配置档位绩效分析
- 配置 A/B test
- ROI 对比

---

## 13. Final Recommendation

CIForce 更好的做法不是：

`给每个 agent 塞一份独立配置`

而是：

`建立统一配置中心，用分层配置模板 + 数字劳动力分配关系 + 运行时解析器来管理平台行为`

一句话总结：

`先把配置定义和分配关系拆开，再让运行时去做合并解析，这比单个 agent 自带一坨配置更适合数字劳动力平台。`
