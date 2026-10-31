"use client";

import { motion } from "framer-motion";
import type { Enemy, EnemyDesign } from "@/lib/game";
import { TRAVEL_MS, type AttackPhase, type EnemyMove } from "@/lib/enemyCombat";

export type CombatEffect = { id: number; enemy: Enemy; move: EnemyMove; phase: AttackPhase; from: {x:number;y:number}; to: {x:number;y:number}; compact: boolean; reduced: boolean };
type GlyphProps = { design: EnemyDesign; variant: number; color: string; base: string };
const spark = "M0 -27 L6 -6 L27 0 L6 6 L0 27 L-6 6 L-27 0 L-6 -6 Z";
const slash = "M-29 24 Q-10 -27 30 -22 Q2 -7 -29 24 Z";
const shard = "M0 -30 L14 -7 L9 23 L-9 23 L-14 -7 Z";
const feather = "M-22 28 Q-27 -23 24 -29 Q34 10 -22 28 Z M-22 28 L18 -21 M-12 15 L6 16 M-4 4 L17 2";

// These are encounter-specific attack props, not the common particle shape.
// Variants change the weapon/creature used; variant 3 is reserved for its finale.
export function EnemyGlyph({ design, variant: v, color, base }: GlyphProps) {
  const u = v === 3;
  let art;
  switch (design) {
    case "byte-raider": art = v===1 ? <path d="M0 -29 V4 Q30 4 21 25 Q12 39 -7 23 L5 19" fill="none" strokeWidth="7"/> : v===2 ? <><circle r="20"/><path d="M0 -20 V-28 L12 -34" fill="none"/><path d={spark} transform="translate(17 -30) scale(.2)"/></> : <><path d={slash}/>{u&&<path d={slash} transform="scale(-1 1)"/>}<path d="M-23 22 l-6 7 M-29 16 l12 13" strokeWidth="5"/></>; break;
    case "semicolon-mimic": art = v===1 ? <><circle r="25"/><circle r="17" fill="none"/><path d="M-4 -11 H5 V-2 L-5 9 H5 M0 11 V17" fill="none"/></> : <><path d={u?"M-33 -29 H33 V28 H-33 Z":"M-28 -18 Q0 -42 28 -18 V22 H-28 Z"}/><path d="M-27 -4 L-16 12 L-8 -4 L2 13 L12 -4 L23 12 L29 -4 M-27 20 L-17 7 L-5 21 L6 7 L18 21 L28 8" fill="#FFFFFF" strokeWidth="1"/>{v===2&&<path d="M-38 30 H38"/>}</>; break;
    case "cast-corsair": art = <><path d="M0 32 V-29 M-20 -28 V-8 L0 5 L20 -8 V-28" fill="none" strokeWidth={u?7:5}/>{v===2&&<><path d="M-32 10 L-13 27 L-34 30 M32 10 L13 27 L34 30"/></>}{u&&<path d="M-29 -30 L-20 -17 L-11 -30 M-9 -35 L0 -22 L9 -35 M11 -30 L20 -17 L29 -30"/>}</>; break;
    case "division-ray": art = <><path d="M0 -29 L15 -2 L34 -18 L24 17 L0 29 L-24 17 L-34 -18 L-15 -2 Z"/>{v===1?<path d="M-25 -29 L25 29" fill="none" stroke="#FFFFFF"/>:<><path d="M-12 0 H12" stroke="#FFFFFF" strokeWidth="5"/><circle cy="-13" r="3" fill="#FFFFFF"/><circle cy="13" r="3" fill="#FFFFFF"/></>}{u&&<path d="M-42 0 H-22 M22 0 H42" strokeWidth="7"/>}</>; break;
    case "compiler-leviathan": art = v===2 ? <><path d="M0 -28 V27 M-29 4 Q0 48 29 4 M-11 -12 H11" fill="none" strokeWidth="6"/><circle cy="-24" r="7"/></> : <><path d="M-29 -16 L-18 -30 L20 -30 L31 -15 L21 28 L0 36 L-23 25 Z"/><path d="M-18 -10 L-7 -5 M18 -10 L7 -5 M-15 9 L-8 24 L0 12 L9 24 L17 9" stroke="#FFFFFF" fill="none" strokeWidth="4"/>{u&&<path d="M-42 14 L-27 1 M42 14 L27 1 M-29 -25 L-36 -38 M29 -25 L36 -38" strokeWidth="6"/>}</>; break;
    case "fork-stalker": art = v===2 ? <path d="M-28 30 Q-24 -15 -6 -23 M-20 12 L-35 1 M-13 -6 L-28 -15 M28 30 Q24 -15 6 -23 M20 12 L35 1 M13 -6 L28 -15" fill="none" strokeWidth="5"/> : <><path d="M-8 30 V0 L-26 -17 V-34 M-26 -17 L-39 -20 M8 30 V0 L26 -17 V-34 M26 -17 L39 -20" fill="none" strokeWidth="5"/>{u&&<path d="M-23 10 L0 -3 L23 10 L0 33 Z"/>}</>; break;
    case "boolean-owl": art = v===0 ? <path d={feather}/> : <><path d="M-30 -21 L-9 -13 L0 -26 L9 -13 L30 -21 L24 20 L0 33 L-24 20 Z"/><path d="M-23 -3 L-7 3 M23 -3 L7 3" stroke="#FFFFFF" strokeWidth="5"/>{u&&<><circle r="41" fill="none" strokeDasharray="12 8"/><path d="M-4 8 L0 19 L4 8" fill="#FFFFFF"/></>}</>; break;
    case "modulo-mantis": art = <><path d={slash}/>{v!==0&&<path d={slash} transform="rotate(180)"/>}<path d="M-11 17 L16 -22" stroke="#FFFFFF"/>{u&&<><circle cx="-24" cy="-23" r="5"/><circle cx="25" cy="24" r="5"/></>}</>; break;
    case "nested-basilisk": art = v===1 ? <path d="M0 -32 Q26 3 19 21 Q0 42 -19 21 Q-26 3 0 -32 Z"/> : <><path d="M-28 24 C-42 -11 -5 -34 10 -5 C25 22 40 -6 18 -22" fill="none" strokeWidth="9"/><path d="M6 -20 L25 -35 L38 -18 L22 -8 Z"/>{u&&<path d="M-35 34 Q0 52 34 24" fill="none" strokeWidth="5"/>}</>; break;
    case "elder-else": art = <><path d="M-12 35 L-8 1 L-32 -14 L-31 -34 M-8 1 L7 -21 L3 -38 M6 35 L11 4 L32 -11 L35 -32" fill="none" strokeWidth={u?10:6}/>{v===2&&<path d="M-30 -27 L-16 -10 L-34 -8 M21 -28 L36 -14 L19 -8"/>}{u&&<path d="M-17 11 L0 1 L17 11 L0 28 Z" fill="#FFFFFF"/>}</>; break;
    case "counter-crab": art = v===2 ? <><circle r="22"/><path d="M0 -22 V-31 L14 -35" fill="none"/><path d="M-31 28 H31"/></> : <><circle r="26"/><circle r="19" fill={base}/><path d="M0 -14 V0 L14 10" fill="none" stroke="#FFFFFF" strokeWidth="4"/>{u&&<path d="M-22 -21 L-35 -31 L-38 -9 M22 -21 L35 -31 L38 -9 M-21 21 L-33 32 M21 21 L33 32"/>}</>; break;
    case "while-jelly": art = <><path d="M-28 -3 Q-26 -39 0 -36 Q26 -39 28 -3 L18 6 L8 -2 L0 8 L-10 -2 L-20 6 Z"/>{[-18,-5,8,21].map((x,i)=><path key={x} d={`M${x} 2 q${i%2?14:-14} 17 0 30`} fill="none" strokeWidth={u?6:3}/>)}{v===2&&<path d="M-34 -12 H34" stroke="#FFFFFF" strokeWidth="5"/>}</>; break;
    case "offset-angler": art = v===0 ? <><path d="M-9 29 Q-36 -13 -6 -24 Q18 -35 18 -8" fill="none" strokeWidth="4"/><circle cx="18" cy="-7" r="11" fill="#FFFFFF"/></> : <><path d="M-32 -20 Q0 -4 32 -20 L23 23 Q0 38 -23 23 Z"/><path d="M-28 -16 L-17 7 L-9 -10 L0 12 L10 -10 L19 8 L28 -16" fill="#FFFFFF" strokeWidth="1"/>{u&&<path d="M-36 -25 Q0 -45 36 -25" fill="none" strokeWidth="6"/>}</>; break;
    case "break-turtle": art = <><path d="M-27 -20 L0 -32 L27 -20 L32 15 L0 34 L-32 15 Z"/><path d="M0 -31 V32 M-27 -19 L0 -4 L27 -19 M-31 15 L0 -4 L32 15" fill="none" stroke="#FFFFFF" strokeWidth="3"/>{v===2&&<path d="M-36 34 V-30 M36 34 V-30" strokeWidth="6"/>}{u&&<path d="M-8 -8 H8 V13 H-8 Z" fill={base}/>}</>; break;
    case "ouroboros": art = <><path d="M-20 -22 C-48 15 0 48 24 15 C45 -13 5 -40 -11 -10 C-25 15 15 25 17 1" fill="none" strokeWidth={u?10:7}/><path d="M-29 -20 L-20 -35 L-6 -21 L-21 -9 M9 -7 L21 -19 L33 -3 L17 6 Z"/>{v===0&&<path d="M-37 31 Q0 16 37 31" fill="none" stroke="#FFFFFF"/>}</>; break;
    case "index-yeti": art = v===1 ? <path d={shard}/> : <><path d="M-26 -18 L-17 -30 L-7 -20 L2 -30 L12 -17 L23 -23 L31 -5 L24 26 L-23 26 L-32 4 Z"/><path d="M-18 -8 L-14 13 M-5 -14 V14 M8 -12 L12 12" stroke="#FFFFFF" strokeWidth="3"/>{u&&<path d="M-38 32 L0 17 L38 32" fill="none" strokeWidth="5"/>}</>; break;
    case "substring-wyvern": art = v===1 ? <path d={shard}/> : <><path d="M0 -26 L12 -3 L39 -24 L25 17 L9 9 L0 32 L-9 9 L-25 17 L-39 -24 L-12 -3 Z"/><path d="M-30 -11 L-13 5 M30 -11 L13 5" stroke="#FFFFFF"/>{u&&<path d="M-42 27 L42 -27" stroke="#FFFFFF" strokeWidth="4"/>}</>; break;
    case "char-sabertooth": art = <><path d="M-25 -21 L-7 -10 L0 -26 L7 -10 L25 -21 L20 14 L-20 14 Z"/><path d="M-18 9 L-10 36 L-3 13 M18 9 L10 36 L3 13" fill="#FFFFFF"/>{v===2&&<path d={slash} transform="rotate(100)"/>}{u&&<path d="M-35 -30 L-29 27 M35 -30 L29 27" fill="none" strokeWidth="5"/>}</>; break;
    case "echo-wraith": art = <>{[v===0?-16:0,...(v===0?[16]:[])].map((x,i)=><g key={i} transform={`translate(${x} 0) scale(${v===0?.65:1})`}><path d="M-24 -27 L24 -27 L20 17 L0 32 L-20 17 Z"/><path d="M-15 -8 L-5 -2 M15 -8 L5 -2 M-7 15 H7" stroke="#FFFFFF" strokeWidth="4"/></g>)}{u&&<path d="M-36 -36 H36 V36 H-36 Z" fill="none" strokeDasharray="5 5"/>}</>; break;
    case "null-lich": art = <><path d="M-26 -5 L-32 -30 L-12 -17 L0 -38 L12 -17 L32 -30 L26 -5 Z"/><circle cy="15" r="18" fill="none" strokeWidth="5"/><path d="M-15 31 L14 -2" stroke="#FFFFFF" strokeWidth="4"/>{u&&<circle cy="7" r="42" fill="none" strokeDasharray="7 6"/>}</>; break;
    case "bounds-bat": art = <><path d="M0 -22 L13 -3 L39 -29 L29 12 L13 8 L0 29 L-13 8 L-29 12 L-39 -29 L-13 -3 Z"/>{v===1&&<path d={shard} transform="scale(.5)" fill="#FFFFFF"/>}{u&&<path d="M-35 31 L-35 -31 M35 31 V-31" stroke="#FFFFFF" strokeWidth="5"/>}</>; break;
    case "length-crawler": art = <>{Array.from({length:u?5:3},(_,i)=><g key={i} transform={`translate(${(i-(u?2:1))*16} ${Math.sin(i)*8})`}><path d="M-9 -21 L9 -21 L13 7 L0 19 L-13 7 Z"/><path d="M-9 6 L-14 25 M9 6 L14 25" fill="none"/></g>)}</>; break;
    case "swap-spider": art = v===2 ? <><ellipse rx="20" ry="27"/><path d="M-12 -12 L7 1 L-8 18" fill="none" stroke="#FFFFFF"/></> : <><circle r="14"/>{Array.from({length:8},(_,i)=><path key={i} d="M9 0 L26 -9 L36 1" transform={`rotate(${i*45})`} fill="none" strokeWidth="3"/>)}{u&&<path d="M-33 -33 L33 33 M33 -33 L-33 33 M-33 0 H33 M0 -33 V33" stroke="#FFFFFF" fill="none"/>}</>; break;
    case "list-driller": art = <><path d="M0 -38 L27 25 L-27 25 Z"/><path d="M-10 -12 L9 -17 M-17 5 L17 -2 M-23 20 L23 13" stroke={base} strokeWidth="5"/>{v===2&&<path d="M-38 12 L-30 -1 L-22 12 M24 -24 L33 -36 L40 -22"/>}{u&&<path d="M-35 35 H35" strokeWidth="6"/>}</>; break;
    case "index-colossus": art = <><path d={v===1?"M-17 -36 L14 -31 L25 31 L-26 31 Z":"M-30 -15 L-14 -32 L11 -24 L31 -7 L21 27 L-20 30 Z"}/><path d="M-3 -25 L7 -7 L-7 6 L7 25 M7 -7 L25 -7" stroke="#FFFFFF" fill="none" strokeWidth={u?5:3}/>{u&&<path d="M-41 35 L-22 21 M41 35 L23 20" strokeWidth="6"/>}</>; break;
    case "grid-sentinel": art = <><path d="M-29 -29 H29 V23 L0 36 L-29 23 Z"/><path d="M-26 -10 H26 M-26 9 H26 M-10 -26 V28 M10 -26 V28" stroke="#FFFFFF" strokeWidth="2"/>{u&&<path d="M-28 -29 V-41 H-15 V-33 H-6 V-41 H6 V-33 H15 V-41 H28 V-29"/>}</>; break;
    case "constructor-raven": art = v===0 ? <path d={feather}/> : v===1 ? <><circle cy="-13" r="12" fill="none" strokeWidth="5"/><path d="M0 0 V31 M0 17 H14 M0 28 H9" fill="none" strokeWidth="6"/></> : <><path d="M0 -23 L13 -4 L38 -20 L24 8 L12 13 L0 35 L-12 13 L-24 8 L-38 -20 L-13 -4 Z"/><path d="M-7 -5 L7 -5 L0 6 Z" fill="#FFFFFF"/>{u&&<circle r="43" fill="none" strokeDasharray="4 12"/>}</>; break;
    case "this-duelist": art = <><path d={slash}/><path d={slash} transform="scale(-1 1)"/>{v===1&&<path d="M-17 -18 L0 -29 L17 -18 V7 L0 19 L-17 7 Z" fill={base}/>}<path d={u?"M-37 -31 L0 -8 L37 -31 M-37 31 L0 8 L37 31":"M-14 29 L0 14 L14 29"} fill="none" stroke="#FFFFFF"/></>; break;
    case "base-gargoyle": art = <><path d="M0 -22 L11 -6 L35 -28 L29 10 L15 6 L0 29 L-15 6 L-29 10 L-35 -28 L-11 -6 Z"/><path d="M-9 -3 L0 8 L9 -3" stroke="#FFFFFF"/>{v===1&&<path d="M-31 29 H31 V39 H-31 Z"/>}{u&&<path d="M-19 -19 L-25 -38 M19 -19 L25 -38" strokeWidth="5"/>}</>; break;
    case "stack-tyrant": art = <>{[0,1,2].map(i=><path key={i} d={`M${-29+i*7} ${19-i*19} L0 ${10-i*19} L${29-i*7} ${19-i*19} V${32-i*19} L0 ${41-i*19} L${-29+i*7} ${32-i*19} Z`}/>)}{u&&<path d="M-17 -23 L-21 -39 L-6 -32 L0 -47 L6 -32 L21 -39 L17 -23 Z" fill="#FFFFFF"/>}</>; break;
    case "sum-twins": art = <><path d="M-30 -21 H-7 V21 H-30 Z M7 -21 H30 V21 H7 Z"/><path d="M-12 0 H12 M0 -12 V12" stroke="#FFFFFF" strokeWidth="5"/>{v===1&&<path d="M-39 -26 L-17 -13 M39 -26 L17 -13" fill="none" strokeWidth="4"/>}{u&&<circle r="41" fill="none" strokeWidth="4"/>}</>; break;
    case "stock-mage": art = v===1 ? <path d="M-35 27 L-15 7 L-2 18 L26 -25 L15 -26 L35 -35 L33 -13 L26 -25" fill="none" strokeWidth="6"/> : <><path d="M-23 -30 H23 L-15 30 H23 M-23 30 H23 L-15 -30" fill="none" strokeWidth="5"/><path d="M-10 -19 H10 L0 -3 Z M-10 21 H10 L0 6 Z"/>{u&&<circle r="43" fill="none" strokeDasharray="4 8"/>}</>; break;
    case "mirror-paladin": art = <><path d={v===2?"M0 -38 L10 -9 L5 20 H-5 L-10 -9 Z":"M-24 -20 L0 -35 L24 -20 L20 20 L0 35 L-20 20 Z"}/><path d="M0 -28 V28 M-14 -8 L14 8" stroke="#FFFFFF" strokeWidth="3"/>{u&&<><path d={slash} transform="translate(-17 0)"/><path d={slash} transform="translate(17 0) scale(-1 1)"/></>}</>; break;
    case "merge-minotaur": art = <><path d="M0 -9 Q-33 -35 -32 9 L-5 6 V35 H5 V6 L32 9 Q33 -35 0 -9 Z"/><path d="M-26 -3 L-9 -12 M26 -3 L9 -12" stroke="#FFFFFF" strokeWidth="3"/>{u&&<path d="M-21 -18 Q-40 -30 -28 -43 M21 -18 Q40 -30 28 -43" fill="none" strokeWidth="6"/>}</>; break;
    case "final-judge": art = <><path d="M-35 0 Q0 -39 35 0 Q0 39 -35 0 Z" fill="#FFFFFF"/><circle r="17"/><path d="M0 -14 L6 0 L0 14 L-6 0 Z" fill={base}/>{Array.from({length:u?8:4},(_,i)=><path key={i} d="M-3 -30 L0 -44 L3 -30 Z" transform={`rotate(${i*(u?45:90)})`}/>)}{u&&<circle r="47" fill="none" strokeDasharray="5 6"/>}</>; break;
    default: { const never: never = design; return never; }
  }
  return <g fill={color} stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">{art}</g>;
}

export default function EnemyAttackFx({ fx }: {fx: CombatEffect}) {
  const { enemy, move, phase, from, to, reduced } = fx;
  const scale = fx.compact ? 0.62 : 0.9;
  const travel = TRAVEL_MS[move.motion] / 1000;
  const ultimate = move.glyph===3;
  const count = Math.min(reduced ? 1 : 6, move.beats);
  const glyph = <EnemyGlyph design={enemy.design} variant={move.glyph} color={enemy.accent} base={enemy.color}/>;
  const ringColor = enemy.accent;
  const at = phase==="defeat" ? from : to;
  if (reduced) return <svg className="pointer-events-none absolute inset-0 z-30" width="100%" height="100%" aria-hidden="true"><g transform={`translate(${at.x} ${at.y}) scale(${scale})`} opacity="0.75">{glyph}</g></svg>;
  return <svg className="pointer-events-none absolute inset-0 z-30 overflow-visible" width="100%" height="100%" aria-hidden="true" data-design={enemy.design} data-move={move.name} data-phase={phase}>
    {phase==="telegraph" && <>
      <motion.ellipse cx={to.x} cy={to.y+48*scale} rx={ultimate?65*scale:42*scale} ry={12*scale} fill={enemy.color} fillOpacity="0.3" stroke={ringColor} strokeWidth="2" strokeDasharray="8 7" initial={{opacity:0,scale:0.6}} animate={{opacity:0.8,scale:1}}/>
      <g transform={`translate(${from.x} ${from.y-56*scale}) scale(${scale*.6})`}><motion.g initial={{scale:0.4,opacity:0}} animate={{scale:1,opacity:1}}>{glyph}</motion.g></g>
    </>}
    {phase==="travel" && <>
      {move.motion==="beam" ? <>
        <motion.path d={`M${from.x} ${from.y} L${to.x} ${to.y}`} fill="none" stroke={ringColor} strokeWidth={(ultimate?24:12)*scale} strokeOpacity="0.6" initial={{pathLength:0,opacity:0.2}} animate={{pathLength:1,opacity:[.2,.9,0]}} transition={{duration:travel}}/>
        <motion.path d={`M${from.x} ${from.y} L${to.x} ${to.y}`} stroke="#FFFFFF" strokeWidth="3" initial={{pathLength:0}} animate={{pathLength:1,opacity:[0,1,0]}} transition={{duration:travel}}/>
      </> : null}
      {(move.motion==="snare" || move.motion==="quake") && <g fill="none" stroke={ringColor} strokeWidth={4*scale}>
        {[-1,1].map(side=><motion.path key={side} d={move.motion==="snare"?`M${to.x+side*75*scale} ${to.y+70*scale} Q${to.x+side*105*scale} ${to.y-30*scale} ${to.x+side*17*scale} ${to.y-49*scale}`:`M${from.x} ${from.y+65*scale} L${to.x+side*50*scale} ${to.y+42*scale} l${side*17} 14 l${side*20} -21`} initial={{pathLength:0,opacity:0}} animate={{pathLength:1,opacity:[0,1,.4]}} transition={{duration:travel}}/>)}
      </g>}
      {(move.motion==="orbit" || move.motion==="vortex") ? <g transform={`translate(${to.x} ${to.y})`}>
        {move.motion==="vortex"&&<motion.circle r={75*scale} fill={enemy.color} fillOpacity="0.35" stroke={ringColor} strokeWidth="2" initial={{scale:.1}} animate={{scale:[.1,1.2,.8],rotate:180}} transition={{duration:travel}}/>}
        <motion.g initial={{rotate:0,scale:.5,opacity:0}} animate={{rotate:ultimate?240:150,scale:[.5,1,.5],opacity:[0,1,0]}} transition={{duration:travel}}>
          {Array.from({length:Math.max(count,3)},(_,i)=><g key={i} transform={`rotate(${i*360/Math.max(count,3)}) translate(0 ${-65*scale}) scale(${scale*.55})`}>{glyph}</g>)}
        </motion.g>
      </g> : Array.from({length:count},(_,i)=>{
        const offset=(i-(count-1)/2)*24*scale;
        const summon=move.motion==="summon";
        const start={x:summon?to.x+offset:from.x,y:summon?Math.max(35,to.y-125*scale):from.y+offset};
        const bend=(move.motion==="dive"||move.motion==="rise"||move.motion==="volley")?-70*scale:0;
        return <motion.g key={i} initial={{x:start.x,y:start.y,opacity:0,scale:scale*.45}} animate={{x:[start.x,(start.x+to.x)/2,to.x+offset*.4],y:[start.y,(start.y+to.y)/2+bend,to.y+offset*.4],opacity:[0,1,0],scale:[scale*.45,scale*(ultimate?1.1:.65),scale*.85],rotate:move.motion==="sweep"||move.motion==="blink"?[0,180]:[0,0]}} transition={{duration:travel-i*.025,delay:i*.025,ease:"easeIn"}}>{glyph}</motion.g>;
      })}
    </>}
    {(phase==="impact"||phase==="defeat") && <g transform={`translate(${at.x} ${at.y})`}>
      {ultimate&&<motion.circle r="25" fill={enemy.color} fillOpacity="0.3" stroke={ringColor} strokeWidth="2" initial={{scale:.2}} animate={{scale:4*scale,opacity:0}} transition={{duration:.7}}/>}
      <motion.g initial={{scale:scale*.5,opacity:0,rotate:phase==="defeat"?-25:0}} animate={{scale:[scale*.5,scale*(ultimate?1.65:1.05),scale*1.25],opacity:[0,.95,0],rotate:phase==="defeat"?65:0}} transition={{duration:ultimate?.85:.55}}>{glyph}</motion.g>
      {Array.from({length:ultimate?8:4},(_,i)=><g key={i} transform={`rotate(${i*(ultimate?45:90)})`}><motion.g initial={{y:0,scale:.3,opacity:1}} animate={{y:-85*scale,scale:.12,opacity:0}} transition={{duration:.7}}>{glyph}</motion.g></g>)}
    </g>}
  </svg>;
}
