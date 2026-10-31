"use client";
import { motion } from "framer-motion";
export type DuelSpark={id:number;x:number;y:number;color:string;launch:boolean};
export default function DuelImpact({spark:s}:{spark:DuelSpark}) {
  return <svg aria-hidden className="pointer-events-none absolute inset-0 z-30 h-full w-full overflow-hidden">
    <g transform={`translate(${s.x} ${s.y})`}>
      <motion.path d="M0 -34 L7 -9 L31 -20 L16 0 L39 9 L10 13 L2 36 L-6 13 L-30 24 L-18 3 L-36 -9 L-9 -7 Z" fill="#FFFFFF" stroke={s.color} strokeWidth="2" initial={{scale:.2,opacity:1,rotate:-15}} animate={{scale:[.2,1.15,.8],opacity:[1,1,0],rotate:18}} transition={{duration:.28}}/>
      {[-1,1].map(side=><motion.path key={side} d={`M${side*18} 0 L${side*70} ${s.launch?-55:12}`} stroke={s.color} strokeWidth="4" initial={{pathLength:0,opacity:1}} animate={{pathLength:1,opacity:0}} transition={{duration:.35}}/>)}
    </g>
  </svg>;
}
