"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import BossGate from "@/components/BossGate";
import { bossGateIsOpen,openBossGate } from "@/lib/bossApproach";
import Arena, { type ArenaHandle } from "@/components/Arena";
import Confetti from "@/components/Confetti";
import Monster from "@/components/Monster";
import QuestionCard, { type Phase } from "@/components/QuestionCard";
import { CoinIcon, PowerIcon, SoundToggle, StarIcon } from "@/components/icons";
import { Button, ButtonLink, Screen } from "@/components/ui";
import { POTION_HEAL, advance, answer, current, startBattle, summary, useHint, usePotion, useShield, useSurge, type BattleState } from "@/lib/battle";
import { BOSS, key, PLAYER_HP, POWERS, SHOP, WORLDS, type Power } from "@/lib/game";
import { battleUnlocked, recordBattle, useItem, type Rewards } from "@/lib/progress";
import { buildBattle, isRight } from "@/lib/questions";
import { recordAttempt } from "@/lib/learn/store";
import { isCspSkill } from "@/lib/learn/lessons";
import { answerText, givenText } from "@/lib/learn/practice";
import { play } from "@/lib/sfx";
import { ENEMY_MOVESETS } from "@/lib/enemyCombat";
import { useWarrior } from "@/lib/useWarrior";
import SyncStatus from "@/components/cloud/SyncStatus";
import { assignmentFor } from "@/lib/cloud/home";
import { startRun, type Run } from "@/lib/cloud/reporter";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function BattlePage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-sky" />}>
      <Battle />
    </Suspense>
  );
}

function useCompact() {
  const [c, setC] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(max-width: 1023px)");
    const f = () => setC(m.matches);
    f();
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);
  return c;
}

function Battle() {
  const router = useRouter();
  const params = useSearchParams();
  const w = Math.max(0, Math.min(WORLDS.length - 1, Number(params.get("w")) || 0));
  const b = Math.max(0, Math.min(BOSS, Number(params.get("b")) || 0));
  const world = WORLDS[w];
  const enemy = world.enemies[b];
  const boss = b === BOSS;
  // Launched from a class assignment: carries the class context into the recorded result.
  const assignment = useMemo(() => assignmentFor(params.get("assignment"), (a) => a.target.kind === "battles" && a.target.battles.some(([aw, ab]) => aw === w && ab === b)), [params, w, b]);
  const { account, progress, refresh } = useWarrior();
  const compact = useCompact();
  const arena = useRef<ArenaHandle>(null);

  const [gatePassed, setGatePassed] = useState<string | null>(null);
  const [gateRequired, setGateRequired] = useState(false);
  const [run, setRun] = useState(0); // bumps on "fight again"
  const [revive, setRevive] = useState(false); // retrying after a knockout
  const [bs, setBs] = useState<BattleState | null>(null);
  const [phase, setPhase] = useState<Phase | "intro">("intro");
  const [hint, setHint] = useState<string | null>(null);
  const [note, setNote] = useState<string | undefined>();
  const [banner, setBanner] = useState<string | null>(null);
  const [end, setEnd] = useState<null | { victory: boolean; rewards: Rewards | null; firstTry: number; total: number; bestCombo: number; runId: string | null }>(null);
  const report = useRef<Run | null>(null);
  const used = useRef<Record<string, number>>({});
  const [leaving, setLeaving] = useState(false);
  const bsRef = useRef<BattleState | null>(null);
  bsRef.current = bs;

  const seed = useMemo(() => (Date.now() % 1_000_000) + run, [run]);

  // Start (or restart) the battle once the warrior is loaded.
  useEffect(() => {
    if (!progress) return;
    if (!battleUnlocked(progress, w, b) && !assignment) {
      router.replace(`/map/?w=${w}`);
      return;
    }
    if (boss && !progress.stars[key(w,BOSS)]) {
      let passed = gatePassed === `${progress.id}:${w}`;
      passed ||= bossGateIsOpen(progress.id,w);
      if (!passed) { setGateRequired(true); return; }
    }
    setGateRequired(false);
    const s = startBattle(w, b, buildBattle(w, b, seed));
    setBs(s);
    report.current?.abandon();
    used.current = {};
    report.current = startRun({ kind: "battle", world: w, battle: b, classId: assignment?.classId, assignmentId: assignment?.id, questionCount: s.questions.length });
    setPhase("intro");
    setHint(null);
    setEnd(null);
    setNote(undefined);
    let cancelled=false;
    (async () => {
      await sleep(80);
      if(cancelled)return;
      play("whoosh");
      await arena.current?.intro();
      await sleep(900);
      if(!cancelled)setPhase("answering");
    })();
    return()=>{cancelled=true;};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress?.id, w, b, seed, gatePassed]);

  // Leaving mid-battle records the run as abandoned (not as a completed battle).
  useEffect(() => () => report.current?.abandon(), []);

  // Test hook: lets automated playtests read the current answer.
  useEffect(() => {
    try {
      if (localStorage.getItem("cw.debug") !== "1" || !bs) return;
      const q = current(bs);
      const right = q.kind === "choice" ? q.correct! : q.kind === "order" ? q.lines! : q.answers![0];
      const wrong = q.kind === "choice" ? (q.correct! + 1) % q.options!.length : q.kind === "order" ? [...q.lines!].reverse() : "definitely wrong";
      (window as unknown as Record<string, unknown>).__cw = {
        kind: q.kind, answer: right, phase, over: bs.over,
        // Automated playtests only: answer the current question right or wrong, or move on.
        play: (ok: boolean) => submitRef.current?.(ok ? right : wrong),
        next: () => proceedRef.current?.(),
      };
    } catch {}
  }, [bs, phase]);

  const finish = useCallback(
    async (s: BattleState) => {
      if (!account) return;
      const sum = summary(s);
      const victory = s.over === "victory";
      const r = report.current;
      // Queued on the device before the rewards screen; uploads in the background.
      await r?.finish({ outcome: victory ? "won" : "lost", itemsUsed: used.current, hintsUsed: used.current.scroll || 0, bestCombo: s.bestCombo });
      const rewards = await recordBattle(account.id, { world: w, battle: b, victory, firstTry: sum.firstTry, total: sum.total, skills: sum.skills });
      await refresh();
      setEnd({ victory, rewards, firstTry: sum.firstTry, total: sum.total, bestCombo: s.bestCombo, runId: r?.id ?? null });
      setPhase("over");
      if (victory) {
        play("victory");
        if (rewards?.levelUp) setTimeout(() => play("level"), 900);
      } else play("defeat");
    },
    [account, refresh, w, b],
  );

  const submit = async (value: string | number | string[]) => {
    const s = bsRef.current;
    if (!s || !arena.current) return;
    const q = current(s);
    const right = isRight(q, value as never);
    report.current?.attempt({
      index: s.queue[s.pos], round: s.round, tryNo: s.attempt, questionId: q.id, skill: q.skill, kind: q.kind, prompt: q.prompt, code: q.code,
      options: q.kind === "choice" ? q.options : q.kind === "order" ? q.lines : undefined, given: givenText(q, value), expected: answerText(q), correct: right, hinted: s.hinted,
    });
    // Learn Mode uses these to find recent mistakes. Recorded once per resolved question.
    if (account && (right || s.attempt >= 1)) {
      void recordAttempt({
        accountId: account.id, source: "battle", course: isCspSkill(q.skill) ? "csp" : "csa", world: w, skill: q.skill, kind: q.kind, qid: q.id,
        correct: right, firstTry: right && s.attempt === 0 && !s.hinted, given: givenText(q, value), expected: answerText(q), prompt: q.prompt, code: q.code,
      });
    }
    setPhase("busy");
    play(right ? "right" : "wrong");
    const { state, events } = answer(s, right);
    let next: Phase = "answering";
    for (const e of events) {
      if (e.type === "attack") {
        const anim = arena.current.attack({ ...e, onImpact: () => setBs(state) });
        await anim;
        setNote(`${e.damage} damage${e.crit ? " · critical" : ""}${s.hinted ? " · hint used, counts as a miss" : ""}`);
        next = "correct";
      } else if (e.type === "hurt") {
        const anim = arena.current.hurt({ ...e, onImpact: () => setBs(state) });
        await anim;
        next = "retry";
      } else if (e.type === "reveal") {
        next = "revealed";
        setNote(undefined);
      }
    }
    if (state.over === "victory") {
      await arena.current.enemyDefeated();
      await finish(state);
      return;
    }
    if (state.over === "defeat") {
      await arena.current.playerDefeated();
      await finish(state);
      return;
    }
    setPhase(next);
  };

  const submitRef = useRef<((v: string | number | string[]) => Promise<void>) | null>(null);
  const proceedRef = useRef<(() => void) | null>(null);
  const proceed = () => {
    const s = bsRef.current;
    if (!s || s.over) return;
    const n = advance(s);
    if (n.round > s.round) {
      setBanner(`${enemy.name} is still standing! A fresh set of questions is ready.`);
      setTimeout(() => setBanner(null), 2600);
    }
    setBs(n);
    setHint(null);
    setNote(undefined);
    setPhase("answering");
  };

  submitRef.current = submit;
  proceedRef.current = proceed;

  const usePower = async (kind: Power) => {
    const s = bsRef.current;
    if (!s || !account || !arena.current || (phase !== "answering" && phase !== "retry")) return;
    if (!(await useItem(account.id, kind))) return;
    used.current[kind] = (used.current[kind] || 0) + 1;
    await refresh();
    if (kind === "potion") {
      setBs(usePotion(s));
      await arena.current.heal(POTION_HEAL);
    } else if (kind === "shield") {
      setBs(useShield(s));
      await arena.current.powerUp("shield");
    } else if (kind === "surge") {
      setBs(useSurge(s));
      await arena.current.powerUp("surge");
    } else {
      setBs(useHint(s));
      setHint(current(s).hint);
      await arena.current.powerUp("scroll");
    }
  };

  const unseal = () => {
    if (!account) return;
    openBossGate(account.id,w);
    setGatePassed(`${account.id}:${w}`); setGateRequired(false);
  };
  if (gateRequired && account && progress) return <BossGate scene={world.theme.scene} onOpen={unseal} onBack={()=>router.replace(`/map/?w=${w}`)}/>;
  if (!account || !progress || !bs) return <div className="min-h-dvh bg-sky" />;

  const q = current(bs);
  const n = bs.questions.length;
  const powerDisabled = (k: Power) => {
    if (phase !== "answering" && phase !== "retry") return "Not now";
    if ((progress.inventory[k] || 0) < 1) return "None left";
    if (k === "potion" && bs.playerHp >= PLAYER_HP) return "HP is full";
    if (k === "shield" && bs.shield) return "Already active";
    if (k === "surge" && bs.surge) return "Already active";
    if (k === "scroll" && (boss || hint)) return boss ? "No hints in boss fights" : "Already used";
    return null;
  };

  return (
    <Screen fade={true}>
      <Confetti run={!!end?.victory} />
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 pb-10 pt-4 sm:px-5">
        <header className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => (end ? router.push(`/map/?w=${w}`) : setLeaving(true))}
            aria-label="Leave battle"
            className="grid h-11 w-11 place-items-center rounded-2xl border-[3px] border-line bg-white shadow-card-sm"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4A5175" strokeWidth="3.2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
          <div className="min-w-0 flex-[1_1_220px]">
            <div className="text-[12px] font-black uppercase tracking-[0.14em]" style={{ color: boss ? "#D9434A" : "#FF8A00" }}>
              {world.name} · {boss ? "Boss battle" : `Battle ${b + 1}`}
              {bs.round > 0 && ` · Round ${bs.round + 1}`}
            </div>
            <div className="truncate font-display text-[26px] leading-tight">vs. {enemy.name}</div>
          </div>
          <div className="flex flex-wrap gap-1.5" aria-label={`Question ${Math.min(bs.pos + 1, bs.queue.length)} of ${bs.queue.length}`}>
            {bs.questions.map((_, i) => {
              const done = i in bs.firstTry || i in bs.cleared;
              const isNow = bs.queue[bs.pos] === i && !bs.over;
              return (
                <motion.span
                  key={i}
                  className="h-3.5 w-7 rounded-full"
                  animate={{ scale: isNow ? 1.15 : 1, background: isNow ? "#FF8A00" : done ? ((bs.firstTry[i] ?? bs.cleared[i]) ? "#3EC46D" : "#FF5A5F") : "#CFDAE8" }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                />
              );
            })}
          </div>
          <SoundToggle />
        </header>

        <AnimatePresence>
          {banner && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-2xl bg-ink px-4 py-3 text-center font-black text-white">
              {banner}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)]">
          <div className="order-2 flex min-w-0 flex-col gap-4 lg:order-1">
            {phase === "intro" ? (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="card grid place-items-center p-10 text-center">
                <div className="font-display text-[clamp(34px,5vw,54px)] leading-none">
                  <span style={{ color: boss ? "#D9434A" : "#FF8A00" }}>{boss ? "BOSS FIGHT" : "BATTLE START"}</span>
                </div>
                <p className="mt-3 max-w-md text-base font-bold text-ink">{enemy.lore}</p>
                <span className="mt-3 rounded-full bg-ink px-4 py-2 text-xs font-black uppercase tracking-wider text-white">{ENEMY_MOVESETS[enemy.design].finisher.name}</span>
                <p className="mt-3 max-w-md font-bold text-ink-soft">
                  {n} questions. Right answers attack. Each miss lets {enemy.name} hit you, and you get two tries per question.
                </p>
              </motion.div>
            ) : (
              <QuestionCard
                q={q}
                phase={phase === "over" ? "over" : (phase as Phase)}
                attempt={bs.attempt}
                hint={hint}
                resultNote={note}
                onSubmit={submit}
                onContinue={proceed}
              />
            )}

            <div className="card flex flex-wrap items-center gap-2 px-4 py-3">
              <span className="mr-1 text-[13px] font-black uppercase tracking-wider text-ink-soft">Items</span>
              {POWERS.map((k) => {
                const it = SHOP.find((s) => s.id === k)!;
                const why = powerDisabled(k);
                return (
                  <motion.button
                    key={k}
                    type="button"
                    onClick={() => usePower(k)}
                    disabled={!!why}
                    title={why ? `${it.name}: ${why}` : `${it.name}: ${it.blurb}`}
                    whileHover={why ? undefined : { scale: 1.05 }}
                    whileTap={why ? undefined : { scale: 0.92 }}
                    className="relative flex items-center gap-2 rounded-2xl border-[3px] border-line bg-white py-1.5 pl-2 pr-3 text-sm font-black text-ink disabled:opacity-45"
                    style={{ boxShadow: "0 4px 0 #D5E4F5" }}
                  >
                    <PowerIcon kind={k} size={28} />
                    <span className="hidden sm:inline">{it.name}</span>
                    <span className="rounded-full bg-sky px-2 tabular-nums text-ocean-deep">{progress.inventory[k] || 0}</span>
                  </motion.button>
                );
              })}
              <Link href="/shop/" className="ml-auto text-sm font-black text-ocean-deep hover:underline">Get more in the shop</Link>
            </div>
          </div>

          <div className="order-1 lg:sticky lg:top-4 lg:order-2">
            <Arena
              key={`${w}-${b}-${run}`}
              ref={arena}
              revived={revive}
              avatar={account.avatar}
              enemy={enemy}
              boss={boss}
              theme={world.theme}
              name={account.username}
              playerHp={bs.playerHp}
              playerMax={PLAYER_HP}
              enemyHp={bs.enemyHp}
              enemyMax={bs.enemyMax}
              combo={bs.combo}
              shield={bs.shield}
              surge={bs.surge}
              compact={compact}
            />
          </div>
        </div>
      </div>

      <AnimatePresence>{end && <EndScreen key="end" end={end} w={w} b={b} assigned={!!assignment} onAgain={() => { setRevive(!end.victory); setRun((r) => r + 1); }} />}</AnimatePresence>

      <AnimatePresence>
        {leaving && (
          <Modal onClose={() => setLeaving(false)}>
            <h2 className="font-display text-3xl">Leave the battle?</h2>
            <p className="mt-2 font-bold text-ink-soft">You&apos;ll lose this fight&apos;s progress. Items you already used stay used.</p>
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <Button tone="white" onClick={() => setLeaving(false)}>KEEP FIGHTING</Button>
              <Button tone="danger" onClick={() => router.push(`/map/?w=${w}`)}>LEAVE</Button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </Screen>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  return (
    <motion.div className="fixed inset-0 z-50 grid place-items-center bg-[#1F2440]/55 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        role="dialog"
        aria-modal="true"
        className="card max-h-[92dvh] w-full max-w-lg overflow-y-auto p-6"
        initial={{ scale: 0.85, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

function EndScreen({ end, w, b, onAgain, assigned }: { end: { victory: boolean; rewards: Rewards | null; firstTry: number; total: number; bestCombo: number; runId: string | null }; w: number; b: number; onAgain: () => void; assigned: boolean }) {
  const world = WORLDS[w];
  const boss = b === BOSS;
  const r = end.rewards;
  const nextHref = boss ? (w < WORLDS.length - 1 ? `/map/?w=${w + 1}` : null) : `/battle/?w=${w}&b=${b + 1}`;
  const [coins, setCoins] = useState(0);
  useEffect(() => {
    if (!r) return;
    let i = 0;
    const t = setInterval(() => {
      i++;
      setCoins(Math.round((r.coins * i) / 20));
      if (i % 4 === 0) play("coin");
      if (i >= 20) clearInterval(t);
    }, 45);
    return () => clearInterval(t);
  }, [r]);

  if (!end.victory)
    return (
      <Modal>
        <div className="text-center">
          <div className="mx-auto w-40"><Monster enemy={world.enemies[b]} boss={boss} size={160} /></div>
          <h2 className="mt-2 font-display text-4xl text-danger-deep">KNOCKED OUT</h2>
          <SyncStatus sessionId={end.runId} assigned={assigned} />
          <p className="mt-2 font-bold text-ink-soft">
            {world.enemies[b].name} won this round. Every warrior loses sometimes. Health potions and firewalls from the shop help in tough fights.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button onClick={onAgain}>TRY AGAIN</Button>
            <ButtonLink href={`/map/?w=${w}`} tone="white">WORLD MAP</ButtonLink>
            <ButtonLink href="/learn/" tone="violet">REVIEW IN LEARN</ButtonLink>
          </div>
        </div>
      </Modal>
    );

  return (
    <Modal>
      <div className="text-center">
        <motion.h2 initial={{ scale: 0.4, rotate: -6 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 300, damping: 12 }} className="font-display text-[44px] leading-none" style={{ color: boss ? "#D9434A" : "#FF8A00" }}>
          {boss ? "BOSS DEFEATED!" : "VICTORY!"}
        </motion.h2>
        <p className="mt-1 font-bold text-ink-soft">You beat {world.enemies[b].name}.</p>
        <div className="mt-4 flex justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <motion.span key={s} initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.3 + s * 0.22, type: "spring", stiffness: 400, damping: 12 }} onAnimationStart={() => r && s <= r.stars && setTimeout(() => play("coin"), 300 + s * 220)}>
              <StarIcon size={52} on={!!r && s <= r.stars} />
            </motion.span>
          ))}
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <Stat label="XP" value={`+${r?.xp ?? 0}`} color="#6D4BD8" />
          <Stat label="Coins" value={<span className="inline-flex items-center gap-1"><CoinIcon size={22} />+{coins}</span>} color="#8A6400" />
          <Stat label="Best combo" value={`${end.bestCombo}x`} color="#FF8A00" />
        </div>
        <p className="mt-3 text-sm font-bold text-ink-mute">
          {end.firstTry} of {end.total} right on the first try{r?.replay ? " · replay rewards are halved" : ""}
        </p>
        <SyncStatus sessionId={end.runId} assigned={assigned} />
        <div className="mt-4 flex flex-col gap-2">
          {r?.levelUp && <Badge color="#8B5CF6">Level up!</Badge>}
          {r?.newTitle && <Badge color="#FF8A00">New title unlocked: {r.newTitle}</Badge>}
          {r?.unlockedWorld !== undefined && <Badge color="#2D9CDB">New world unlocked: {WORLDS[r.unlockedWorld].name}</Badge>}
          {boss && w === WORLDS.length - 1 && <Badge color="#3EC46D">You cleared every world. You&apos;re ready for LeetCode.</Badge>}
        </div>
        {boss && world.bridges.length > 0 && (
          <div className="mt-4 rounded-2xl border-[3px] border-gold bg-gold-soft p-4 text-left">
            <div className="font-display text-lg">Ready for the real thing</div>
            <ul className="mt-1 list-disc pl-5 font-bold">
              {world.bridges.map((br) => (
                <li key={br.n}><a className="text-ocean-deep underline-offset-2 hover:underline" href={br.url} target="_blank" rel="noopener noreferrer">LeetCode #{br.n}: {br.name}</a></li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {nextHref && <ButtonLink href={nextHref}>{boss ? "NEXT WORLD" : "NEXT BATTLE"}</ButtonLink>}
          <ButtonLink href={`/map/?w=${w}`} tone="white">WORLD MAP</ButtonLink>
          <Button tone="white" onClick={onAgain}>FIGHT AGAIN</Button>
          {end.firstTry < end.total && <ButtonLink href="/learn/" tone="violet">REVIEW MISSES</ButtonLink>}
        </div>
      </div>
    </Modal>
  );
}

function Stat({ label, value, color }: { label: string; value: React.ReactNode; color: string }) {
  return (
    <div className="rounded-2xl bg-sky px-2 py-3">
      <div className="text-[11px] font-black uppercase tracking-wider text-ink-mute">{label}</div>
      <div className="font-display text-2xl tabular-nums" style={{ color }}>{value}</div>
    </div>
  );
}
function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }} className="rounded-2xl px-4 py-2 font-black text-white" style={{ background: color }}>
      {children}
    </motion.div>
  );
}
