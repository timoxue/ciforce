# HireModal JobSpec 升级 + 职场模拟器 设计文档

## 0. 文档信息
- 日期: 2026-05-09
- 关联文档: FOUNDERS_FIRST_DAY_V1_DESIGN.md（§6、§8）
- 涉及文件:
  - `reference/src/pages/marketplace/HireModal.tsx`
  - `reference/src/store/useAppStore.ts`
  - `reference/src/types/index.ts`
  - `reference/src/mocks/fixtures.ts`
  - `reference/src/App.tsx`
  - 新增: `reference/src/pages/provider/Simulator.tsx`

---

## 1. 目标

1. **HireModal 升级为 3步流程**，在协议预检后增加 JobSpec 配置步骤，让用户填写渠道、内容要求、业务场景和合格率基准，保存为 JobSpec 附在已入职 Agent 上。
2. **新建职场模拟器页面** `/provider/simulator/:agentId`，开发者可用真实 JobSpec 参数对 Agent 进行压力测试，查看通过率、延迟、失败原因和修复建议。
3. **两者联动**：JobSpec 存储在 agentStore，模拟器读取同一结构作为测试基准参数。Provider Console 的"进入模拟器"按钮跳转到该页面并预填 agent。

---

## 2. 数据结构变更

### 2.1 新增 JobSpec 类型（types/index.ts）

```ts
export interface JobSpec {
  channels: string[];           // ['小红书', '抖音']
  contentTags: string[];        // ['爆款标题', '带 Emoji', '含 Hashtag']
  scenario: string;             // 业务场景自由文本
  qualityThreshold: number;     // 合格率基准 0–100
}
```

### 2.2 Agent 类型扩展

```ts
export interface Agent {
  // ...现有字段不变...
  jobSpec?: JobSpec;            // 入职时用户填写，可选
}
```

### 2.3 Store 变更（useAppStore.ts）

`hireAgent` 签名扩展：
```ts
hireAgent: (agent: Agent, jobSpec?: JobSpec) => void;
```
实现：将 jobSpec 合并进 agent 存入 hiredAgents。

新增 `useSimulatorStore`（独立 slice）：
```ts
interface SimulatorStore {
  status: 'idle' | 'running' | 'done';
  report: SimReport | null;
  runSimulation: (agentId: string, params: SimParams) => void;
  resetReport: () => void;
}
```

---

## 3. HireModal 升级（3步）

### Step 1: 协议预检（现有逻辑保留）
- 展示 Agent 卡片
- 单 Agent：显示独立运行说明
- 多 Agent：显示语义握手预检结果
- 下一步按钮

### Step 2: JobSpec 配置（新增）
字段：
| 字段 | 控件 | 选项 |
|------|------|------|
| 目标渠道 | 多选按钮网格 | 小红书 / 抖音 / 微博 / 视频号 / 私域 / 全渠道 |
| 内容要求 | 多选 Chip | 爆款标题 / 带 Emoji / 含 Hashtag / 口语化 / 专业风格 / 500字内 |
| 业务场景 | textarea | 自由输入，placeholder 给示例 |
| 合格率基准 | 数字输入 | 默认 85，范围 60–99 |

- 字段均为可选；若全部留空，跳过直接入职
- "← 返回"回到 Step 1

### Step 3: 入职成功
- 大字入职成功 + emoji 动画（保留现有 confetti hearts）
- 摘要展示：渠道 / 基准（若已填）
- 两个跳转按钮：「前往工作台」`navigate('/dashboard')` / 「继续招募」`closeHireModal()`

### 状态管理
`HireModal` 本地 state：
```ts
const [step, setStep] = useState<1|2|3>(1);
const [jobSpec, setJobSpec] = useState<Partial<JobSpec>>({
  channels: [], contentTags: [], scenario: '', qualityThreshold: 85
});
```
确认入职时调用 `hireAgent(agent, jobSpec as JobSpec)`。

---

## 4. 职场模拟器页面

### 路由
`/provider/simulator/:agentId`（可选 param，无则显示 agent 选择器）

### 布局
两栏（左 360px 固定 / 右自适应），与 Provider Console 同样的 nav header。

### 左栏：测试参数配置
1. **测试对象** — 显示当前 agentId 对应的 agent 卡（从 `marketplaceAgents` 查找）；若无 param 则显示下拉选择。
2. **目标渠道** — select 单选（小红书 / 抖音 / 全渠道3平台）
3. **测试场景** — 多选 Chip（电商促销 / 品牌种草 / 节日营销 / 日常运营）；若 agent 有 jobSpec 则预填
4. **并发测试数** — 3档按钮（10 / 50 / 200），默认 50
5. **合格率基准** — 数字输入，若 agent.jobSpec 存在则预填其 `qualityThreshold`，显示"(来自 JobSpec)"标注
6. **运行按钮** — 触发 `runSimulation(agentId, params)`

### 右栏：测试报告
**idle 态**：居中图标 + 提示文案"配置参数后点击运行，获取绩效预估报告"

**running 态**：进度动画（模拟 2s loading bar）+ "测试中..." 文案

**done 态**：
1. KPI 卡片行（4格）：综合通过率 / 平均延迟 / 失败率 / 完成数
2. 分场景结果列表（scenario × channel 组合，每行显示通过率 + 延迟 + 彩色状态点）
3. 优化建议区块（`suggestion-box`，绿色边框）
4. 操作行：下载报告 / 历史记录 / **通过校验→立即上架**（仅当通过率≥基准时高亮）

### Mock 数据
`fixtures.ts` 新增 `mockSimReport`：
```ts
export interface SimReport {
  agentId: string;
  timestamp: string;
  overallPassRate: number;
  avgLatencyMs: number;
  failRate: number;
  totalTests: number;
  scenarios: SimScenario[];
  suggestions: string[];
  passed: boolean;         // overallPassRate >= qualityThreshold
}

export interface SimScenario {
  name: string;
  count: number;
  passRate: number;
  avgLatencyMs: number;
  status: 'pass' | 'warn' | 'fail'; // pass ≥ 90, warn 70–89, fail < 70
}
```

---

## 5. 联动路径

```
用户在 Marketplace 入职 Agent
  → HireModal Step2 填写 JobSpec
  → hireAgent(agent, jobSpec) 存入 agentStore.hiredAgents[].jobSpec

开发者在 Provider Console 点击"进入模拟器"
  → navigate('/provider/simulator/agent-1')
  → Simulator 读取 agentId 的 jobSpec.qualityThreshold 预填基准
  → 运行测试，报告包含针对 jobSpec.channels 的分场景结果

Simulator runSimulation (mock 实现)
  → status = 'running' → setTimeout 2000ms → status = 'done', report = mockSimReport
```

---

## 6. 路由注册（App.tsx）

```tsx
<Route path="/provider/simulator/:agentId?" element={<ProviderSimulator />} />
```
（`agentId?` 可选参数，无则展示选择器）

---

## 7. 风格规范（与现有页面一致）

- 背景：`bg-bg-dark` (`#020617`)
- 卡片：`glass-panel` / `business-card` class
- Provider 侧主色：`text-emerald-500` / `bg-emerald-500`（green）
- Marketplace 侧主色：`accent-marketplace` (`#8b5cf6`，purple）
- 字体：Inter sans / JetBrains Mono for 数字
- 标签：`text-[10px] font-bold uppercase tracking-widest`
- 数值：`text-[11px] font-mono`
- 动效：motion/react，进入 `initial opacity-0 y-20`，exit scale-0.95

---

## 8. 验收标准

1. HireModal Step2 所有字段可正常选择/输入，可跳过（均可选）
2. 入职后 `hiredAgents` 中的 agent 包含 `jobSpec` 字段
3. `/provider/simulator/agent-1` 可正常访问，agentId 对应 agent 信息正确显示
4. Provider Console "进入模拟器"按钮跳转到 `/provider/simulator` 并带上 agentId
5. 运行测试后显示 mock 报告，通过率≥基准时"立即上架"按钮高亮
6. 所有新增页面字体、间距、颜色与现有页面一致
