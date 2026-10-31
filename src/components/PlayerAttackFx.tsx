"use client";
import { motion } from "framer-motion";
import type { PlayerMove, PlayerPhase } from "@/lib/playerCombat";
export type PlayerEffect = { id: number; move: PlayerMove; phase: PlayerPhase; ms: number; from: { x:number;y:number }; to: { x:number;y:number }; color: string; groundY?: number; compact: boolean; reduced: boolean };

// Local coordinates keep each weapon's effects anchored even when the warrior
// moves. Never mix DOM measurements taken before and after a camera zoom.
export function PlayerSigil({ move, color }: { move: PlayerMove; color: string }) {
  const big = move.finisher;
  return <g stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" data-player-sigil={move.style}>
    {move.weapon === "saber" ? <><path d="M-55 34 Q-12 -64 59 -34 Q4 -7 -55 34 Z" fill={color} fillOpacity=".25"/><path d={big?"M-60 -40 L60 40 M-60 40 L60 -40 M0 -62 V62":"M-39 22 L43 -23"} stroke="#FFFFFF" strokeWidth={big?5:3}/>{move.style==="lift"&&<path d="M-25 50 Q-45 0 18 -48"/>}</> :
    move.weapon === "scythe" ? <><path d="M39 -53 A66 66 0 1 0 39 53 A47 47 0 1 1 39 -53 Z" fill={color} fillOpacity=".45"/><path d="M-12 50 L31 -53" strokeWidth="5"/>{big&&<><circle r="37" fill="#101025" fillOpacity=".85"/><circle r="72" strokeDasharray="18 9"/><path d="M-58 47 L58 -47 M-58 -47 L58 47"/></>}</> :
    move.weapon === "hammer" ? <><path d="M-42 -49 H39 V-14 H-42 Z" fill={color} fillOpacity=".4"/><path d="M-6 -14 H6 V53 H-6 Z" fill={color}/><path d="M-29 -43 L-19 -22 M23 -43 L13 -22" stroke="#FFFFFF"/>{big&&<><path d="M-69 48 L-36 30 L-21 49 L0 32 L23 49 L42 29 L71 48" strokeWidth="6"/><path d="M-58 -47 L-68 -16 M55 -47 L68 -16"/></>}</> : <><path d="M0 -68 L17 -34 L5 -13 V36 L-14 66 L-18 34 L-5 13 V-36 Z" fill={color} fillOpacity=".5"/><path d="M0 -50 V50" stroke="#FFFFFF" strokeWidth="3"/>{big&&[-45,45].map(x=><path key={x} d={`M${x} -52 v89 m-9 -11 l9 17 l9 -17`} strokeWidth="4"/>)}{move.style==="lances"&&<path d="M-35 -30 V35 M35 -30 V35"/>}</>}
  </g>;
}

export default function PlayerAttackFx({ fx }: { fx: PlayerEffect }) {
  const { move,phase,from,to,color,reduced }=fx;
  const s=fx.compact?.55:.85, big=move.finisher;
  const at=phase==="charge"?from:to;
  const sigil=<PlayerSigil move={move} color={color}/>;
  const duration=fx.ms/1000;
  const ground=(fx.groundY ?? to.y+45*s)-to.y;
  if(reduced) return <svg aria-hidden="true" className="pointer-events-none absolute inset-0 z-30" width="100%" height="100%"><g transform={`translate(${at.x} ${at.y}) scale(${s*.5})`} opacity=".8">{sigil}</g></svg>;
  return <svg aria-hidden="true" className="pointer-events-none absolute inset-0 z-30 overflow-hidden" width="100%" height="100%" data-player-move={move.style} data-phase={phase}>
    {phase==="charge"&&<g transform={`translate(${from.x} ${from.y})`}>
      <motion.circle r={big?62*s:34*s} stroke={color} strokeWidth="2" fill={color} fillOpacity=".06" strokeDasharray={big?"8 5":"3 8"} initial={{scale:1.5,opacity:0}} animate={{scale:.6,opacity:.9,rotate:big?90:30}} transition={{duration}}/>
      {big&&<g transform={`scale(${s*.65})`}><motion.g initial={{opacity:0,scale:.4}} animate={{opacity:.8,scale:1}} transition={{duration}}>{sigil}</motion.g></g>}
    </g>}
    {phase==="strike"&&<>
      {move.weapon==="scythe"&&move.style==="moon"&&<motion.g initial={{x:from.x,y:from.y,scale:s*.65,rotate:-50,opacity:0}} animate={{x:[from.x,(from.x+to.x)/2,to.x],y:[from.y,to.y-45*s,to.y],rotate:150,opacity:[0,1,0]}} transition={{duration}}>{sigil}</motion.g>}
      {move.weapon==="scythe"&&move.style!=="moon"&&<g transform={`translate(${to.x} ${to.y})`}><motion.g initial={{scale:.3,rotate:-90,opacity:0}} animate={{scale:s*(big?1.7:1),rotate:big?240:100,opacity:[0,1,0]}} transition={{duration}}>{sigil}</motion.g></g>}
      {move.weapon==="hammer"&&<g transform={`translate(${to.x} ${to.y})`}><motion.g initial={{x:move.style==="ram"?from.x-to.x:0,y:move.style==="ram"?0:move.style==="uppercut"?45*s:-100*s,rotate:move.style==="uppercut"?140:-35,scale:s*(big?1.6:.7),opacity:0}} animate={{x:0,y:move.style==="uppercut"?-35*s:0,rotate:move.style==="uppercut"?210:0,opacity:[0,1,.7]}} transition={{duration}}>{sigil}</motion.g></g>}
      {move.weapon==="saber"&&<><motion.path d={`M${from.x} ${from.y} Q${(from.x+to.x)/2} ${to.y-70*s} ${to.x} ${to.y}`} fill="none" stroke={color} strokeWidth={big?16:7} initial={{pathLength:0,opacity:.3}} animate={{pathLength:1,opacity:[.3,1,0]}} transition={{duration}}/>{big&&<motion.path d={`M${from.x} ${from.y} L${to.x} ${to.y}`} stroke="#FFFFFF" strokeWidth="4" initial={{pathLength:0}} animate={{pathLength:1}} transition={{duration}}/>}</>}
      {move.weapon==="glaive"&&Array.from({length:big?6:move.style==="lances"?2:1},(_,i)=>{
        const offset=(i-(big?2.5:move.style==="lances"?.5:0))*22*s;
        return <motion.g key={i} initial={{x:big?to.x+offset:from.x,y:big?25:from.y+offset,opacity:0,scale:s*.6,rotate:big?0:90}} animate={{x:to.x+offset*.2,y:to.y+offset*.2,opacity:[0,1,0]}} transition={{duration:duration-i*.02,delay:i*.02}}>{sigil}</motion.g>;
      })}
    </>}
    {phase==="impact"&&<g transform={`translate(${to.x} ${to.y})`}>
      <motion.g initial={{scale:s*.3,opacity:1,rotate:move.weapon==="scythe"?-70:0}} animate={{scale:s*(big?2:1.2),opacity:0,rotate:move.weapon==="scythe"?80:0}} transition={{duration:big?.8:.45}}>{sigil}</motion.g>
      {big&&<>
        {move.weapon==="hammer" ? [0,1,2].map(i=><motion.ellipse key={i} cy={ground} rx={35*s} ry={10*s} fill="none" stroke={i===1?"#FFFFFF":color} strokeWidth="4" initial={{scale:.3,opacity:1}} animate={{scale:4+i,opacity:0}} transition={{duration:.75,delay:i*.07}}/>) : move.weapon==="glaive" ? <motion.path d={`M0 ${-250*s} V${70*s}`} stroke="#FFFFFF" strokeWidth={12*s} initial={{pathLength:0,opacity:1}} animate={{pathLength:1,opacity:0}} transition={{duration:.65}}/> : move.weapon==="scythe" ? <motion.circle r={85*s} fill="#17132F" stroke={color} strokeWidth="4" initial={{scale:1.3,opacity:.85}} animate={{scale:0,opacity:0}} transition={{duration:.7}}/> : <motion.path d={`M${-150*s} ${-70*s} L${150*s} ${70*s} M${-150*s} ${70*s} L${150*s} ${-70*s}`} stroke="#FFFFFF" strokeWidth="5" initial={{pathLength:0,opacity:1}} animate={{pathLength:1,opacity:0}} transition={{duration:.65}}/>}
        {Array.from({length:8},(_,i)=><g key={i} transform={`rotate(${i*45})`}><motion.path d="M0 -14 V-55" stroke={color} strokeWidth="3" initial={{y:0,opacity:1}} animate={{y:-70*s,opacity:0}} transition={{duration:.7}}/></g>)}
      </>}
    </g>}
  </svg>;
}
