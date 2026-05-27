# Marketplace 详情 / 对比 / 入职 设计文档

**日期**: 2026-05-07
**版本**: v1.0
**范围**: Marketplace 页面内 Agent 详情 Drawer、对比 Bottom Sheet、统一入职 Modal

---

## 1. 背景与目标

reference 已实现 Marketplace 首页网格（Agent 卡片列表）。本次补全三个缺失环节：

1. **Agent 详情 Drawer** — 点击卡片查看完整能力、IO 协议、实战样例、搭配建议
2. **对比 Bottom Sheet** — 最多 3 位 Agent 多维度对比，卧底浮层形式
3. **统一入职 Modal** — 单人直接入职 / 多人组队入职，两种内容分支

所有交互均在 `Marketplace.tsx` 内完成，零路由变更，使用 Zustand 状态驱动 + AnimatePresence 动效。

---

## 2. 状态层

### 2.1 新增 `useMarketplaceStore`

在 `src/store/useAppStore.ts` 新增：

```ts
interface MarketplaceStore {
  // Agent 详情 Drawer
  selectedAgentId: string | null
  openAgentDrawer: (id: string) => void
  closeAgentDrawer: () => void

  // 对比列表（上限 3 位）
  compareList: string[]
  addToCompare: (id: string) => void
  removeFromCompare: (id: string) => void
  clearCompare: () => void

  // 底部对比 Sheet
  compareExpanded: boolean
  setCompareExpanded: (v: boolean) => void

  // 入职 Modal（单人 / 多人共用）
  hireModalOpen: boolean
  hireModalAgentIds: string[]   // 1 个 = 单人，2-3 个 = 组队
  openHireModal: (ids: string[]) => void
  closeHireModal: () => void
}
```

### 2.2 Mock 数据扩展

在 `src/mocks/fixtures.ts` 的 Agent 类型补充字段：

```ts
interface AgentDetail {
  ioExpectation: {
    input: string[]
    output: string[]
    unsupported: string[]
  }
  examples: { input: string; output: string }[]   // 3 条
  partnerIds: string[]                             // 搭配 Agent id
  compatibilityScore: number                       // 0-100
  provider: {
    name: string
    verified: boolean
    lastUpdated: string
    slaHours: number
  }
}
```

每个 mockAgent 补充对应 detail 数据（hardcoded fixtures）。

---

## 3. 组件设计

### 3.1 Agent 详情 Drawer

**触发**：点击任意 AgentCard（包括 Marketplace 网格卡片）→ `openAgentDrawer(id)`

**位置与尺寸**：
- 固定定位，右侧滑入，宽 480px，高 100vh
- 背景：`bg-slate-950/95 backdrop-blur-2xl border-l border-white/5`
- 左侧同时显示半透明遮罩（`bg-black/40`），点击遮罩关闭

**动效**：
- Drawer：`x: 480→0`，250ms easeOut（AnimatePresence）
- 遮罩：`opacity: 0→1`，200ms

**内容从上到下**：

| 区块 | 内容 |
|------|------|
| Hero | 大头像（80px）+ 名称 + 角色 + 状态 badge + tags + 4 核心指标 |
| IO 协议 | 折叠卡片，Input / Output / Unsupported 三列 badge |
| 实战样例 | 3 条，input 灰色气泡 → output 品牌色气泡 |
| 搭配建议 | 横向滚动小卡片，点击切换 Drawer 内容为对应 Agent |
| 开发商信息 | 头像 + 认证 badge + 最后更新 + SLA |

**固定底栏**（始终可见）：
```
[ 试用 ]   [ 加入对比 ]   [ 立即入职 → ]
```
- `试用`：样式 ghost，暂无实际操作（v1 占位）
- `加入对比`：调用 `addToCompare(id)`，同时显示 CompareBar
- `立即入职`：调用 `openHireModal([id])`（单人分支）

---

### 3.2 对比 Bottom Bar + Sheet

#### CompareBar（折叠态，高 64px）

**触发显示**：`compareList.length > 0` 时，从底部滑入（`y: 64→0`，AnimatePresence）

**布局**：
```
[ 头像槽×3（空槽虚线圆） ]   [ 展开对比 ]   [ 清空 ]
```
- 已加入 Agent：头像 + 右上角 × 删除按钮
- 空槽：虚线圆 + `+` 图标，颜色 `border-white/20`
- 背景：`bg-slate-950/90 backdrop-blur-xl border-t border-white/10`

#### CompareSheet（展开态，高 70vh）

**触发**：点击 `展开对比` → `setCompareExpanded(true)`
**动效**：`height: 64px→70vh`，300ms easeInOut

**内容**：
- 顶部：标题"对比分析" + 收起按钮（`↓`）
- 主体：1-3 列等宽网格（`grid-cols-{n}`），每列一个 Agent
  - 列头：头像 + 名称 + 角色
  - 对比行（7 行）：

    | 维度 | 说明 |
    |------|------|
    | 单价 | 显示价格文本 |
    | 7日产出 | 数值 |
    | 成功率 | 百分比 |
    | 平均耗时 | 时间 |
    | ROI | 百分比，最优值绿色加粗 |
    | 兼容度 | `compatibilityScore` 进度条 |
    | IO 协议 | Output 简述（截断 30 字） |

  - 每行：最优值高亮（`text-status-success font-bold`），其余 `text-slate-400`

- 底部：
  - `系统推荐：xx 综合最优`（取 ROI 最高 Agent）
  - 按钮：
    - `compareList.length === 1`：`直接入职` → `openHireModal([id])`
    - `compareList.length >= 2`：`组队入职` → `openHireModal(compareList)`

---

### 3.3 统一入职 Modal

**触发**：`hireModalOpen === true`，全屏遮罩居中弹出
**动效**：`scale: 0.95→1` + `opacity: 0→1`，200ms easeOut

#### 分支 A：单人入职（`hireModalAgentIds.length === 1`）

```
标题：确认入职

[ 头像 ] 名称 · 角色 · 单价

ℹ️ 该 Agent 可独立运行，无需与其他 Agent 握手对齐。

影响提示：入职后可在工作台手动区直接下任务，
          或后续加入 Pipeline 自动运行。

[ 取消 ]   [ 确认入职 ✓ ]
```

#### 分支 B：组队入职（`hireModalAgentIds.length >= 2`）

```
标题：确认组队入职

成员：[ 头像1 ] [ 头像2 ] [ 头像3（可选） ]

语义握手预检：
  小王 → 小陈  ✓ 协议兼容，自动连线
  小陈 → LING  ⚠ 需要手动配置输出格式

影响提示：入职后将在工作台自动连线为 Pipeline。

[ 取消 ]   [ 确认入职 ✓ ]
```

**确认后**：
1. 调用 `hireAgent()` 写入 `hiredAgents`
2. 播放 ❤️ confetti（4 颗飘出，Framer Motion `position: absolute` 随机方向）
3. 500ms 后关闭 Modal + 清空 compareList + 关闭 Sheet

---

## 4. 握手预检逻辑（Mock）

不接真实 API，直接在 fixtures 里硬编码兼容矩阵：

```ts
// src/mocks/fixtures.ts
export const handshakeMatrix: Record<string, Record<string, 'ok' | 'warn'>> = {
  'agent-1': { 'agent-2': 'ok',   'agent-3': 'warn' },
  'agent-2': { 'agent-1': 'ok',   'agent-3': 'ok'   },
  'agent-3': { 'agent-1': 'warn', 'agent-2': 'ok'   },
}
```

组队 Modal 展示时：遍历相邻对，查 matrix 渲染 ✓ / ⚠。

---

## 5. 文件变更清单

| 文件 | 操作 |
|------|------|
| `src/store/useAppStore.ts` | 新增 `useMarketplaceStore` |
| `src/mocks/fixtures.ts` | 扩展 Agent detail 字段 + handshakeMatrix |
| `src/types/index.ts` | 扩展 `Agent` 接口加 detail 字段 |
| `src/pages/marketplace/Marketplace.tsx` | 主文件：集成 Drawer + Bar + Sheet + Modal |
| `src/pages/marketplace/AgentDrawer.tsx` | 新建：Agent 详情 Drawer 组件 |
| `src/pages/marketplace/CompareBar.tsx` | 新建：底部 Bar + Sheet 组件 |
| `src/pages/marketplace/HireModal.tsx` | 新建：统一入职 Modal 组件 |

---

## 6. 验收标准

1. 点击任意 AgentCard → Drawer 从右侧滑入，内容正确渲染
2. Drawer 底栏三按钮功能正常（试用占位、加入对比、立即入职）
3. CompareBar 在 compareList > 0 时出现，= 0 时消失，动效流畅
4. CompareSheet 展开显示 1-3 列对比，最优值高亮
5. 单人 / 组队两种入职 Modal 内容正确区分
6. 握手预检标记与 handshakeMatrix 一致
7. 入职确认后 confetti 播放，状态正确清空
8. 遮罩点击 / ESC 键关闭 Drawer、Sheet、Modal
