# Founder's First Day + Talent Marketplace V1 设计文档

## 0. 文档信息
- 产品名: Agentic Productivity Platform (V1)
- 引导主题: Founder's First Day（创始人第一天）
- 文档版本: v1.0
- 日期: 2026-05-06
- 适用对象: 产品、设计、前端、后端、数据、开发商运营

---

## 1. 目标与范围

### 1.1 业务目标
1. 让新用户在 3 分钟内完成“招募 -> 连线 -> 反馈 -> 自动化预览”的首轮激活。
2. 将“人才市场”打造为第二主场，提升 Agent 入职率与开发商供给活跃度。
3. 建立可视化、可解释、可量化的 Agent 协作与绩效体系。

### 1.2 V1 范围（In Scope）
1. 四幕式新手引导（沉浸式剧情）
2. 双主场结构：工作台 + 人才市场
3. 可折叠信息架构：缩略卡/展开板
4. 单 Agent 操作面板（任务、成果、绩效、复制、解雇等）
5. 开发商极简接入（Manifest + Skills + 定价）
6. 语义握手协议（Input Expectation / Output Promise）
7. 关键埋点和漏斗

### 1.3 V1 非范围（Out of Scope）
1. 复杂结算与发票体系
2. 多组织权限深度模型
3. 全量第三方数据胶囊市场化

---

## 2. 核心产品概念

### 2.1 三个核心对象
1. Agent: 数字员工，具备角色、技能、成本和绩效。
2. Pipeline: Agent 之间的协作链路，承载任务流转。
3. Workspace: 用户操作场，分自动工作区与手动交互区。

### 2.2 核心承诺
1. 三分钟开公司
2. 一眼看人效
3. 一键从手动到自动
4. 协议可解释，协作可追踪

---

## 3. 新手引导（Founder's First Day）

### 3.1 第一幕：点亮办公室（Lighting Ceremony）
- 初始画面: 全黑 + 中央发光指纹键
- 用户动作: 点击“点亮我的公司”
- 反馈:
  1. 办公室玻璃分层点亮
  2. 工位逐个激活
  3. 文案: “Boss，您的数字公司已准备就绪，现在，让我们招募第一位员工。”
- 完成条件: `lighting_completed = true`

### 3.2 第二幕：人才面试（First Interview）
- 镜头引导: 平移至人才市场入口
- 高亮对象: 口播小王
- 用户动作:
  1. 点击“面试”
  2. 输入关键词（如“防晒霜”）
  3. 触发试写
- 反馈:
  1. 即时输出样例文案
  2. 引导“满意即入职”
- 完成条件: `agent_xiaowang_hired = true`

### 3.3 第三幕：建立链路（Pipeline Connection）
- 引导文案: “一个好编剧需要一个好剪辑。”
- 用户动作:
  1. 入职剪辑小陈
  2. 拖拽连线（小王 -> 小陈）
- 反馈:
  1. 连线变发光管道
  2. 语义协议对齐提示
- 完成条件: `pipeline_xw_xc_connected = true`

### 3.4 第四幕：带教到自动化（Coach to Auto）
- 引导对象: 工位控制杆（Coach/Auto）
- 用户动作:
  1. 点赞一次输出
  2. 切换 Auto 预览
- 反馈:
  1. 偏好学习 +1
  2. 自动准备就绪提示
- 完成条件:
  1. `first_feedback_submitted = true`
  2. `auto_mode_previewed = true`

---

## 4. 信息架构（可缩略/可展开）

### 4.1 顶层结构
1. Top Bar（模式与全局）
2. Main Stage（三栏弹性区）
3. Bottom Dock（战略入口）

### 4.2 三栏布局
1. 左栏: Agent 墙（缩略）/ Agent 管理（展开）
2. 中栏: 主舞台（Auto 或 Manual）
3. 右栏: 侧板（绩效/存档/告警）可切换并钉住

### 4.3 缩略/展开统一规则
1. 缩略态显示: 主指标 + 次指标 + 1 条待办
2. 展开态必须有: 详情 + 动作按钮 + 收起入口
3. 支持 pin 固定展开

---

## 5. 功能分区详细设计

## 5.1 自动工作区（Auto Zone）

### 缩略卡
1. 今日自动产出
2. 并行流程数
3. 成功率
4. 最近异常提示

### 展开态
1. 流程泳道图（每条包含触发条件、当前节点、SLA）
2. 实时事件流（成功/重试/阻塞）
3. 快捷操作（暂停全部/恢复/转人工）
4. 异常抽屉（送复盘室）

## 5.2 手动交互区（Manual Studio）

### 缩略卡
1. 待确认任务数
2. 待反馈内容数
3. 最近人工干预收益

### 展开态
1. 对话式任务输入
2. 拖拽协作画布
3. 即时评审（点赞/改写/重试/退回）
4. 一键保存为自动模板

## 5.3 存档室（Archive Room）

### 缩略卡
1. 总作品数
2. 今日新增
3. 近 7 天最佳作品提示

### 展开态
1. 搜索与筛选（关键词、Agent、日期、渠道、状态）
2. 列表字段（标题、来源流程、渠道、核心指标、版本）
3. 详情抽屉（预览、下载、分享、复用）
4. 固定统计: 近 7 天合格率

## 5.4 绩效中心（Performance Hub）

### 缩略卡
1. 今日节省工时
2. 人效比（产出/薪资）
3. Top Agent

### 展开态
1. 维度切换（公司/流程/Agent）
2. 指标组（效率/质量/成本/稳定）
3. 趋势图（7 天/30 天）
4. 排行榜与异常分布

---

## 6. 人才市场（重点）

### 6.1 产品定位
- 与工作台同级的第二主场
- 前台: 用户招聘与组队
- 后台: 开发商供给与增长

### 6.2 市场首页（Marketplace Home）
1. 搜索 + 场景标签 + 排序过滤
2. 栏目:
   - 新手必备三件套
   - 为你推荐
   - 本周高回报
   - 新上架
3. 右侧悬浮候选清单（可对比、可一键入职）

### 6.3 人才卡（缩略）
1. 角色与标签
2. 关键指标（7日产出、成功率、均时、费用）
3. 兼容度与推荐理由
4. 按钮（试用面试、加入候选、查看详情）

### 6.4 人才详情（展开）
1. 能力说明（Input Expectation / Output Promise）
2. 实战样例（3 条）
3. 绩效曲线
4. 搭配建议（最佳拍档/替代）
5. 开发商可信层（认证、更新时间、维护状态）
6. 固定动作条（试用、候选、入职到流程）

### 6.5 对比模式（最多 3 位）
1. 对比维度: 成本、质量、速度、稳定、兼容
2. 系统推荐 + 理由解释
3. 行动: 入职推荐/组队入职

### 6.6 一键组队（Bundle Hiring）
1. 展示标准岗位组合（编剧/剪辑/质检）
2. 支持岗位替换，实时刷新组合评分
3. 入职前校验（协议与依赖）
4. 一键入职并自动连线

---

## 7. 单 Agent 操作面板（Agent Command Panel）

点击任意 Agent 头像弹出菜单:
1. 新建交互任务
2. 查看工作成果
3. 查看绩效
4. 找同类生产力
5. 复制（克隆）
6. 解雇（含二次确认与影响提示）
7. 更多（调薪、权限、协议、时段）

风险提示:
1. 解雇前显示受影响流程
2. 复制前确认是否共享记忆与偏好

---

## 8. 开发商端（Provider Side）

### 8.1 零重力接入（3 步）
1. Manifest（定义人设与输入输出）
2. 上传 Skills
3. 定价（时薪/件薪）

### 8.2 职场模拟器
1. 上传后自动与标准 Agent 握手测试
2. 输出通过率、延迟、失败原因
3. 提供修复建议

### 8.3 收益与增长
1. 余额实时变动
2. 转化漏斗（曝光 -> 试用 -> 入职 -> 留存）
3. 版本更新影响分析

---

## 9. 语义握手协议（Semantic Handshake）

### 9.1 强制字段
1. Input Expectation
2. Output Promise
3. Unsupported Scenarios

### 9.2 对齐逻辑
1. 平台将 A 的 Output Promise 映射成 B 的 Prompt 上下文
2. 映射失败时阻断自动连线并给出修复提示

### 9.3 示例
- A（口播）输出: 带节奏标签文本
- 平台映射给 B（剪辑）: 按节奏标签切片

---

## 10. 状态机设计

### 10.1 Agent 状态
- `idle | interviewing | hired | working | blocked | offline`

### 10.2 Pipeline 状态
- `unlinked | linking | aligned | active | paused | broken`

### 10.3 模式状态
- `coach | auto_ready | auto`

### 10.4 关键事件
1. `LIGHT_ON`
2. `INTERVIEW_SUBMIT`
3. `AGENT_HIRE`
4. `PIPELINE_DRAW_COMPLETE`
5. `SEMANTIC_HANDSHAKE_OK`
6. `LIKE_FEEDBACK`
7. `MODE_SWITCH_AUTO_PREVIEW`

---

## 11. 数据结构建议（前端/后端）

```ts
export type BillingModel = "per_task" | "per_hour";
export type AgentStatus = "active" | "paused" | "offline";
export type VerificationLevel = "official" | "community" | "unverified";

export interface ProviderProfile {
  providerId: string;
  name: string;
  verificationLevel: VerificationLevel;
  responseSlaHours: number;
  activeMaintaining: boolean;
  lastUpdatedAt: string;
  totalAgents: number;
  rating: number;
}

export interface AgentMetrics {
  sevenDayOutput: number;
  successRate: number;
  reworkRate: number;
  avgDeliveryMinutes: number;
  unitCost: number;
  roiScore: number;
}

export interface IOExpectation {
  inputExpectation: string[];
  outputPromise: string[];
  unsupportedScenarios: string[];
}

export interface AgentCardModel {
  agentId: string;
  name: string;
  role: string;
  tags: string[];
  avatarUrl: string;
  status: AgentStatus;
  billingModel: BillingModel;
  price: number;
  compatibilityScore: number;
  metrics: AgentMetrics;
  provider: ProviderProfile;
}
```

---

## 12. 埋点与指标体系

### 12.1 关键埋点
1. `onboarding_start`
2. `lighting_completed`
3. `interview_started`
4. `interview_result_generated`
5. `first_agent_hired`
6. `first_pipeline_connected`
7. `first_feedback_given`
8. `auto_preview_entered`
9. `marketplace_view`
10. `agent_card_exposed`
11. `agent_detail_view`
12. `candidate_added`
13. `compare_opened`
14. `hire_precheck_started`
15. `handshake_check_passed`
16. `hire_confirmed`

### 12.2 核心漏斗
1. 引导漏斗: Start -> Completed
2. 市场漏斗: 曝光 -> 点击 -> 试用 -> 入职
3. 留存指标: D1 二次登录率

### 12.3 经营指标
1. 人才市场入职转化率
2. 单 Agent 回本周期
3. 组合包复购率
4. 开发商活跃供给率

---

## 13. 视觉与交互规范（摘要）

1. 每个区块都支持缩略与展开两态
2. 颜色语义:
   - 正常: 绿
   - 预警: 黄
   - 异常: 红
3. 动效建议:
   - 点亮: 300ms 分段
   - 连线发光: 200ms
   - 面板展开: 240ms
4. 文案规范:
   - 称呼统一 Boss
   - 每步一个主 CTA

---

## 14. 交付物清单（V1）

### 14.1 标杆员工包
1. 医药研究员（LINGNEXUS）
2. 电商编剧（小王）
3. 自动剪辑师（小陈）

### 14.2 前端交付
1. Dashboard 三栏可折叠
2. Marketplace 全链路页面
3. Agent Command Panel
4. 对比与组队模块

### 14.3 平台交付
1. 语义握手引擎
2. 对话式入职引擎
3. 开发商模拟器
4. 自动面试官

---

## 15. 里程碑建议

### M1（第 1-2 周）
1. IA 与低保真
2. 状态机与埋点定义
3. 人才市场首页 + 人才卡

### M2（第 3-4 周）
1. 人才详情 + 试用面试 + 候选清单
2. 单 Agent 操作面板
3. 开发商 3 步上架流程

### M3（第 5-6 周）
1. 对比 + 组队 + 一键连线
2. 协议校验与预检查
3. 引导全链路打通

### M4（第 7-8 周）
1. 数据看板与性能优化
2. 文案打磨与可用性测试
3. 灰度发布

---

## 16. 风险与缓解

1. 风险: 市场排序黑箱导致信任下降
- 缓解: 展示推荐理由与关键因子

2. 风险: 协议不兼容导致“入职即失败”
- 缓解: 入职前强制 handshake precheck

3. 风险: 指标多导致认知负担
- 缓解: 缩略态只保留主次指标 + 待办提示

4. 风险: 开发商供给质量不稳定
- 缓解: 模拟器评分与版本维护透明化

---

## 17. 验收标准（UAT）

1. 新用户 3 分钟引导完成率 >= 60%
2. 人才市场访问 -> 入职转化率 >= 20%
3. 首次入职后 24h 内二次登录率 >= 35%
4. 入职后首次任务成功率 >= 80%
5. 协议不兼容拦截准确率 >= 95%

---

## 18. 附录：页面清单

1. `/dashboard`
2. `/marketplace`
3. `/marketplace/agent/[agentId]`
4. `/marketplace/compare`
5. `/marketplace/bundle/[bundleId]`
6. `/provider/console`
7. `/provider/simulator/[agentId]`

