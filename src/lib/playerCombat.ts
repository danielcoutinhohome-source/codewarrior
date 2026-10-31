import { weaponSpec } from "./cosmetics";
import type { ActorPose } from "./enemyCombat";
export const PLAYER_WEAPONS = ["saber", "scythe", "hammer", "glaive"] as const;
export type PlayerWeapon = typeof PLAYER_WEAPONS[number];
export type PlayerMove = { name: string; weapon: PlayerWeapon; index: number; finisher: boolean; style: "cut" | "lift" | "wave" | "hook" | "spin" | "moon" | "ram" | "quake" | "uppercut" | "thrust" | "vault" | "lances" | "dawn" | "eclipse" | "worldbreaker" | "heaven" };
const moves = (weapon: PlayerWeapon, entries: [string, PlayerMove["style"]][]) => entries.map(([name, style], index) => ({ name, style, weapon, index, finisher: index === 3 }));
export const PLAYER_MOVESETS: Record<PlayerWeapon, PlayerMove[]> = {
  saber: moves("saber", [["Flash Draw", "cut"], ["Rising Edge", "lift"], ["Photon Crescent", "wave"], ["Final Compile: Blade of Dawn", "dawn"]]),
  scythe: moves("scythe", [["Reaper's Hook", "hook"], ["Harvest Spiral", "spin"], ["Moonblade", "moon"], ["Event Horizon: Soul Reap", "eclipse"]]),
  hammer: moves("hammer", [["Piston Rush", "ram"], ["Faultline Slam", "quake"], ["Anvil Uppercut", "uppercut"], ["Worldbreaker Protocol", "worldbreaker"]]),
  glaive: moves("glaive", [["Piercing Vector", "thrust"], ["Helix Vault", "vault"], ["Twin Comet Lances", "lances"], ["Heaven Piercer: Starfall", "heaven"]]),
};
export const playerWeapon = (value?: string): PlayerWeapon => weaponSpec(value)?.type ?? "saber";
export function playerMove(value: string | undefined, turn: number, finisher = false) {
  return PLAYER_MOVESETS[playerWeapon(value)][finisher ? 3 : ((Math.trunc(turn) % 3) + 3) % 3];
}
export type PlayerPhase = "charge" | "strike" | "impact";
export type PlayerStep = { ms: number; hero?: ActorPose; body?: ActorPose; weapon?: ActorPose; target?: ActorPose; phase?: PlayerPhase; contact?: "stagger" | "launch" | "juggle" | "freeze"; hit?: boolean };
export const REST: ActorPose = { x: 0, y: 0, rotate: 0, scale: 1, scaleX: 1, scaleY: 1, opacity: 1 };

export function playerTimeline(move: PlayerMove, distance: number, compact: boolean): PlayerStep[] {
  const d = Math.max(0, Number.isFinite(distance) ? distance : 0), air = compact ? 46 : 78;
  const charge: PlayerStep = { ms: move.finisher ? 480 : 170, phase: "charge", body: { rotate: -8, scaleY: .94 }, weapon: { rotate: move.style === "uppercut" ? 150 : move.weapon === "hammer" ? -65 : -38 } };
  const contact = (ms: number, hero: ActorPose, weapon: ActorPose): PlayerStep => ({ ms, phase: "strike", hero, weapon, body: { rotate: 9, scaleY: 1 } });
  const impact: PlayerStep = { target: { x: [0, move.weapon === "hammer" ? 22 : 12, 0], y: [0, move.style === "uppercut" || move.style === "lift" ? -24 : -5, 0], rotate: [0, 7, 0], scaleY: [1, .9, 1] }, ms: move.finisher ? 380 : 170, phase: "impact", hit: true, body: { rotate: [9, -3, 0], scaleY: [1, .94, 1] } };
  const retreat: PlayerStep = { ms: move.finisher ? 380 : 260, hero: { x: 0, y: 0, rotate: 0, opacity: 1 }, target: REST, weapon: { rotate: 0, x: 0, y: 0, scale: 1 }, body: REST };
  let middle: PlayerStep[];
  switch (move.style) {
    case "cut": middle = [contact(250,{ x: d, y: -4 },{ rotate: [-38, 65, 24] })]; break;
    case "lift": middle = [contact(330,{ x: [0, d*.8, d], y: [0, -air*.5, -12] },{ rotate: [-38, -115, 22] })]; break;
    case "wave": middle = [contact(390,{ x: [0, d*.55, d*.8] },{ rotate: [-38, 85, 0] })]; break;
    case "hook": middle = [contact(340,{ x: [0, d, d*.82] },{ rotate: [-38, 110, 48] })]; break;
    case "spin": middle = [contact(430,{ x: d*.85, y: [0, -18, 0] },{ rotate: [-38, 180, 322] })]; break;
    case "moon": middle = [contact(430,{ x: [0, d*.45, d*.8] },{ rotate: [-38, -160, -360] })]; break;
    case "ram": middle = [contact(320,{ x: [0, -8, d], y: 0 },{ rotate: [-65, 88, 65] })]; break;
    case "quake": middle = [contact(480,{ x: [0, d*.7, d], y: [0, -air, 0] },{ rotate: [-65, -110, 100] })]; break;
    case "uppercut": middle = [contact(380,{ x: [0, d, d], y: [0, 5, -air*.45] },{ rotate: [150, 90, 25] })]; break;
    case "thrust": middle = [contact(280,{ x: d },{ rotate: [-38, 85, 85], x: [0, 15, 0] })]; break;
    case "vault": middle = [contact(440,{ x: [0, d*.65, d*.9], y: [0, -air, -5] },{ rotate: [-38, 160, 340] })]; break;
    case "lances": middle = [contact(420,{ x: [0, d*.5, d*.9] },{ rotate: [-38, 100, 0] })]; break;
    case "dawn": middle = [contact(360,{ x: [0,d*.4,d], y: [0,-8,-8] },{ rotate: [-38, 95, 95] }), { ms: 270, hero: { x: d, y: -8 }, weapon: { rotate: 95 } }]; break;
    case "eclipse": middle = [contact(600,{ x: d*.8, y: [0,-air*.5,-8] },{ rotate: [-38,180,360,500] }), { ms: 220, weapon: { rotate: [500,580] } }]; break;
    case "worldbreaker": middle = [{ ms: 380, hero: { x: d*.65, y: -air }, body: { rotate: -12 }, weapon: { rotate: -110 }, phase: "strike" }, { ms: 240, hero: { x: d, y: 0 }, body: { rotate: 15 }, weapon: { rotate: [-110,110] } }]; break;
    case "heaven": middle = [{ ms: 400, phase: "strike", hero: { x: d*.4, y: -air }, weapon: { rotate: -15 }, body: { rotate: -6 } }, { ms: 260, hero: { x: d*.95, y: 0 }, weapon: { rotate: [-15,130] }, body: { rotate: 9 } }]; break;
  }
  if (move.finisher) {
    const swing = move.weapon === "hammer" ? 105 : move.weapon === "glaive" ? 130 : 85;
    const opener: PlayerStep = { ms: 340, phase: "strike", hero: { x: d*.85, y: 0 }, body: { rotate: 8 }, weapon: { rotate: swing } };
    const stagger: PlayerStep = { ms: 150, contact: "stagger", target: { x: [0, 12, 4], rotate: [0, 8, 3] }, weapon: { rotate: swing-35 } };
    const launcher: PlayerStep = { ms: 340, contact: "launch", hero: { x: d, y: -8 }, weapon: { rotate: [swing-35, swing-140] }, target: { y: -air*.7, x: 8, rotate: -12 } };
    const pursuit: PlayerStep = { ms: 330, hero: { x: d*.85, y: -air*.65 }, weapon: { rotate: swing-35 }, body: { rotate: -12 } };
    const hits: PlayerStep[] = Array.from({length: move.weapon === "scythe" ? 4 : 3},(_,i)=>({
      ms: 200+i*20, contact: "juggle", hero: { x:d*(i%2?.75:.95),y:-air*(i%2?.55:.7) },
      weapon: { rotate: swing+(i%2?-90:50)+(move.weapon==="scythe"?i*180:0) },
      target: { x: [8,18,8], y: -air*(i%2?.62:.75), rotate: i%2?-16:12 },
    }));
    const hold: PlayerStep = { ms: 480, contact: "freeze", hero: { x:d*.75,y:-air*.6 }, target: { y:-air*.7,rotate:-8 }, weapon:{rotate:move.weapon==="hammer"?-100:-35} };
    const release: PlayerStep = { ms: 460,
      hero: move.weapon==="saber"?{x:[d*.75,d],y:[-air*.6,0]}:move.weapon==="scythe"?{x:d*.85,y:-12}:{x:d,y:0},
      body: {rotate:move.weapon==="glaive"?22:15}, weapon: {rotate:move.weapon==="scythe"?[620,720]:move.weapon==="hammer"?[-100,110]:move.weapon==="saber"?[-35,95]:[-15,130]},target:{y:0,rotate:0,x:12} };
    middle = [opener,stagger,launcher,pursuit,...hits,hold,release];
    charge.ms=620;
    impact.ms=650;
    impact.target={x:[12,26,20],y:[0,-8,20],rotate:[0,14,55],scaleY:[1,.85,.85]};
    retreat.target={x:20,y:20,rotate:55,scaleY:.85};
    retreat.ms=460;
  }
  const lastAngle = [...middle].reverse().find(step => step.weapon?.rotate !== undefined)?.weapon?.rotate ?? 0;
  const endAngle = Array.isArray(lastAngle) ? lastAngle[lastAngle.length-1] : lastAngle;
  // Equivalent whole turns avoid unwinding a spin through another full attack.
  retreat.weapon!.rotate = Math.round(endAngle / 360) * 360;
  return [charge, ...middle, impact, retreat];
}
export type PlayerContext = { signal: AbortSignal; distance: number; compact: boolean; reduced: boolean; animate: (actor: "hero" | "body" | "weapon" | "target", pose: ActorPose, ms: number) => Promise<unknown>; wait: (ms: number) => Promise<unknown>; effect: (phase: PlayerPhase, ms: number) => void; hit: () => void; contact?: (stage: NonNullable<PlayerStep["contact"]>, index: number) => void };

// Every tween belongs to the sequence. Cancellation stops its adapters and
// prevents later impact callbacks; the final reset always removes residual poses.
export async function performPlayerMove(move: PlayerMove, ctx: PlayerContext): Promise<boolean> {
  if (ctx.signal.aborted) return false;
  let aborted = false, completed = false;
  const check = () => { if (ctx.signal.aborted) throw new Error("player-attack-cancelled"); };
  const run = async (job: () => Promise<unknown>) => {
    check();
    let stop = () => {};
    try {
      const cancelled = new Promise((_,reject) => { stop = () => reject(new Error("player-attack-cancelled")); ctx.signal.addEventListener("abort",stop,{ once:true }); });
      await Promise.race([Promise.resolve().then(() => { check(); return job(); }), cancelled]);
      check();
    }
    finally { ctx.signal.removeEventListener("abort",stop); }
  };
  try {
    if (ctx.reduced) {
      ctx.effect("charge", 140); await run(() => ctx.wait(140));
      ctx.effect("impact", 180); check(); ctx.hit(); await run(() => ctx.wait(180));
    } else {
      const steps = playerTimeline(move,ctx.distance,ctx.compact);
      for (const [index,step] of steps.entries()) {
        check();
        if (step.phase) {
          const impactAt = steps.findIndex(s=>s.hit);
          const ms = step.phase === "strike" ? steps.slice(index,impactAt).reduce((n,s)=>n+s.ms,0) : step.ms;
          ctx.effect(step.phase,ms);
        }
        check();
        if (step.contact) ctx.contact?.(step.contact,index);
        if (step.hit) ctx.hit();
        const jobs = (["hero","body","weapon","target"] as const).filter(actor=>step[actor]);
        await run(() => jobs.length ? Promise.all(jobs.map(actor => ctx.animate(actor,step[actor]!,step.ms))) : ctx.wait(step.ms));
      }
    }
    completed = true;
  } catch (error) { if (!ctx.signal.aborted) throw error; aborted = true; }
  finally {
    // Zero-duration resets are safe even after cancellation; do not wait on a
    // stopped browser animation promise, which can otherwise hang the battle.
    await Promise.all((["hero","body","weapon","target"] as const).filter(actor=>!(actor==="target"&&move.finisher&&completed&&!ctx.reduced&&!ctx.signal.aborted)).map(actor=>ctx.animate(actor,REST,0)));
  }
  return !aborted && !ctx.signal.aborted;
}
