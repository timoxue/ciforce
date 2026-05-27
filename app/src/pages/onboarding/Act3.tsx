import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useOnboardingStore } from '../../store/useAppStore';
import VegaHUD from '../../components/VegaHUD';
import {
  ReactFlow, addEdge, useNodesState, useEdgesState,
  Handle, Position, Background, BackgroundVariant,
  type NodeProps, type Connection, type Edge, type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Check } from 'lucide-react';

function AgentNode({ data }: NodeProps) {
  const d = data as { name: string; role: string; avatar: string; isSource?: boolean; connected?: boolean };
  return (
    <div className={`relative flex flex-col items-center gap-3 px-6 py-5 rounded-2xl border transition-all duration-300 select-none ${d.connected ? 'bg-brand-start/10 border-brand-start/50 shadow-[0_0_30px_rgba(59,130,246,0.25)]' : 'bg-slate-900/80 border-white/10'}`} style={{ width: 160 }}>
      {d.isSource && <Handle type="source" position={Position.Right} style={{ width: 14, height: 14, background: 'rgb(99,102,241)', border: '2px solid rgba(255,255,255,0.3)', right: -7, cursor: 'crosshair' }} />}
      {!d.isSource && <Handle type="target" position={Position.Left} style={{ width: 14, height: 14, background: 'rgb(34,197,94)', border: '2px solid rgba(255,255,255,0.3)', left: -7 }} />}
      <div className={`w-16 h-16 rounded-2xl overflow-hidden border-2 transition-all duration-300 ${d.connected ? 'border-brand-start/60' : 'border-white/10'}`}>
        <img src={d.avatar as string} className="w-full h-full bg-slate-800" alt={d.name as string} />
      </div>
      <div className="text-center">
        <p className="text-sm font-bold text-white">{d.name as string}</p>
        <p className="text-[10px] text-slate-400 mt-0.5">{d.role as string}</p>
      </div>
      {d.connected && (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-2 -right-2 w-6 h-6 bg-status-success rounded-full flex items-center justify-center shadow-lg">
          <Check size={12} className="text-white" />
        </motion.div>
      )}
    </div>
  );
}

const nodeTypes = { agentNode: AgentNode };

function GlowEdge({ id, sourceX, sourceY, targetX, targetY }: { id: string; sourceX: number; sourceY: number; targetX: number; targetY: number; style?: React.CSSProperties }) {
  const midX = (sourceX + targetX) / 2;
  const d = `M${sourceX},${sourceY} C${midX},${sourceY} ${midX},${targetY} ${targetX},${targetY}`;
  return (
    <g>
      <defs>
        <linearGradient id={`grad-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgb(99,102,241)" /><stop offset="100%" stopColor="rgb(34,197,94)" />
        </linearGradient>
        <filter id={`glow-${id}`}><feGaussianBlur stdDeviation="3" result="coloredBlur" /><feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <path d={d} fill="none" stroke="rgba(99,102,241,0.15)" strokeWidth={10} />
      <path d={d} fill="none" stroke={`url(#grad-${id})`} strokeWidth={2.5} strokeLinecap="round" filter={`url(#glow-${id})`} />
      <path d={d} fill="none" stroke="transparent" strokeWidth={1} id={`mpath-${id}`} />
      <circle r={5} fill="rgba(255,255,255,0.9)"><animateMotion dur="1.6s" repeatCount="indefinite" calcMode="linear"><mpath href={`#mpath-${id}`} /></animateMotion></circle>
      <circle r={3} fill="rgb(99,102,241)"><animateMotion dur="1.6s" repeatCount="indefinite" calcMode="linear" begin="0.55s"><mpath href={`#mpath-${id}`} /></animateMotion></circle>
    </g>
  );
}

const edgeTypes = { glowEdge: GlowEdge };

const initNodes: Node[] = [
  { id: 'xiaowang', type: 'agentNode', position: { x: 60, y: 80 }, draggable: false, data: { name: '小王', role: '社交媒体文案', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix', isSource: true, connected: false } },
  { id: 'xiaochen', type: 'agentNode', position: { x: 460, y: 80 }, draggable: false, data: { name: '小陈', role: '短视频剪辑', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aria', isSource: false, connected: false } },
];

export default function Act3() {
  const navigate = useNavigate();
  const setFlag = useOnboardingStore((s) => s.setFlag);
  const [nodes, setNodes, onNodesChange] = useNodesState(initNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [connected, setConnected] = useState(false);
  const [showHandshake, setShowHandshake] = useState(false);

  const onConnect = useCallback((params: Connection) => {
    if (connected || params.source !== 'xiaowang' || params.target !== 'xiaochen') return;
    setEdges((es) => addEdge({ ...params, id: 'xw-xc', type: 'glowEdge' }, es));
    setNodes((ns) => ns.map((n) => ({ ...n, data: { ...n.data, connected: true } })));
    setConnected(true);
    setFlag('pipeline_xw_xc_connected', true);
    setTimeout(() => setShowHandshake(true), 500);
    setTimeout(() => navigate('/onboarding/act-4'), 3400);
  }, [connected, setEdges, setNodes, setFlag, navigate]);

  return (
    <div className="relative min-h-screen bg-[#020617] flex flex-col items-center justify-center overflow-hidden px-4">
      <div className="absolute inset-0 pointer-events-none opacity-[0.05]"
        style={{ backgroundImage: 'linear-gradient(rgba(56,189,248,1) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}
      />

      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8 z-10">
        <h2 className="text-2xl font-bold text-white mb-1">建立协作链路</h2>
        <p className="text-slate-500 text-sm">从小王右侧拖线到小陈左侧，确认 VEGA 的建议方案</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="w-full max-w-3xl z-10 mb-28" style={{ height: 280 }}>
        <div className="w-full h-full rounded-2xl overflow-hidden border border-white/8" style={{ background: 'rgba(2,6,23,0.7)' }}>
          <ReactFlow
            nodes={nodes} edges={edges}
            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect}
            nodeTypes={nodeTypes} edgeTypes={edgeTypes}
            fitView fitViewOptions={{ padding: 0.3 }}
            panOnDrag={false} zoomOnScroll={false} zoomOnPinch={false}
            preventScrolling={false} nodesDraggable={false}
            proOptions={{ hideAttribution: true }} style={{ background: 'transparent' }}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="rgba(255,255,255,0.05)" />
          </ReactFlow>
        </div>
      </motion.div>

      <AnimatePresence>
        {showHandshake && (
          <motion.div key="handshake" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
            <div className="flex items-center gap-3 bg-status-success/10 border border-status-success/30 px-6 py-2.5 rounded-full">
              <motion.div animate={{ scale: [1, 1.4, 1] }} transition={{ repeat: Infinity, duration: 1.4 }} className="w-2 h-2 bg-status-success rounded-full" />
              <span className="text-status-success font-medium text-sm italic">"语义握手确认：协作链路已激活"</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <VegaHUD
        visible
        message={connected
          ? '协作链路建立完成。小王的文案输出将自动流转至小陈进行剪辑处理。'
          : '我建议将小王与小陈建立协作链路。从小王右侧拖线到小陈左侧即可确认方案。'
        }
      />
    </div>
  );
}
