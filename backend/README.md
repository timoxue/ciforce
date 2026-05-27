# CIForce Backend

## 快速启动

### 1. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env，填入 DeepSeek API Key
```

DeepSeek 平台: `https://platform.deepseek.com`

如果本机存在错误的代理环境变量，建议默认关闭 LLM 客户端对系统代理的继承：

```bash
OPENAI_DOTENV_OVERRIDE=true
OPENAI_TRUST_ENV=false
OPENAI_TIMEOUT_SECONDS=60
```

只有在你明确需要通过公司代理访问外网时，再把 `OPENAI_TRUST_ENV=true` 打开。
如果系统环境变量里残留了旧的 `OPENAI_API_KEY`，本地开发时可以保持 `OPENAI_DOTENV_OVERRIDE=true`，让 `.env` 中的新 key 优先生效。

### 2. 安装依赖

```bash
pip install -r requirements.txt
```

### 3. 启动服务

```bash
python main.py
# 或
uvicorn main:app --reload --port 8000
```

启动后访问 `http://localhost:8000/docs` 查看 API 文档。

## VEGA 持久化模式

当前 VEGA 运行时分为两层持久化：

- `runtime metadata`
  - `task_runs`
  - `runtime_threads`
  - `agent_runs`
  - `task_run_events`
- `LangGraph checkpoint`

推荐使用方式：

- 本地开发默认使用 `sqlite`
- 正式环境优先把 `runtime metadata` 切到 `Postgres`
- `checkpoint` 可以先继续保留在 `sqlite`

关键配置示例：

```bash
# 默认本地模式
VEGA_RUNTIME_STORE=sqlite
VEGA_RUNTIME_DB_PATH=data/vega.db
VEGA_CHECKPOINT_DB_PATH=data/vega.db

# 运行时元数据切到 Postgres
# VEGA_RUNTIME_STORE=postgres
# VEGA_RUNTIME_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ciforce
# VEGA_CHECKPOINT_DB_PATH=data/vega.db
```

说明：

- `.env` 用来提供默认值
- 如果你在命令行或 Docker 环境中显式设置了同名环境变量，运行时会优先使用外部环境变量

## Docker Compose

根目录 `docker-compose.yml` 当前包含：

- `postgres`
- `backend`
- `frontend`

启动命令：

```bash
docker compose up --build
```

默认行为：

- `postgres` 会启动并初始化 VEGA runtime metadata 表
- `backend` 是否真的使用 Postgres，由 `backend/.env` 中的 `VEGA_RUNTIME_STORE` 决定
- 如果不修改 `.env`，当前仍然默认使用 `sqlite`

如果要启用 Postgres runtime metadata：

```bash
# backend/.env
VEGA_RUNTIME_STORE=postgres
VEGA_RUNTIME_DATABASE_URL=postgresql://postgres:postgres@postgres:5432/ciforce
VEGA_CHECKPOINT_DB_PATH=data/vega.db
```

说明：

- 容器内访问数据库时主机名应使用 `postgres`
- 初始化 SQL 位于 `backend/db/init/001_vega_runtime_metadata.sql`

## Runtime Store 自检

可以用下面的脚本验证当前配置的 VEGA runtime store 是否可用：

```bash
python scripts/verify_vega_runtime_store.py
```

脚本会按当前 `.env` 配置连接 store，并写入一组 `smoke-*` 测试记录，覆盖：

- `task_runs`
- `runtime_threads`
- `agent_runs`
- `task_run_events`

默认行为：

- 如果当前是 `sqlite`，脚本默认使用临时测试库，避免污染正在运行的本地数据文件
- 如果你确实要验证当前配置的正式 sqlite 文件，可以先设置：

```bash
VEGA_RUNTIME_SMOKE_USE_CONFIGURED_SQLITE=true
```

如果成功，会输出一段 JSON 结果。

临时验证 Postgres 的 Windows `cmd` 示例：

```bat
set VEGA_RUNTIME_STORE=postgres
set VEGA_RUNTIME_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ciforce
python backend\scripts\verify_vega_runtime_store.py
```

## 接口说明

### POST `/api/research`

触发数据分析研究，SSE 流式返回。

请求示例：

```json
{
  "query": "分析2026年中国防晒市场竞争格局",
  "agent_id": "data-analyst-v1",
  "report_type": "research_report"
}
```

SSE 事件类型：

| type | 含义 |
| --- | --- |
| `status` | VEGA 进度消息 |
| `source` | 发现的参考来源 URL |
| `content` | 报告内容片段 |
| `done` | 研究完成 |
| `error` | 错误信息 |

### GET `/health`

检查服务状态和核心配置。

## 搜索提供商切换

在 `.env` 中修改 `RETRIEVER`：

| 值 | 说明 | 费用 |
| --- | --- | --- |
| `duckduckgo` | 默认，无需 Key | 免费 |
| `tavily` | 更稳定，需要 `TAVILY_API_KEY` | 每月有免费额度 |
| `bing` | 需要 `BING_API_KEY` | 按量付费 |
