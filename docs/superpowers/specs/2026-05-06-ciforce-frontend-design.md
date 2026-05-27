# CIForce — Agentic Productivity Platform 前端设计文档

**日期**: 2026-05-06  
**版本**: v1.0  
**范围**: 前端原型（无真实后端，Zustand + MSW 模拟）

---

## 1. 技术栈

| 层次 | 选型 |
|------|------|
| 框架 | Next.js 15 App Router |
| 样式 | Tailwind CSS v4（CSS 变量双主题） |
| 语言 | TypeScript |
| 基础组件 | shadcn/ui（表单、弹窗等基础件） |
| 动效 | Framer Motion |
| Pipeline 画布 | React Flow |
| 全局状态 | Zustand（按模块切片） |
| 状态机 | XState v5（Agent / Pipeline / Mode） |
| Mock 接口 | MSW v2 + TanStack Query |
| Mock 数据 | Hardcoded JSON fixtures |

---

## 2. 视觉规范

### 2.1 主题

- **默认**：深色模式（深蓝黑 `#04050e` 为底）
- **支持**：浅色模式切换
- 品牌色：紫蓝渐变 `#6366f1 → #8b5cf6`

### 2.2 颜色语义

| 含义 | 颜色 |
|------|------|
| 正常运行 | `#22c55e` 绿 |
| 预警 / 阻塞 | `#f59e0b` 黄橙 |
| 异常 / 错误 | `#ef4444` 红 |
| 自动工作区强调 | `#22d3ee` 青蓝 |
| 手动交互区强调 | `#818cf8` 紫 |
| 人才市场强调 | `#c084fc` 紫粉 |
| 绩效中心强调 | `#4ade80` 绿 |

### 2.3 动效规范

| 元素 | 时长 | 曲线 |
|------|------|------|
| 点亮办公室（引导第一幕） | 300ms 分段 stagger | easeOut |
| Pipeline 连线发光 | 200ms | easeInOut |
| 面板展开 / 折叠 | 240ms | easeInOut |
| Agent 卡片 hover | 150ms | easeOut |
| 人才市场侧栏折叠 | 300ms CSS transition | ease |

---

## 3. 路由架构（双旅程分离）

两条旅程完全独立——各自有独立路由组、独立 Layout、独立 Zustand Store。

```
app/
├── (user-onboarding)/          # 用户端引导，全屏沉浸式，无导航栏
│   ├── page.tsx                # 入口，自动跳转 act-1
│   ├── act-1/page.tsx          # 第一幕：点亮办公室
│   ├── act-2/page.tsx          # 第二幕：人才面试
│   ├── act-3/page.tsx          # 第三幕：建立链路
│   └── act-4/page.tsx          # 第四幕：带教到自动化
│
├── (user)/                     # 用户端主应用，共享 TopBar + Dock
│   ├── dashboard/page.tsx      # 工作台
│   └── marketplace/
│       ├── page.tsx            # 人才市场首页
│       ├── agent/[id]/page.tsx # Agent 详情
│       ├── compare/page.tsx    # 对比模式
│       └── bundle/[id]/page.tsx
│
├── (provider-onboarding)/      # 开发商引导（3步极简）
│   └── page.tsx
│
└── (provider)/                 # 开发商主应用，独立 Layout
    └── provider/
        ├── console/page.tsx    # 控制台：收益 + 漏斗
        └── simulator/[id]/page.tsx
```

根入口 `app/page.tsx` 根据 mock 身份做分流：
- 新用户（Boss）→ `/act-1`（路由组 `(user-onboarding)` 括号不计入 URL）
- 已有用户（Boss）→ `/dashboard`
- 开发商（Provider）→ `/provider/console`

---

## 4. Zustand Store 切片

### 用户端
| Store | 职责 |
|-------|------|
| `onboardingStore` | 当前幕次、completedFlags（4个完成条件） |
| `agentStore` | agents 列表、状态机实例、metrics |
| `pipelineStore` | nodes、edges、pipeline 状态 |
| `marketplaceStore` | 候选清单、筛选条件、对比列表 |
| `workspaceStore` | Coach/Auto 模式、任务队列 |
| `uiStore` | 主题、面板展开状态、人才市场折叠状态 |

### 开发商端
| Store | 职责 |
|-------|------|
| `providerStore` | Agent 列表、收益数据、版本状态 |
| `simulatorStore` | 模拟器运行状态、测试结果 |

---

## 5. 新手引导设计（Founder's First Day）

### 5.1 整体策略

- 独立路由组 `(user-onboarding)`，独立全屏 Layout，无导航栏干扰
- 全动效还原，Framer Motion 实现
- 每幕完成后写入 `onboardingStore` 对应 flag

### 5.2 第一幕：点亮办公室

- **初始画面**：全黑背景 + 网格线（`opacity: 0→0.3`）+ 中央发光指纹键（pulse 呼吸动画）
- **交互**：点击"点亮我的公司"
- **动效**：办公室玻璃楼层 `staggerChildren 300ms` 逐层点亮，border-color 从暗→紫→亮
- **结束**：镜头平移 `x: 0→-100vw` 过渡到第二幕
- **完成条件**：`lighting_completed = true`

### 5.3 第二幕：人才面试

- **镜头引导**：平移至人才市场，其他卡片 `opacity→0.3` 淡出，口播小王卡片发光放大
- **交互**：输入关键词（打字机动效），触发试写（流式输出模拟）
- **动效**：输出文案逐字流出，"满意即入职"按钮出现
- **完成条件**：`agent_xiaowang_hired = true`

### 5.4 第三幕：建立链路

- **引导**："一个好编剧需要一个好剪辑"，引导入职剪辑小陈
- **交互**：React Flow 画布，拖拽连线（小王 → 小陈）
- **动效**：连线完成后 `gray→gradient` 200ms，流光粒子沿管道流动，语义握手确认气泡弹出
- **完成条件**：`pipeline_xw_xc_connected = true`

### 5.5 第四幕：带教到自动化

- **交互**：点赞一次输出，拨动 Coach→Auto 控制杆
- **动效**：❤️ 飘出 + "偏好学习 +1" toast；拨杆 spring 弹性动效；Auto 就绪全屏扫光
- **结束**：fade + scale 过渡进入工作台
- **完成条件**：`first_feedback_submitted = true` + `auto_mode_previewed = true`

---

## 6. 工作台布局（Dashboard）

### 6.1 顶层结构

```
TopBar（48px）
  Logo | 楼层标签 | 主导航 Tab | Coach/Auto 切换 | 用户头像

工作台主区（flex row）
  左 3/4：ws-main（grid rows 3fr 2fr）
  右 1/4：人才市场侧栏（可折叠，width 260px ↔ 36px）

Bottom Dock（40px）
  绩效中心 | 存档室 | 告警 | 设置 | Boss 今日小结
```

### 6.2 左 3/4 上半（3/5）：自动工作区

**指挥中心视图**，三栏并排：

| 栏位 | 内容 |
|------|------|
| 流程健康 | Agent 节点拓扑图（小王→小陈→LING→输出），发光管道连线，流光粒子动画，3 个汇总指标（成功率/均时/阻塞数） |
| 实时输出流 | 按时间倒序显示最新输出条目，每条带来源 Agent badge 和内容摘要 |
| 需要关注 | 阻塞告警卡片（Agent 名、阻塞时长、原因摘要）+ "去手动区处理 ↓" 按钮 |

顶部操作栏：LIVE 标签、暂停全部、转人工、展开详情。

**交互闭环**：点击"去手动区处理 ↓" → 下方手动交互区自动切换到"处理卡点"模式并高亮边框。

### 6.3 左 3/4 下半（2/5）：三格

从左到右：**存档室 | 绩效中心 | 手动交互区**

#### 存档室
- 统计：总作品数、今日新增、近7天合格率（进度条）、本周最佳
- 搜索入口（展开后支持关键词/Agent/日期/渠道筛选）

#### 绩效中心
- 4 指标：今日节省工时、人效比、本周ROI、回本天数，各带进度条
- Top Agent 卡片（头像 + ROI + 环比涨幅）

#### 手动交互区（右 1/3，紧邻人才市场）

双模式 Tab 切换：

**测试 / 下任务模式**
- Agent 选择器（下拉切换当前对话 Agent）
- 输出气泡（采纳 / 改写 / 重试 / 存模板）
- 输入框 + 发送

**处理卡点模式**（由告警区触发）
- 阻塞上下文卡片（Agent 名、原因、建议操作）
- Agent 最后状态展示
- 操作按钮：上传数据 / 重新触发 / 转人工
- 输入框 + 发送（橙色强调，表示处理中）

#### 手动区职责边界
- **测试**：给 Agent 下任务、调教偏好、验证输出
- **处理卡点**：人工介入阻塞流程，处理完成后流程自动恢复
- 卡点的**发现**在自动工作区，**处理**在手动区，职责干净

### 6.4 右 1/4：人才市场侧栏

**折叠状态**：36px 竖条，显示 🏪 竖排文字 + ◀ 图标，点击展开  
**展开状态**：260px，顶部显示 ▶ 图标，点击折叠

展开内容：
1. 4格统计（在库数 / 已入职 / 试用转化率 / 平均口碑）
2. 搜索栏（⌘K 快捷键）
3. 场景标签（电商 / 医疗 / 内容 / 数据）
4. 推荐 Agent 卡片列表（含试用 + 入职按钮）
5. 候选清单（可删除）
6. 发布招募需求 / 对比 / 组队入职

---

## 7. 三主视图（Tab 切换）

TopBar 主导航三个 Tab，点击切换完整视图：

### 7.1 工作台（默认）
见第 6 节。

### 7.2 人才市场（全屏）

- 顶部：页面标题 + 统计行（4格）+ 搜索栏（含筛选/排序）+ 场景标签
- 主体：左侧 Agent 网格（分栏目：新手必备 / 为你推荐 / 本周高回报 / 新上架）+ 右侧候选清单面板
- 单卡片：头像 + 角色 + 4指标（产出/成功率/单价/均时）+ 试用/入职按钮
- 右侧面板：候选清单 + 对比模式 + 一键组队 + 发布需求
- 详情页（`/marketplace/agent/[id]`）：Hero + IO协议 + 实战样例 + 绩效曲线 + 搭配建议 + 开发商信息 + 固定底栏动作

### 7.3 开发商控制台（全屏）

- 顶部：标题 + 4格统计（上架数/收益/入职次数/评分）+ 上架新 Agent 按钮
- 主体：Agent 列表（名称/状态/入职数/收益）+ 转化漏斗（5层）
- 右侧面板：本月收益 + 上架 3 步引导 + 职场模拟器入口

---

## 8. Agent 操作面板

点击任意 Agent 头像弹出快捷菜单：
1. 新建交互任务
2. 查看工作成果
3. 查看绩效
4. 找同类生产力
5. 复制（克隆）—— 确认是否共享记忆与偏好
6. 解雇（二次确认，显示受影响流程数）
7. 更多（调薪、权限、协议、时段）

---

## 9. 状态机（XState v5）

### Agent 状态
`idle → interviewing → hired → working → blocked → offline`

### Pipeline 状态
`unlinked → linking → aligned → active → paused → broken`

### 模式状态
`coach → auto_ready → auto`

### 关键事件（埋点触发点）
`LIGHT_ON` / `INTERVIEW_SUBMIT` / `AGENT_HIRE` / `PIPELINE_DRAW_COMPLETE` / `SEMANTIC_HANDSHAKE_OK` / `LIKE_FEEDBACK` / `MODE_SWITCH_AUTO_PREVIEW`

---

## 10. Mock 数据策略

- **MSW v2**：拦截所有 API 请求，返回 fixtures
- **TanStack Query**：缓存接口数据，模拟 loading/error 状态
- **Zustand**：前端状态（面板展开、模式切换、候选清单等）
- **XState**：状态机驱动 Agent/Pipeline 状态流转
- Fixtures 路径：`src/mocks/fixtures/`（agents.ts / pipelines.ts / marketplace.ts / provider.ts）

---

## 11. 开发顺序（旅程优先）

| 阶段 | 内容 |
|------|------|
| ① 新手引导 | 4 幕全动效，Framer Motion，XState onboarding 状态机 |
| ② 人才市场 | 首页 + Agent 详情 + 对比 + 组队 + 候选清单 |
| ③ 工作台 | 自动工作区（指挥中心）+ 三格底部 + 人才市场侧栏折叠 |
| ④ 开发商控制台 | 控制台 + 模拟器 + 上架流程 |

---

## 12. 验收标准（原型层面）

1. 新手引导 4 幕可完整走通，动效无卡顿
2. 工作台布局在 1440px 宽屏下比例正确（3/4 + 1/4，上 3/5 + 下 2/5）
3. 人才市场侧栏折叠/展开动画流畅（300ms transition）
4. 手动区"处理卡点"模式由告警区按钮触发，状态正确切换
5. 三主视图 Tab 切换无闪烁
6. Agent 操作面板弹出/关闭正常
7. MSW mock 数据在所有页面正确加载
8. 双主题（暗/亮）切换全局生效
