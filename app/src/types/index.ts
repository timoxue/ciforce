import type { Edge, Node } from '@xyflow/react';

export type AgentStatus = 'idle' | 'interviewing' | 'hired' | 'working' | 'blocked' | 'offline';

export interface AgentIOExpectation {
  input: string[];
  output: string[];
  unsupported: string[];
}

export interface AgentExample {
  input: string;
  output: string;
}

export interface AgentProvider {
  name: string;
  verified: boolean;
  lastUpdated: string;
  slaHours: number;
}

export type AgentCategory = '电商营销' | '短视频' | '数据挖掘' | '创意设计' | '客户服务' | '办公自动化' | '多语言';

export interface Agent {
  id: string;
  name: string;
  role: string;
  avatar: string;
  status: AgentStatus;
  metrics: {
    output: number;
    successRate: number;
    price: string;
    priceValue: number;       // numeric for sorting
    avgTime: string;
    roi: string;
    roiValue: number;         // numeric for sorting
    growth: string;
  };
  tags: string[];
  category: AgentCategory;
  description: string;
  rating: number;             // 4.0–5.0
  reviewCount: number;
  hireCount: number;          // total hired count
  isNew?: boolean;
  isTrending?: boolean;
  isFavorite?: boolean;
  compatibilityScore?: number;
  ioExpectation?: AgentIOExpectation;
  examples?: AgentExample[];
  partnerIds?: string[];
  provider?: AgentProvider;
  jobSpec?: JobSpec;
}

export interface PipelineNode {
  id: string;
  type: string;
  data: { label: string; agentId?: string };
  position: { x: number; y: number };
}

export interface PipelineEdge {
  id: string;
  source: string;
  target: string;
  animated?: boolean;
}

export interface Metric {
  label: string;
  value: string | number;
  trend?: string;
  unit?: string;
}

export type AppMode = 'coach' | 'auto';

export interface JobSpec {
  channels: string[];
  contentTags: string[];
  scenario: string;
  qualityThreshold: number;
}

export interface SimScenario {
  name: string;
  count: number;
  passRate: number;
  avgLatencyMs: number;
  status: 'pass' | 'warn' | 'fail';
}

export interface SimReport {
  agentId: string;
  timestamp: string;
  overallPassRate: number;
  avgLatencyMs: number;
  failRate: number;
  totalTests: number;
  scenarios: SimScenario[];
  suggestions: string[];
  passed: boolean;
}

export interface SimParams {
  channel: string;
  scenarioTags: string[];
  concurrency: 10 | 50 | 200;
  qualityThreshold: number;
}

export type WorkspaceStatus = 'draft' | 'active' | 'archived';
export type BusinessSectorStatus = 'draft' | 'published' | 'live' | 'active' | 'archived';
export type WorkspaceFileKind = 'brief' | 'asset' | 'report' | 'knowledge' | 'other';
export type WorkspaceTaskStatus = 'idle' | 'queued' | 'running' | 'done' | 'error';

export interface WorkspaceCanvas {
  nodes: Node[];
  edges: Edge[];
}

export interface WorkspaceFile {
  id: string;
  workspaceId: string;
  name: string;
  kind: WorkspaceFileKind;
  mimeType?: string;
  sizeBytes?: number;
  source?: 'upload' | 'generated' | 'linked';
  createdAt: string;
}

export interface WorkspaceTaskRun {
  id: string;
  workspaceId: string;
  businessSectorId: string;
  agentKey: string;
  title: string;
  status: WorkspaceTaskStatus;
  threadId?: string;
  startedAt: string;
  completedAt?: string;
}

export interface WorkspaceMemoryRef {
  id: string;
  workspaceId: string;
  title: string;
  content: string;
  source: 'note' | 'task_output' | 'file_extract';
  createdAt: string;
}

export interface Workspace {
  id: string;
  businessSectorId: string;
  name: string;
  description: string;
  status: WorkspaceStatus;
  canvas: WorkspaceCanvas;
  fileIds: string[];
  taskIds: string[];
  memoryIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BusinessSectorAgentSummary {
  name: string;
  avatar: string;
  role: string;
}

export interface BusinessSector {
  id: string;
  name: string;
  description: string;
  status: BusinessSectorStatus;
  version: string;
  templateCanvas: WorkspaceCanvas;
  workspaceIds: string[];
  summaryAgents?: BusinessSectorAgentSummary[];
  summarySteps?: string[];
  summaryMetric?: { label: string; val: string };
  vegaMessage?: string;
  createdAt: string;
  updatedAt: string;
}
