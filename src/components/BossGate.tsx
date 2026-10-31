"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useReduceMotion } from "@/lib/motionPref";
import { BOSS_GATES } from "@/lib/bossApproach";
import type { Scene } from "@/lib/game";
import { play } from "@/lib/sfx";
export default function BossGate({ scene, onOpen, onBack }: { scene: Scene; onOpen:()=>void; onBack:()=>void }) {
  const gate=BOSS_GATES[scene], reduce=useReduceMotion();
  const [wrong,setWrong]=useState(false),[opened,setOpened]=useState(false);
  const dialog=useRef<HTMLDivElement>(null),back=useRef<HTMLButtonElement>(null);
  const openCallback=useRef(onOpen);openCallback.current=onOpen;
  useEffect(()=>{ const prior=document.activeElement as HTMLElement|null;const overflow=document.body.style.overflow;document.body.style.overflow="hidden";back.current?.focus();return()=>{document.body.style.overflow=overflow;prior?.focus();}; },[]);
  useEffect(()=>{if(!opened)return;const rumble=setTimeout(()=>play("chamberOpen"),reduce?0:420);const timer=setTimeout(()=>openCallback.current(),reduce?120:950);return()=>{clearTimeout(timer);clearTimeout(rumble);};},[opened,reduce]);
  return <div className="fixed inset-0 z-[1000] grid place-items-center bg-[#070B16]/95 p-4" onKeyDown={e=>{
    if(e.key==="Escape"&&!opened)onBack();
    if(e.key==="Tab") {const nodes=dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');if(!nodes?.length)return;const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
  }}>
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="gate-title" className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-3xl border border-cyan-300/30 bg-[#10182A] p-5 text-white shadow-2xl sm:p-8">
      <button ref={back} onClick={onBack} disabled={opened} className="mb-5 rounded-lg px-2 py-1 text-sm text-slate-300 focus-visible:ring-2 focus-visible:ring-cyan-300">← Return to the path</button>
      <p className="text-xs font-bold uppercase tracking-[.25em] text-cyan-200">Boss threshold · one final trace</p>
      <h2 id="gate-title" className="mt-2 font-display text-3xl">{gate.title}</h2>
      <p className="mt-2 text-sm text-slate-300">Something is waiting on the other side. Solve the seal to enter.</p>
      <pre className="my-5 overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-4 text-sm leading-relaxed text-cyan-100"><code>{gate.code}</code></pre>
      <p className="mb-3 font-bold">{gate.prompt}</p>
      <div className="grid gap-2">{gate.options.map((option,i)=><button key={option} disabled={opened} onClick={()=>{if(i===gate.answer){setOpened(true);play("sealBreak");}else{setWrong(true);play("wrong");}}} className="rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-left font-bold transition hover:bg-cyan-300/15 focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:opacity-50">{option}</button>)}</div>
      <p role="status" className="mt-4 min-h-10 text-sm text-amber-200">{opened?"SEAL BROKEN. Entering the boss chamber…":wrong?gate.hint:"Unlimited tries. No health lost."}</p>
      {opened&&<motion.div aria-hidden className="pointer-events-none absolute inset-0 bg-[#050914]" initial={{opacity:0}} animate={{opacity:reduce?.2:.9}} transition={{duration:reduce?.1:.85}}/>}
    </div>
  </div>;
}
