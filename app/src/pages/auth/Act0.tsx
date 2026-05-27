/**
 * Act 0 — Boss authentication, fused into the VEGA boot animation.
 *
 * Visual contract (matches Act1.tsx):
 *   • bg #020617 + 6% blue grid overlay
 *   • font-mono · text-slate-400 for log lines · accent-blue for highlights
 *   • blinking cursor (w-2 h-3.5 bg-accent-blue animate-pulse) after the
 *     current prompt
 *
 * Phase machine:
 *   boot   → small VEGA_AUTH_MODULE boot lines, leads into…
 *   email  → ask for boss@x.com
 *     ↓ enter
 *   POST /signup  ─ 202 → phase = code     ; new boss path
 *                 ─ 409 → phase = login_pw ; existing boss → ask for password
 *
 *   code      → 6-digit code, then password (twice) → POST /verify → done
 *   login_pw  → password → POST /login → done
 *
 *   done   → fade lines out, navigate:
 *              · if user.onboarding_done → /dashboard
 *              · else                    → /onboarding/act-1
 */
import { useEffect, useRef, useState, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

type Phase = 'boot' | 'email' | 'code' | 'password_new' | 'login_pw' | 'done';

interface Line {
  text: string;
  tone?: 'log' | 'ok' | 'warn' | 'hero';
}

const BOOT_LINES: Line[] = [
  { text: '> VEGA_AUTH_MODULE......READY', tone: 'log' },
  { text: '> SESSION_KEY...........GENERATED', tone: 'log' },
  { text: '> AWAITING_BOSS_IDENTITY...', tone: 'log' },
];

const toneClass = (tone: Line['tone']) => {
  switch (tone) {
    case 'ok':   return 'text-emerald-400 text-xs tracking-widest';
    case 'warn': return 'text-rose-400 text-xs tracking-widest';
    case 'hero': return 'text-accent-blue text-base font-bold mt-4';
    default:     return 'text-slate-400 text-xs tracking-widest';
  }
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Act0() {
  const navigate = useNavigate();
  const auth = useAuthStore();

  const [phase, setPhase] = useState<Phase>('boot');
  const [bootShown, setBootShown] = useState(0);
  const [history, setHistory] = useState<Line[]>([]);
  const [input, setInput] = useState('');
  const [pwConfirm, setPwConfirm] = useState<string | null>(null); // when set, we're on second password entry
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── boot sequence (terminal lines reveal one by one) ───────────────────────
  useEffect(() => {
    BOOT_LINES.forEach((_, i) => {
      setTimeout(() => setBootShown(i + 1), 350 + i * 380);
    });
    setTimeout(() => setPhase('email'), 350 + BOOT_LINES.length * 380 + 250);
  }, []);

  // ── focus input on phase change ────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'boot' && phase !== 'done') {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [phase]);

  const log = (line: Line) => setHistory(h => [...h, line]);

  // ── handlers ───────────────────────────────────────────────────────────────
  const submitEmail = async () => {
    const email = input.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      log({ text: '! 邮箱格式无效,请重新输入', tone: 'warn' });
      return;
    }
    log({ text: `> email:  ${email}`, tone: 'log' });
    setInput('');
    setBusy(true);
    try {
      await auth.signup(email);
      log({ text: `> 验证码已发送至 ${email} (查看后端 console)`, tone: 'ok' });
      // stash email by re-storing it in input for re-use in next phase via closure
      // we use a ref-on-state trick: keep it in pwConfirm slot temporarily? cleaner: dedicated state.
      setSavedEmail(email);
      setPhase('code');
    } catch (e: any) {
      if (e.status === 409) {
        log({ text: '> 该邮箱已注册,请输入密码登录', tone: 'ok' });
        setSavedEmail(email);
        setPhase('login_pw');
      } else if (e.status === 429) {
        const wait = (e.message as string).split(':')[1] ?? '60';
        log({ text: `! 请 ${wait}s 后再试`, tone: 'warn' });
      } else {
        log({ text: `! 提交失败: ${e.message}`, tone: 'warn' });
      }
    } finally {
      setBusy(false);
    }
  };

  const [savedEmail, setSavedEmail] = useState('');

  const submitCode = async () => {
    const code = input.trim();
    if (!/^\d{6}$/.test(code)) {
      log({ text: '! 请输入 6 位数字验证码', tone: 'warn' });
      return;
    }
    log({ text: `> code:  ${code.split('').join(' ')}`, tone: 'log' });
    setSavedCode(code);
    setInput('');
    setPhase('password_new');
  };

  const [savedCode, setSavedCode] = useState('');

  const submitNewPassword = async () => {
    const pw = input;
    if (pw.length < 8) {
      log({ text: '! 密码至少 8 位', tone: 'warn' });
      return;
    }
    if (pwConfirm === null) {
      // first entry — ask again
      log({ text: '> password:  ' + '●'.repeat(Math.min(pw.length, 16)), tone: 'log' });
      setPwConfirm(pw);
      setInput('');
      return;
    }
    if (pw !== pwConfirm) {
      log({ text: '! 两次密码不一致,请重新输入', tone: 'warn' });
      setPwConfirm(null);
      setInput('');
      return;
    }
    log({ text: '> password:  ' + '●'.repeat(Math.min(pw.length, 16)) + '   (confirmed)', tone: 'log' });
    setInput('');
    setBusy(true);
    try {
      const user = await auth.verify(savedEmail, savedCode, pw);
      log({ text: '> 验证通过 · 账户已创建', tone: 'ok' });
      log({ text: `✦  BOSS_IDENTIFIED · ${user.email}`, tone: 'hero' });
      setPhase('done');
      setTimeout(() => navigate(user.onboarding_done ? '/dashboard' : '/onboarding/act-1', { replace: true }), 1400);
    } catch (e: any) {
      log({ text: `! 验证失败: ${e.message}`, tone: 'warn' });
      // back to code entry
      setPwConfirm(null);
      setPhase('code');
    } finally {
      setBusy(false);
    }
  };

  const submitLoginPassword = async () => {
    const pw = input;
    if (!pw) return;
    log({ text: '> password:  ' + '●'.repeat(Math.min(pw.length, 16)), tone: 'log' });
    setInput('');
    setBusy(true);
    try {
      const user = await auth.login(savedEmail, pw);
      log({ text: '> AUTH_OK', tone: 'ok' });
      log({ text: `✦  WELCOME_BACK · ${user.email}`, tone: 'hero' });
      setPhase('done');
      setTimeout(() => navigate(user.onboarding_done ? '/dashboard' : '/onboarding/act-1', { replace: true }), 1100);
    } catch (e: any) {
      if (e.status === 403) {
        log({ text: '! 该邮箱尚未完成验证,请重新走注册流程', tone: 'warn' });
      } else {
        log({ text: '! 密码错误', tone: 'warn' });
      }
    } finally {
      setBusy(false);
    }
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || busy) return;
    e.preventDefault();
    if (phase === 'email')         submitEmail();
    else if (phase === 'code')     submitCode();
    else if (phase === 'password_new') submitNewPassword();
    else if (phase === 'login_pw') submitLoginPassword();
  };

  // ── prompt text per phase ──────────────────────────────────────────────────
  const promptLabel = (() => {
    if (phase === 'email')        return 'email:';
    if (phase === 'code')         return 'code:';
    if (phase === 'password_new') return pwConfirm === null ? 'password (8+):' : 'confirm password:';
    if (phase === 'login_pw')     return 'password:';
    return '';
  })();
  const isPassword = phase === 'password_new' || phase === 'login_pw';

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen bg-[#020617] flex flex-col items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(56,189,248,1) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-48 bg-accent-blue/8 blur-3xl pointer-events-none" />

      <AnimatePresence mode="wait">
        <motion.div
          key="term"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-xl px-8 font-mono z-10"
        >
          {/* fixed boot header */}
          <div className="space-y-1">
            {BOOT_LINES.slice(0, bootShown).map((line, i) => (
              <motion.p
                key={`boot-${i}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className={toneClass(line.tone)}
              >
                {line.text}
              </motion.p>
            ))}

            {/* user input history */}
            {history.map((line, i) => (
              <motion.p
                key={`h-${i}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className={toneClass(line.tone)}
              >
                {line.text}
              </motion.p>
            ))}

            {/* current prompt */}
            {phase !== 'boot' && phase !== 'done' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.25 }}
                className="text-xs tracking-widest text-slate-400 flex items-center gap-2 mt-1"
              >
                <span>&gt; {promptLabel}</span>
                <input
                  ref={inputRef}
                  type={isPassword ? 'password' : 'text'}
                  inputMode={phase === 'code' ? 'numeric' : 'text'}
                  autoComplete={
                    phase === 'email'     ? 'email' :
                    phase === 'code'      ? 'one-time-code' :
                    phase === 'login_pw'  ? 'current-password' :
                    'new-password'
                  }
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={onKey}
                  disabled={busy}
                  className="flex-1 bg-transparent border-0 outline-none text-accent-blue text-xs tracking-widest font-mono caret-accent-blue placeholder:text-slate-700"
                  placeholder={phase === 'code' ? '------' : ''}
                />
                <span className="inline-block w-2 h-3.5 bg-accent-blue animate-pulse" />
              </motion.div>
            )}

            {/* footer help / resend */}
            {phase === 'code' && (
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  try {
                    await auth.resend(savedEmail);
                    log({ text: '> 已重新发送验证码', tone: 'ok' });
                  } catch (e: any) {
                    if (e.status === 429) {
                      const wait = (e.message as string).split(':')[1] ?? '60';
                      log({ text: `! 请 ${wait}s 后再试`, tone: 'warn' });
                    } else {
                      log({ text: `! 重发失败: ${e.message}`, tone: 'warn' });
                    }
                  }
                }}
                className="mt-3 text-[10px] tracking-widest text-slate-500 hover:text-accent-blue transition-colors"
              >
                [↻ RESEND_CODE]
              </button>
            )}
          </div>

          {/* phase=done flash before navigation */}
          {phase === 'done' && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 1, 0] }}
              transition={{ duration: 1.2, times: [0, 0.2, 0.7, 1] }}
              className="text-slate-500 text-[10px] tracking-widest mt-6"
            >
              &gt; loading workspace…
            </motion.p>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
