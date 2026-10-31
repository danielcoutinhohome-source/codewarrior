import { motion } from "framer-motion";
import { weaponSpec } from "@/lib/cosmetics";

type Paint = (name: string) => string;
const ink = "#20263F";

// The same grip anchor is used by all three weapon families and the legacy blade.
export function WeaponArt({ value, paint }: { value: string; paint: Paint }) {
  const spec = weaponSpec(value);
  if (!spec) return null;
  const color = paint("weapon");
  return <g data-weapon={value} stroke={ink} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
    <path d="M160 56 V210" stroke={ink} strokeWidth="9"/>
    <path d="M160 64 V209" stroke={color} strokeWidth="3"/>
    {spec.type === "scythe" ? <>
      <path d="M153 37 Q199 17 214 78 Q190 48 166 59 L157 77 Z" fill={color}/>
      <path d="M157 43 Q195 29 209 65 Q189 43 168 51" fill="#FFFFFF" opacity="0.75" stroke="none"/>
      <path d="M151 39 L162 24 L172 42 L162 62 L150 53 Z" fill={color}/>
      <path d="M163 68 L173 86 L161 83" fill={color}/>
    </> : spec.type === "hammer" ? <>
      <path d="M134 47 L199 47 L212 61 V91 L199 105 H134 L123 91 V61 Z" fill="#3A435F"/>
      <path d="M126 62 L141 55 V97 L126 89 Z M195 55 L208 63 V89 L195 97 Z" fill={color}/>
      <path d="M146 53 H190 V99 H146 Z" fill="#171C32"/>
      <path d="M167 58 L183 76 L167 94 L151 76 Z" fill={color}/>
      <path d="M167 65 L176 76 L167 87 L158 76 Z" fill="#FFFFFF" opacity="0.75" stroke="none"/>
      <path d="M151 106 L159 118 L168 106" fill={color}/>
    </> : <>
      <path d="M160 0 L173 30 L170 63 L160 86 L151 64 L147 31 Z" fill={color}/>
      <path d="M160 9 L164 33 L160 71 L156 34 Z" fill="#FFFFFF" stroke="none"/>
      <path d="M154 50 L134 28 L141 66 L158 82 M167 51 L188 30 L181 67 L162 82" fill={color}/>
      <path d="M160 192 L172 209 L160 231 L149 210 Z" fill={color}/>
    </>}
    <path d="M154 124 H166 M154 131 H166 M154 139 H166 M154 155 H166 M154 163 H166" stroke="#67718E" strokeWidth="4"/>
    <circle cx="160" cy="146" r="12" fill={paint("hand")}/><path d="M154 141 L160 138" stroke="#FFFFFF" strokeOpacity="0.5" strokeWidth="3"/>
  </g>;
}

export function Headwear({ kind, paint, back = false }: { kind: string; paint: Paint; back?: boolean }) {
  if (!kind || kind === "none") return null;
  const en = paint("hair");
  const gem = <path d="M100 16 L107 25 L100 34 L93 25 Z" fill="#FFFFFF" stroke={ink} strokeWidth="1.5"/>;
  let art;
  switch (kind) {
    case "wizard": art = <><path d="M61 29 L86 -23 Q100 -42 134 -27 L116 -12 L133 28 Z" fill={en}/><path d="M58 25 Q100 11 143 26 L153 37 Q100 51 46 37 Z" fill={en}/><path d="M68 17 L128 17 L133 28 L61 29 Z" fill={ink}/><path d="M96 -14 L99 -6 L108 -5 L101 1 L103 10 L96 5 L88 10 L91 1 L84 -5 L93 -6 Z" fill="#FFF0B6" strokeWidth="1"/></>; break;
    case "cap": art = <><path d="M54 29 Q58 -3 102 -2 Q140 -2 146 31 L119 43 L71 41 Z" fill={en}/>{back ? <><path d="M82 25 H118 V40 H82 Z" fill={ink}/><path d="M85 33 H113" stroke="#FFFFFF" strokeDasharray="3 5"/></> : <path d="M63 28 Q39 20 18 33 Q43 53 82 40" fill={en}/>}<path d="M67 29 Q100 38 141 28" fill="none" stroke={ink}/><path d="M100 1 V24" fill="none" stroke="#FFFFFF" strokeOpacity="0.3"/></>; break;
    case "beanie": art = <><path d="M55 27 Q54 -9 100 -9 Q146 -9 145 27 Z" fill={en}/><circle cx="100" cy="-13" r="12" fill={en}/><path d="M57 20 Q100 30 143 20 V40 Q100 48 57 40 Z" fill={en}/>{[68,81,94,107,120,133].map(x=><path key={x} d={`M${x} 24 V40`} stroke={ink} strokeOpacity="0.4"/>)}<path d="M112 29 H130 V40 H112 Z" fill={ink}/></>; break;
    case "crown": art = <><path d="M58 34 L49 -1 L74 13 L85 -18 L101 7 L118 -19 L131 12 L152 -1 L142 34 Z" fill={en}/><path d="M60 26 H141 V39 H60 Z" fill={ink}/>{[75,100,125].map(x=><path key={x} d={`M${x} 25 l6 7 l-6 7 l-6 -7 Z`} fill={en}/>)}<path d="M53 0 L72 17 M120 -13 L131 17" stroke="#FFFFFF" strokeOpacity="0.6"/></>; break;
    case "samurai": art = <><path d="M52 37 L63 8 L100 -1 L137 8 L149 37 L129 47 L100 30 L72 47 Z" fill={en}/><path d="M79 18 Q41 13 37 -21 Q57 -4 88 0 M121 18 Q159 13 163 -21 Q143 -4 112 0" fill={en}/><path d="M100 -10 L111 13 L100 31 L89 13 Z" fill="#FFF1BC"/><path d="M61 35 L45 62 L60 68 L79 42 M138 35 L154 62 L139 68 L122 42" fill={en}/></>; break;
    case "headphones": art = <><path d="M42 65 V37 Q43 0 100 0 Q157 0 158 37 V65" fill="none" stroke={ink} strokeWidth="15"/><path d="M42 38 Q42 5 100 5 Q158 5 158 38" fill="none" stroke={en} strokeWidth="7"/>{[36,149].map(x=><g key={x}><rect x={x} y="42" width="16" height="43" rx="7" fill={en}/><path d={`M${x+4} 54 V72 M${x+9} 49 V77`} stroke={ink} strokeWidth="2"/></g>)}</>; break;
    case "cat": art = <><path d="M53 35 L44 -19 L85 9 M147 35 L156 -19 L115 9" fill={en}/><path d="M57 18 L53 -4 L72 10 M143 18 L147 -4 L128 10" fill="#FFFFFF" opacity="0.7"/><path d="M68 25 Q100 12 132 25" fill="none" stroke={en} strokeWidth="7"/></>; break;
    case "bear": art = <><circle cx="55" cy="8" r="23" fill={en}/><circle cx="145" cy="8" r="23" fill={en}/><circle cx="55" cy="8" r="12" fill={ink}/><circle cx="145" cy="8" r="12" fill={ink}/><path d="M55 14 L57 6 L64 9 M138 9 L145 6 L147 14" stroke="#FFFFFF" fill="none" strokeWidth="2"/><path d="M63 24 Q100 6 137 24" fill="none" stroke={en} strokeWidth="8"/></>; break;
    case "antlers": art = <><g fill="none" stroke={en} strokeWidth="8" strokeLinecap="round"><path d="M73 26 L53 2 L48 -27 M53 2 L29 -7 L24 -23 M53 2 L68 -13 M127 26 L147 2 L152 -27 M147 2 L171 -7 L176 -23 M147 2 L132 -13"/></g><path d="M69 23 Q100 15 131 23 L129 33 H71 Z" fill={en}/>{gem}</>; break;
    case "afro": art = <><path d="M43 42 C17 18 30 -9 49 -8 C41 -32 77 -37 84 -23 C101 -45 124 -31 126 -24 C157 -35 171 -8 157 1 C182 16 162 40 149 43 Q100 20 43 42 Z" fill={en}/><path d="M46 11 Q62 -3 74 11 M85 -10 Q102 -24 114 -8 M129 10 Q146 -3 156 17" fill="none" stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="4"/><path d="M66 20 l3 -7 l3 7 l8 3 l-8 3 l-3 7 l-3 -7 l-7 -3 Z" fill="#FFFFFF" opacity="0.8"/></>; break;
    case "mohawk": art = <><path d="M79 34 L78 9 L87 14 L82 -12 L95 -4 L98 -37 L109 -11 L119 -23 L119 0 L132 -7 L125 21 L122 35 Z" fill={en}/><path d="M101 -25 L104 20 M87 2 L93 26 M119 0 L114 28" stroke="#FFFFFF" strokeOpacity="0.45" fill="none"/></>; break;
    case "spikes": art = <><path d="M47 44 L29 18 L51 18 L40 -11 L69 1 L76 -31 L96 -9 L114 -39 L123 -9 L153 -23 L145 6 L176 1 L157 25 L163 47 L130 32 L110 48 L89 31 L72 47 Z" fill={en}/><path d="M76 -12 L88 16 M117 -23 L111 23 M150 -5 L128 22 M47 14 L68 29" fill="none" stroke="#FFFFFF" strokeOpacity="0.4" strokeWidth="3"/></>; break;
    case "ponytail": art = back ? <><path d="M65 39 Q56 -5 100 -9 Q144 -5 137 39 L141 115 L121 144 L126 99 L100 132 L105 70 L70 102 Z" fill={en}/><path d="M105 4 Q92 55 92 86 M121 20 V112" fill="none" stroke={ink} strokeOpacity="0.3" strokeWidth="3"/></> : <><path d="M118 2 Q153 -24 176 3 Q164 16 177 55 L186 106 L160 87 L145 39 L127 29 Z" fill={en}/><path d="M56 38 Q58 -5 103 -7 Q141 -6 143 34 L117 25 L97 36 L85 22 Z" fill={en}/><path d="M130 1 L141 17" stroke={ink} strokeWidth="8"/></>; break;
    case "beard": art = back ? <><path d="M61 84 L65 111 L77 122 L73 95 M139 84 L135 111 L123 122 L127 95" fill={en}/></> : <><path d="M66 88 L78 96 L100 91 L122 96 L134 88 L129 112 L114 121 L100 141 L86 121 L71 112 Z" fill={en}/><path d="M77 98 Q87 106 98 100 M123 98 Q113 106 102 100 M90 112 L110 125 M110 112 L94 128" fill="none" stroke={ink} strokeOpacity="0.4"/><path d="M92 125 H108 L104 134 H96 Z" fill={ink}/></>; break;
    case "top-hat": art = <g transform="rotate(-10 100 30)"><path d="M65 27 L57 -27 Q100 -39 143 -27 L135 27 Z" fill={en}/><ellipse cx="100" cy="-27" rx="43" ry="8" fill={en}/><path d="M65 11 Q100 18 136 11 L135 27 Q100 34 65 27 Z" fill={ink}/><ellipse cx="100" cy="31" rx="63" ry="10" fill={en}/><path d="M110 12 L117 21 L110 30 L103 21 Z" fill="#FFFFFF"/></g>; break;
    default: return null;
  }
  return <g data-headwear={kind} stroke={ink} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">{art}</g>;
}

export function SurfaceFinish({ kind, en, clip, id, loop }: { kind: string; en: string; clip: string; id: (s: string) => string; loop: boolean }) {
  let art;
  switch (kind) {
    case "carbon": art = <><rect x="40" y="10" width="120" height="190" fill="#10182D" opacity="0.6"/>{Array.from({length:14},(_,i)=><g key={i} stroke={i%2?"#B5C4D9":"#080D19"} strokeWidth="3" opacity="0.5"><path d={`M35 ${i*16} l135 110 M165 ${i*16-60} l-135 110`}/></g>)}</>; break;
    case "obsidian": art = <><rect x="40" y="10" width="120" height="190" fill="#080E1D" opacity="0.82"/><g stroke={en} strokeWidth="2" fill="none"><path d="M68 18 L86 52 L74 80 L95 103 L77 134 L85 177 M142 18 L125 53 L140 81 L126 106 L141 139 L120 186 M86 52 L110 61 M77 134 L57 147 M141 139 L155 124"/></g><path d="M86 22 L112 40 L98 51 Z M109 128 L130 151 L107 162 Z" fill="#FFFFFF" opacity="0.15"/></>; break;
    case "hologram": art = <><rect x="40" y="10" width="120" height="190" fill={en} opacity="0.16"/>{Array.from({length:24},(_,i)=><path key={i} d={`M40 ${i*8+12} H160`} stroke={i%3?en:"#FFFFFF"} strokeWidth={i%3?1:2} opacity="0.45"/>)}<motion.rect x="40" y="65" width="120" height="14" fill="#FFFFFF" opacity="0.28" animate={loop?{y:[-50,115,-50]}:undefined} transition={{duration:4,repeat:Infinity,ease:"linear"}}/><path d="M47 117 H76 M126 153 H154 M51 39 H68" stroke={en} strokeWidth="5"/></>; break;
    case "scales": art = <>{Array.from({length:10},(_,r)=>Array.from({length:7},(_,c)=><path key={`${r}-${c}`} d={`M${37+c*20+(r%2)*10} ${18+r*20} q10 22 20 0`} fill="#18283B" fillOpacity="0.35" stroke={en} strokeOpacity="0.6" strokeWidth="1.5"/>))}</>; break;
    case "galaxy": art = <><defs><radialGradient id={id("nebula-shell")}><stop stopColor={en} stopOpacity="0.65"/><stop offset="1" stopColor="#11152F" stopOpacity="0.95"/></radialGradient></defs><rect x="40" y="10" width="120" height="190" fill={`url(#${id("nebula-shell")})`}/>{Array.from({length:22},(_,i)=><circle key={i} cx={48+(i*37)%106} cy={20+(i*61)%165} r={i%4?0.9:1.8} fill="#FFFFFF" opacity={i%3?0.8:0.45}/>)}<path d="M59 153 Q100 108 144 145 Q103 173 74 146" fill="none" stroke={en} strokeWidth="5" opacity="0.3"/></>; break;
    case "prism": art = <>{["M50 18 L102 19 L73 63 Z","M102 19 L151 22 L127 76 L73 63 Z","M51 83 L73 63 L127 76 L95 108 Z","M54 114 L96 106 L77 150 Z","M96 106 L145 111 L128 153 L77 150 Z","M77 150 L128 153 L104 190 Z"].map((d,i)=><path key={i} d={d} fill={["#91E7FF",en,"#D6ACFF",en,"#FFD1E4","#C3FFF1"][i]} fillOpacity="0.5" stroke="#FFFFFF" strokeOpacity="0.45"/> )}</>; break;
    case "frozen": art = <><rect x="40" y="10" width="120" height="190" fill="#C5EEFF" opacity="0.32"/><g fill="none" stroke="#E4FAFF" strokeWidth="2"><path d="M58 97 L87 61 L96 20 M79 72 L64 58 M89 51 L111 42 M144 189 L119 155 L124 112 M127 165 L143 148 M120 139 L103 130"/><path d="M57 143 L83 132 L65 121 M131 35 L145 51 L136 71" stroke={en}/></g></>; break;
    case "magma": art = <><rect x="40" y="10" width="120" height="190" fill="#1B1725" opacity="0.8"/><path d="M55 21 Q117 35 84 66 T105 108 Q145 122 114 145 T144 184" fill="none" stroke={en} strokeWidth="7"/><path d="M55 21 Q117 35 84 66 T105 108 Q145 122 114 145 T144 184" fill="none" stroke="#FFF6D6" strokeWidth="1.5"/><path d="M83 66 L55 78 M118 140 L146 129 M102 33 L137 22" fill="none" stroke={en} strokeWidth="3"/></>; break;
    default: return null;
  }
  return <g data-finish={kind} clipPath={clip} pointerEvents="none">{art}</g>;
}
