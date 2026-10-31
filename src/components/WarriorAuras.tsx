import { motion } from "framer-motion";
import { EXTRA_AURA_COLORS } from "@/lib/cosmetics";

const cycle = (duration: number) => ({ duration, repeat: Infinity, ease: "easeInOut" as const });
const star = "M0 -8 L2 -2 L8 0 L2 2 L0 8 L-2 2 L-8 0 L-2 -2 Z";

// New effects have their own silhouettes and motion, independent of angel wings.
// Front layers stay around the feet/edges so code, eyes and weapons remain clear.
export default function WarriorAuras({ kind, loop, layer }: { kind: string; loop: boolean; layer: "back" | "front" }) {
  const colors = EXTRA_AURA_COLORS[kind];
  if (!colors) return null;
  const [a, b] = colors;
  const front = layer === "front";
  let art;
  switch (kind) {
    case "singularity": art = front ? <>
      <motion.path d="M12 185 Q100 244 190 179" fill="none" stroke={b} strokeWidth="4" opacity="0.8" animate={loop?{pathLength:[0.4,1,0.4]}:undefined} transition={cycle(3)}/>
      <path d="M26 204 Q95 232 174 200" fill="none" stroke={a} strokeWidth="2"/>
    </> : <>
      <ellipse cx="100" cy="112" rx="88" ry="99" fill="#14122B" opacity="0.78"/>
      <motion.g style={{originX:"100px",originY:"112px"}} animate={loop?{rotate:[0,360]}:undefined} transition={{duration:16,repeat:Infinity,ease:"linear"}}>
        <ellipse cx="100" cy="112" rx="91" ry="76" fill="none" stroke={a} strokeWidth="9" strokeDasharray="140 70"/>
        <ellipse cx="100" cy="112" rx="80" ry="96" fill="none" stroke={b} strokeWidth="3" strokeDasharray="55 42"/>
      </motion.g><ellipse cx="100" cy="121" rx="104" ry="25" fill="none" stroke={b} strokeWidth="4" transform="rotate(-22 100 121)" opacity="0.7"/>
    </>; break;
    case "meteor": art = (front ? [[12,154],[184,185]] : [[20,33],[164,18],[8,89],[185,88]]).map(([x,y],i)=><motion.g key={i} animate={loop?{x:[0,-12,0],y:[-15,25,-15],opacity:[0.5,1,0.5]}:undefined} transition={cycle(1.3+i*0.3)}><path d={`M${x-3} ${y+12} l22 -47 l-8 40 Z`} fill={a} opacity="0.5"/><path d={`M${x} ${y+12} l16 -30 l-2 28 Z`} fill={b}/><circle cx={x+5} cy={y+10} r="5" fill={a}/><circle cx={x+4} cy={y+9} r="2" fill="#FFFFFF"/></motion.g>); break;
    case "crystal": art = (front ? [[33,206],[166,214]] : [[22,43],[174,34],[2,128],[197,131],[26,176],[179,178]]).map(([x,y],i)=><g key={i} transform={`translate(${x} ${y}) rotate(${i%2?18:-18})`}><motion.g animate={loop?{y:[0,-9,0],opacity:[0.65,1,0.65]}:undefined} transition={cycle(2.3+i*0.2)}><path d="M0 -19 L10 -3 L6 18 L-6 18 L-10 -3 Z" fill={a} stroke={b} strokeWidth="1.5"/><path d="M0 -17 V16 L8 -3 Z" fill={b} opacity="0.6"/><path d="M-5 -4 L0 -13" stroke="#FFFFFF" strokeWidth="2"/></motion.g></g>); break;
    case "tentacles": art = front ? <path d="M29 216 Q67 239 95 222 M110 228 Q145 238 178 215" fill="none" stroke={b} strokeWidth="4" opacity="0.8"/> : <>
      {[0,1,2,3].map((i)=><g key={i} transform={i>1?"translate(200 0) scale(-1 1)":undefined}><motion.g animate={loop?{rotate:[-2,3,-2]}:undefined} style={{originX:"100px",originY:"220px"}} transition={cycle(3+i*0.4)}><path d={i%2?"M74 221 C30 205 10 166 29 126 C44 94 14 77 10 100 C8 114 25 116 23 101":"M93 221 C26 216 -6 164 9 133 C20 111 -4 89 -8 108"} fill="none" stroke="#401C5E" strokeWidth="12" strokeLinecap="round"/><path d={i%2?"M74 221 C30 205 10 166 29 126 C44 94 14 77 10 100":"M93 221 C26 216 -6 164 9 133 C20 111 -4 89 -8 108"} fill="none" stroke={a} strokeWidth="5" strokeLinecap="round"/></motion.g></g>)}
      <ellipse cx="100" cy="225" rx="73" ry="14" fill="#321641" opacity="0.5"/>
    </>; break;
    case "matrix": art = front ? <g fill={b} fontSize="9" fontFamily="monospace" opacity="0.8"><text x="28" y="216">0101</text><text x="152" y="230">1100</text></g> : [8,27,169,190].map((x,i)=><motion.g key={x} animate={loop?{y:[-12,22,-12],opacity:[0.35,0.9,0.35]}:undefined} transition={cycle(2+i*0.4)}><path d={`M${x} 22 V191`} stroke={a} strokeWidth="1" opacity="0.25"/><text fill={a} fontFamily="monospace" fontSize="10" fontWeight="bold">{Array.from({length:10},(_,j)=><tspan key={j} x={x-3} y={30+j*17}>{(i+j)%3?"1":"0"}</tspan>)}</text><rect x={x-4} y={130+i*12} width="8" height="12" fill={b} opacity="0.9"/></motion.g>); break;
    case "spirit-koi": art = [front?1:0].map(i=><g key={i} transform={i?"translate(180 178) rotate(150)":"translate(14 86) rotate(-25)"}><motion.g animate={loop?{y:[0,-18,0],x:[0,7,0]}:undefined} transition={cycle(4)}><path d="M0 -24 Q17 -6 0 22 Q-17 -6 0 -24 Z" fill={i?b:a} stroke="#FFFFFF" strokeWidth="1.5"/><path d="M0 20 L15 39 L0 32 L-15 39 Z M-7 1 L-19 10 L-9 12 M7 1 L19 10 L9 12" fill={i?a:b}/><path d="M0 -12 Q9 0 0 12 Q-9 0 0 -12" fill="#FFFFFF" opacity="0.5"/><circle cx="-4" cy="-12" r="2" fill="#173450"/><circle cx="4" cy="-12" r="2" fill="#173450"/><path d="M0 37 Q-21 52 1 64" fill="none" stroke={i?b:a} strokeWidth="2" strokeDasharray="3 5"/></motion.g></g>); break;
    case "thornbloom": art = front ? <path d="M30 220 Q100 246 174 217" fill="none" stroke={a} strokeWidth="3"/> : <>{[false,true].map(mirror=><g key={String(mirror)} transform={mirror?"translate(200 0) scale(-1 1)":undefined}><motion.path d="M56 224 Q4 184 26 145 Q-1 112 22 66 Q10 45 31 26" fill="none" stroke={a} strokeWidth="5" animate={loop?{pathLength:[0.9,1,0.9]}:undefined} transition={cycle(4)}/><path d="M24 151 L7 143 L17 162 M19 102 L2 89 L13 113 M24 62 L44 50 L34 76" fill={a}/>{[[27,145],[20,66],[36,193]].map(([x,y])=><g key={y} transform={`translate(${x} ${y})`}><path d="M0 -11 Q16 -12 8 0 Q17 12 2 10 Q-10 18 -8 2 Q-19 -7 -4 -6 Z" fill={b}/><circle r="3" fill="#FFF2B6"/></g>)}</g>)}</>; break;
    case "solar": art = front ? <g fill={b}><path d={star} transform="translate(21 195)"/><path d={star} transform="translate(183 211) scale(.7)"/></g> : <motion.g style={{originX:"100px",originY:"112px"}} animate={loop?{rotate:[0,360]}:undefined} transition={{duration:35,repeat:Infinity,ease:"linear"}}>{Array.from({length:16},(_,i)=><g key={i} transform={`rotate(${i*22.5} 100 112)`}><path d={`M94 40 L100 ${i%2?2:-12} L106 40 L100 54 Z`} fill={i%2?a:b} opacity="0.75"/><path d="M99 9 V37" stroke="#FFFFFF" strokeWidth="1.5"/></g>)}<circle cx="100" cy="112" r="74" fill={a} opacity="0.12"/></motion.g>; break;
    case "planets": art = front ? <><path d="M5 165 Q103 230 199 158" fill="none" stroke={b} strokeWidth="2" opacity="0.7"/><motion.g animate={loop?{x:[0,12,0],y:[0,-5,0]}:undefined} transition={cycle(4)}><circle cx="163" cy="210" r="12" fill={a}/><path d="M143 211 Q164 196 184 207 Q168 222 143 211" fill="none" stroke={b} strokeWidth="3"/></motion.g></> : <>
      <ellipse cx="100" cy="126" rx="102" ry="71" fill="none" stroke={b} strokeWidth="1.5" opacity="0.6" transform="rotate(-32 100 126)"/><ellipse cx="100" cy="126" rx="102" ry="71" fill="none" stroke={a} strokeWidth="1.5" opacity="0.5" transform="rotate(40 100 126)"/>
      <motion.g animate={loop?{y:[0,10,0],x:[0,-7,0]}:undefined} transition={cycle(5)}><circle cx="11" cy="102" r="16" fill={a}/><path d="M-4 99 Q10 113 27 98" fill="none" stroke={b} strokeWidth="4"/><circle cx="17" cy="94" r="4" fill="#FFFFFF" opacity="0.5"/></motion.g><circle cx="177" cy="42" r="10" fill="#C5B5FF"/><circle cx="179" cy="38" r="3" fill="#F7E8FF"/>
    </>; break;
    case "sandstorm": art = front ? <><motion.path d="M-2 190 Q103 251 205 187" fill="none" stroke={a} strokeWidth="5" strokeDasharray="27 7 5 10" animate={loop?{strokeDashoffset:[0,-98]}:undefined} transition={{duration:4,repeat:Infinity,ease:"linear"}}/><path d="M13 214 Q100 240 188 211" fill="none" stroke={b} strokeWidth="2"/></> : <>
      <motion.path d="M10 178 Q-20 126 20 74 M187 178 Q221 121 181 62" fill="none" stroke={a} strokeWidth="10" opacity="0.35" animate={loop?{opacity:[0.15,0.4,0.15]}:undefined} transition={cycle(3)}/>
      {[[15,55],[184,94],[8,159],[177,175]].map(([x,y],i)=><g key={i} transform={`translate(${x} ${y}) rotate(${i*15})`}><motion.g animate={loop?{y:[0,-8,0]}:undefined} transition={cycle(2+i*.4)}><path d="M-5 -11 H5 L-5 11 H5 M0 -4 H8" fill="none" stroke={b} strokeWidth="2"/><circle cx="-9" cy="19" r="2" fill={a}/></motion.g></g>)}
    </>; break;
  }
  return <g data-aura={kind} data-aura-layer={layer} pointerEvents="none">{art}</g>;
}
