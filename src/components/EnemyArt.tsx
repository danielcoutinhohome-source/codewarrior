import type { ReactNode } from "react";
import type { EnemyDesign } from "@/lib/game";

export type EnemyPalette = { skin: string; metal: string; dark: string; light: string; glow: string; muted: boolean; hurt: boolean };
type Props = { design: EnemyDesign; p: EnemyPalette };

// All silhouettes fit a shared 240px stage. Details stay inside the artwork,
// so weapons and boss halos also fit the small world-map portraits.
function Mirror({ children }: { children: ReactNode }) { return <g transform="translate(240 0) scale(-1 1)">{children}</g>; }
function Pair({ children }: { children: ReactNode }) { return <>{children}<Mirror>{children}</Mirror></>; }
function Crystal({ x, y, scale = 1, p }: { x: number; y: number; scale?: number; p: EnemyPalette }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`}><path d="M0 -22 L12 -7 L8 16 L-8 16 L-12 -7 Z" fill={p.skin}/><path d="M0 -22 V16 L12 -7 Z" fill={p.glow} opacity={p.muted ? 0 : 0.6}/></g>;
}
function Eyes({ x = 120, y = 88, gap = 14, p }: { x?: number; y?: number; gap?: number; p: EnemyPalette }) {
  return <g stroke={p.glow} strokeWidth="4" strokeLinecap="round" fill="none">
    {p.hurt ? <path d={`M${x-gap-4} ${y-4} l8 8 m0 -8 l-8 8 M${x+gap-4} ${y-4} l8 8 m0 -8 l-8 8`}/> : <path d={`M${x-gap-7} ${y-2} l12 4 M${x+gap+7} ${y-2} l-12 4`}/>}
  </g>;
}
function Mask({ p, x = 120, y = 82, horn = false }: { p: EnemyPalette; x?: number; y?: number; horn?: boolean }) {
  return <g transform={`translate(${x-120} ${y-82})`}>
    {horn && <Pair><path d="M95 66 Q63 57 68 30 L88 52 L106 60" fill={p.metal}/></Pair>}
    <path d="M92 65 L120 53 L148 65 L142 103 L120 115 L98 103 Z" fill={p.skin}/>
    <path d="M96 77 L120 67 L144 77 L138 97 L120 104 L102 97 Z" fill={p.dark}/>
    <path d="M120 55 L126 75 L120 106 L114 75 Z" fill={p.metal}/><Eyes p={p}/>
  </g>;
}
function Gem({ x = 120, y = 139, r = 12, p }: { x?: number; y?: number; r?: number; p: EnemyPalette }) {
  return <g><path d={`M${x} ${y-r} L${x+r} ${y} L${x} ${y+r} L${x-r} ${y} Z`} fill={p.glow} stroke={p.dark}/><path d={`M${x} ${y-r+4} V${y+r-4} L${x-r+4} ${y} Z`} fill={p.muted ? p.glow : "#FFFFFF"} opacity="0.5" stroke="none"/></g>;
}
function Legs({ p, armored = true }: { p: EnemyPalette; armored?: boolean }) {
  return <Pair><path d="M92 166 L87 198 L72 210 L108 210 L115 167" fill={p.dark}/>{armored && <path d="M88 175 L107 179 L104 200 L83 201 Z" fill={p.metal}/>}</Pair>;
}
function Armor({ p }: { p: EnemyPalette }) {
  return <><Legs p={p}/><path d="M82 110 L120 101 L158 110 L151 157 L138 177 L102 177 L89 157 Z" fill={p.skin}/><path d="M89 116 L120 128 L151 116 L142 151 L120 169 L98 151 Z" fill={p.metal}/><Gem p={p}/><Pair><path d="M84 107 L61 101 L48 125 L74 140 L94 125 Z" fill={p.skin}/></Pair></>;
}
function Blade({ p, x = 40, y = 136, angle = 0 }: { p: EnemyPalette; x?: number; y?: number; angle?: number }) {
  return <g transform={`translate(${x} ${y}) rotate(${angle})`}><path d="M-5 25 L-5 -39 L0 -66 L8 -40 L6 25 Z" fill={p.light}/><path d="M0 -61 V24" stroke={p.glow}/><path d="M-16 27 H17 L10 35 H-10 Z" fill={p.metal}/><path d="M-3 35 V54" stroke={p.dark} strokeWidth="8"/></g>;
}
function Wing({ p, crystal = false }: { p: EnemyPalette; crystal?: boolean }) {
  return <><path d="M100 111 L65 52 L17 27 L30 100 L12 141 L61 127 L88 150 Z" fill={p.dark}/><path d={crystal ? "M96 108 L23 37 L46 99 L18 132 L70 115 L86 140 Z" : "M94 108 Q61 75 23 37 L43 102 L20 132 L69 116 L87 140 Z"} fill={p.skin}/><path d="M23 37 L69 116 L94 108 M43 102 L69 116 L20 132" fill="none" stroke={p.metal}/><path d="M34 56 L68 104" stroke={p.glow} strokeWidth="2"/></>;
}

export default function EnemyArt({ design, p }: Props) {
  // Each case is a separate creature, rather than a recolor of a common body.
  switch (design) {
    case "byte-raider": return <>
      <path d="M92 103 L67 176 L102 190 L120 170 L145 190 L166 173 L147 102 Z" fill={p.dark}/><Legs p={p}/>
      <path d="M88 108 L145 108 L155 164 L94 166 Z" fill={p.skin}/><path d="M102 113 L130 154" stroke={p.metal} strokeWidth="12"/><Gem x={127} y={148} r={7} p={p}/>
      <Mask p={p}/><path d="M77 66 L89 44 L119 51 L151 38 L165 65 L140 76 L102 71 Z" fill={p.dark}/><path d="M84 62 L158 61" stroke={p.metal}/>
      <path d="M83 117 L61 148 L42 135" fill="none" stroke={p.skin} strokeWidth="16"/><Blade p={p} x={38} y={131} angle={-26}/>
      <path d="M150 119 L178 145 L181 168" fill="none" stroke={p.skin} strokeWidth="16"/><path d="M181 166 C211 163 210 196 186 190 L195 181" fill="none" stroke={p.metal} strokeWidth="7"/>
    </>;
    case "semicolon-mimic": return <>
      <Pair><path d="M68 160 L45 184 L31 181 L42 207 L79 199" fill={p.dark}/><path d="M72 139 L31 122 L24 148 L51 158" fill={p.skin}/></Pair>
      <path d="M57 125 L183 125 L178 193 L62 193 Z" fill={p.skin}/><path d="M65 130 L175 130 L168 167 L74 167 Z" fill={p.dark}/>
      <path d="M53 113 Q51 49 120 48 Q189 49 187 113 L175 124 L65 124 Z" fill={p.skin}/><Pair><path d="M76 61 L79 114 L94 114 L92 54 Z" fill={p.metal}/></Pair>
      <path d="M62 121 L76 140 L87 124 L100 145 L113 125 L126 146 L140 125 L151 141 L165 124 L178 137" fill={p.light}/>
      <path d="M75 167 L87 150 L100 167 L112 150 L126 167 L140 150 L153 167 L167 151" fill={p.light}/><Eyes p={p} y={91} gap={27}/>
      <path d="M67 179 H173" stroke={p.metal} strokeWidth="9"/><Gem y={180} r={10} p={p}/>
    </>;
    case "cast-corsair": return <>
      <Pair><path d="M80 166 L49 176 L27 205 M77 152 L32 155 L16 178" fill="none" stroke={p.metal} strokeWidth="10"/><path d="M72 123 L48 93 L36 95" fill="none" stroke={p.skin} strokeWidth="14"/></Pair>
      <path d="M51 145 L75 105 L120 91 L165 105 L189 145 L166 175 L73 175 Z" fill={p.skin}/><path d="M67 138 L120 112 L173 138 L154 158 L87 158 Z" fill={p.metal}/>
      <Mask p={p} y={84}/><path d="M23 76 L13 47 L28 56 L37 39 L46 65 L41 91 Z" fill={p.skin}/>
      <g stroke={p.metal} fill="none" strokeWidth="6"><path d="M202 53 V204 M183 34 V62 L202 75 L221 62 V34 M202 75 V20"/></g><Gem x={202} y={77} r={7} p={p}/>
    </>;
    case "division-ray": return <>
      <path d="M114 140 Q190 157 184 199 Q179 218 151 210" fill="none" stroke={p.metal} strokeWidth="9"/>
      <Pair><path d="M109 96 Q63 94 12 52 L27 137 L63 161 L107 139 Z" fill={p.skin}/><path d="M20 67 L52 123 L100 128 L57 144 L31 134 Z" fill={p.dark}/><path d="M32 87 L63 130 L91 130" fill="none" stroke={p.glow}/></Pair>
      <path d="M120 54 L146 101 L137 158 L120 182 L103 158 L94 101 Z" fill={p.skin}/><path d="M120 59 L125 151 L120 176 L115 151 Z" fill={p.metal}/><Eyes p={p} y={102} gap={11}/><Gem y={139} r={9} p={p}/>
    </>;
    case "compiler-leviathan": return <>
      <path d="M50 185 Q19 139 54 92 Q49 173 112 166 Q170 168 174 196 Q124 231 50 185 Z" fill={p.dark}/>
      <Pair><path d="M75 127 L30 139 L13 174 L49 166 L66 184 L84 156" fill={p.skin}/><path d="M51 145 L36 157 L65 158" fill={p.metal}/></Pair>
      <path d="M72 81 L88 54 L151 54 L178 93 L167 152 L149 186 L93 186 L71 150 Z" fill={p.skin}/>
      <Pair><path d="M87 65 L62 47 L70 22 L96 48" fill={p.metal}/><path d="M80 105 L94 122 L80 144 L103 163" fill="none" stroke={p.glow}/></Pair>
      <path d="M82 79 L120 67 L158 79 L147 107 L92 107 Z" fill={p.dark}/><Eyes p={p} y={88} gap={22}/>
      <path d="M88 113 L120 134 L152 113 L145 153 L120 167 L95 153 Z" fill={p.dark}/><Pair><path d="M94 118 L106 143 L112 128 M145 118 L132 145 L127 129" fill={p.light}/></Pair><Gem y={180} r={14} p={p}/>
    </>;
    case "fork-stalker": return <>
      <Pair><path d="M100 70 L75 44 L76 18 M76 43 L55 33 L52 17 M75 45 L92 32" fill="none" stroke={p.metal} strokeWidth="7"/></Pair>
      <path d="M90 99 L65 191 L120 174 L174 191 L150 99" fill={p.dark}/><Legs p={p}/><path d="M90 108 L150 108 L142 169 L101 169 Z" fill={p.skin}/><Mask p={p}/>
      <path d="M96 112 L87 151 L65 165 M146 118 L162 151 L184 151" fill="none" stroke={p.metal} strokeWidth="12"/><Blade p={p} x={57} y={151} angle={-30}/>
      <path d="M100 130 L120 116 L139 130 L120 153 Z" fill={p.dark}/><Gem y={131} r={8} p={p}/>
    </>;
    case "boolean-owl": return <>
      <Pair><path d="M91 107 L51 73 L15 102 L27 157 L47 139 L58 166 L78 145 L98 162" fill={p.skin}/><path d="M24 112 L76 143 M36 104 L87 131" stroke={p.metal}/></Pair>
      <path d="M77 66 L62 34 L105 54 L135 54 L178 34 L163 66 L167 139 L142 184 L120 200 L98 184 L73 139 Z" fill={p.skin}/>
      <Pair><path d="M84 80 Q108 63 119 92 L115 119 L84 129 L75 102 Z" fill={p.dark}/><path d="M84 97 L108 103" stroke={p.glow} strokeWidth="5"/></Pair>
      <path d="M111 115 L120 139 L129 115 Z" fill={p.metal}/><path d="M99 153 L120 169 L141 153 L120 185 Z" fill={p.metal}/><Gem y={164} r={7} p={p}/>
    </>;
    case "modulo-mantis": return <>
      <Pair><path d="M109 159 L82 180 L64 212 M107 163 L107 199 L93 212" fill="none" stroke={p.dark} strokeWidth="7"/><path d="M92 112 L52 85 L27 138 Q18 172 48 174 L36 153 L67 115 L96 143" fill={p.skin}/><path d="M36 151 L59 111" stroke={p.glow}/></Pair>
      <path d="M106 99 L134 99 L143 150 L120 187 L97 150 Z" fill={p.skin}/><path d="M120 110 L125 163 L120 180 L115 163 Z" fill={p.metal}/>
      <path d="M120 93 L86 64 L91 48 L149 48 L154 64 Z" fill={p.skin}/><Eyes p={p} y={66} gap={19}/><Pair><path d="M107 49 L99 30 L80 22" fill="none" stroke={p.metal}/></Pair>
    </>;
    case "nested-basilisk": return <>
      <path d="M54 186 C8 159 41 111 80 146 C122 190 186 207 192 163 C198 125 131 131 126 103" fill="none" stroke={p.dark} strokeWidth="36"/>
      <path d="M54 181 C20 155 45 124 80 151 C122 190 178 196 183 162 C187 140 126 144 121 104" fill="none" stroke={p.skin} strokeWidth="23"/>
      <path d="M93 82 L104 50 L146 45 L177 72 L167 103 L127 114 Z" fill={p.skin}/><path d="M146 45 L164 24 L166 55 M106 55 L91 34 L92 76" fill={p.metal}/>
      <path d="M113 88 L162 82" stroke={p.dark} strokeWidth="13"/><Eyes x={140} y={84} gap={12} p={p}/><path d="M150 107 L160 121 L165 102" fill={p.light}/>
      {[48,76,104,132,160].map((x,i)=><Crystal key={x} x={x} y={155+(i%2)*20} scale={0.45} p={p}/>)}
    </>;
    case "elder-else": return <>
      <Pair><path d="M98 60 L70 38 L66 13 M70 38 L41 41 L26 24 M70 38 L89 20" fill="none" stroke={p.metal} strokeWidth="9"/><path d="M79 115 L48 122 L34 157 L16 149 M35 155 L24 180 M48 122 L29 110" fill="none" stroke={p.skin} strokeWidth="13"/></Pair>
      <path d="M95 89 L145 89 L166 189 L202 211 L146 206 L120 218 L95 204 L43 213 L73 188 Z" fill={p.skin}/>
      <path d="M109 114 L99 162 L119 153 L130 192 L139 132" fill="none" stroke={p.glow} strokeWidth="4"/>
      <path d="M81 62 L120 46 L159 62 L151 110 L120 127 L89 110 Z" fill={p.dark}/><Eyes p={p} y={85} gap={21}/><Gem y={109} r={7} p={p}/>
      <Pair><path d="M65 49 L51 64 L66 78 L81 63 Z" fill={p.glow}/></Pair>
    </>;
    case "counter-crab": return <>
      <Pair><path d="M79 162 L47 173 L27 202 M73 147 L30 148 L15 173" fill="none" stroke={p.dark} strokeWidth="8"/><path d="M77 124 L46 109 L38 79" fill="none" stroke={p.skin} strokeWidth="16"/><path d="M28 86 Q7 49 33 40 L34 61 L48 42 Q72 69 46 90 Z" fill={p.skin}/></Pair>
      <path d="M56 142 L80 104 L160 104 L184 142 L158 182 L82 182 Z" fill={p.skin}/><circle cx="120" cy="142" r="32" fill={p.dark}/><circle cx="120" cy="142" r="25" fill="none" stroke={p.metal}/>
      <path d="M120 122 V143 L138 153" stroke={p.glow} strokeWidth="5" fill="none"/><Mask p={p} y={76}/>
    </>;
    case "while-jelly": return <>
      <Pair><path d="M72 127 Q50 159 71 179 Q90 200 66 215 M101 139 Q86 170 105 188 L100 213" fill="none" stroke={p.skin} strokeWidth="10"/></Pair>
      <ellipse cx="120" cy="91" rx="56" ry="60" fill={p.dark}/><path d="M52 127 Q58 54 120 49 Q182 54 188 127 L165 142 L143 130 L120 147 L97 130 L75 142 Z" fill={p.skin}/>
      <path d="M65 118 Q120 136 175 118" fill="none" stroke={p.glow} strokeWidth="6"/><Eyes p={p} y={101} gap={20}/><Gem y={74} r={10} p={p}/>
      <ellipse cx="120" cy="158" rx="70" ry="16" fill="none" stroke={p.glow} strokeWidth="2" opacity="0.5"/>
    </>;
    case "offset-angler": return <>
      <path d="M175 116 L219 78 L216 156 L175 147" fill={p.metal}/><path d="M69 102 Q47 44 92 34 Q130 29 132 54" fill="none" stroke={p.metal} strokeWidth="6"/><Gem x={132} y={55} r={15} p={p}/>
      <path d="M36 132 Q48 79 113 84 Q184 85 191 134 Q181 180 110 182 Q52 181 36 132 Z" fill={p.skin}/><path d="M45 124 Q97 110 116 133 Q101 171 53 159 Z" fill={p.dark}/>
      <path d="M51 125 L62 145 L74 123 L86 145 L99 128 M56 160 L69 144 L82 163 L95 146" fill={p.light}/><Eyes x={137} y={109} gap={14} p={p}/><path d="M129 173 L112 204 L158 180" fill={p.metal}/>
    </>;
    case "break-turtle": return <>
      <Pair><path d="M76 164 L48 184 L42 208 L84 200 L102 175" fill={p.dark}/></Pair><path d="M48 156 Q42 75 120 70 Q198 75 192 156 L173 182 L66 182 Z" fill={p.skin}/>
      <path d="M120 78 L149 102 L143 143 L96 143 L89 102 Z" fill={p.dark}/><path d="M120 82 V139 M91 104 L53 123 M147 104 L186 123 M99 144 L76 177 M142 144 L165 178" stroke={p.metal} strokeWidth="6"/>
      <path d="M91 143 L120 129 L149 143 L146 182 L120 200 L94 182 Z" fill={p.skin}/><Eyes p={p} y={159} gap={15}/><path d="M106 181 L120 190 L134 181" fill={p.metal}/><Crystal x={120} y={59} scale={0.8} p={p}/>
    </>;
    case "ouroboros": return <>
      <circle cx="120" cy="133" r="69" fill="none" stroke={p.dark} strokeWidth="34"/><path d="M61 151 C29 74 111 45 133 99 C161 153 221 119 192 65" fill="none" stroke={p.skin} strokeWidth="28"/>
      <path d="M53 161 Q97 227 170 176" fill="none" stroke={p.skin} strokeWidth="26"/>
      {[0,1,2,3,4].map(i=><Crystal key={i} x={53+i*29} y={173+Math.sin(i)*24} scale={0.55} p={p}/>)}
      <g transform="translate(-34 -4)"><Mask p={p} horn y={77}/></g><g transform="translate(53 -8)"><Mask p={p} horn y={77}/></g><Gem y={145} r={20} p={p}/>
      <path d="M96 137 Q120 120 144 137 Q120 159 96 137" fill="none" stroke={p.glow} strokeWidth="3"/>
    </>;
    case "index-yeti": return <>
      <Pair><path d="M89 150 L72 210 L109 210 L117 159" fill={p.dark}/><path d="M77 99 L44 103 L27 157 L48 177 L79 150" fill={p.skin}/><Crystal x={40} y={143} scale={1.2} p={p}/></Pair>
      <path d="M79 97 L94 72 L146 72 L166 106 L154 167 L120 184 L87 165 Z" fill={p.light}/><path d="M83 105 L102 88 L120 106 L139 87 L160 105 L145 149 L120 167 L96 150 Z" fill={p.skin}/>
      <Mask p={p} y={70}/><Pair><Crystal x={82} y={83} scale={0.75} p={p}/></Pair><Gem y={136} r={11} p={p}/>
    </>;
    case "substring-wyvern": return <>
      <Pair><Wing p={p} crystal/></Pair><path d="M112 146 Q165 154 178 192 L210 206 L180 214 Q147 185 103 178" fill={p.dark}/><path d="M108 100 L135 100 L151 167 L126 194 L94 178 Z" fill={p.skin}/>
      <Mask p={p} horn y={78}/><Pair><path d="M105 170 L87 199 L65 205 L92 212 L121 180" fill={p.metal}/></Pair><Crystal x={120} y={132} scale={0.7} p={p}/>
    </>;
    case "char-sabertooth": return <>
      <path d="M164 127 Q219 105 215 157" fill="none" stroke={p.metal} strokeWidth="9"/><path d="M75 120 Q122 92 183 131 L171 169 L74 165 Z" fill={p.skin}/>
      <path d="M85 150 L70 203 L92 209 L112 157 M158 151 L174 203 L199 203 L178 151" fill={p.dark}/>
      <path d="M57 73 L38 49 L39 97 L27 123 L49 160 L91 154 L111 118 L95 80 L78 51 Z" fill={p.skin}/>
      <path d="M35 125 L63 142 L98 124 L86 150 L50 160 Z" fill={p.dark}/><path d="M45 134 L55 184 L66 143 M84 135 L77 178 L69 144" fill={p.light}/><Eyes x={68} y={108} gap={18} p={p}/><Pair><Crystal x={104} y={117} scale={0.5} p={p}/></Pair>
    </>;
    case "echo-wraith": return <>
      <Pair><path d="M66 78 L42 100 L44 144 L67 163 L80 141 L79 99 Z" fill={p.skin} opacity="0.5"/><path d="M49 113 L66 119" stroke={p.glow} opacity="0.6"/></Pair>
      <path d="M89 91 L64 204 L96 188 L120 214 L144 188 L176 204 L151 91 Z" fill={p.dark}/><path d="M99 113 L84 180 L113 164 L120 193 L128 164 L158 180 L141 113 Z" fill={p.skin}/>
      <Mask p={p} y={81}/><path d="M120 56 V107" stroke={p.glow} strokeDasharray="4 5"/><Gem y={144} r={13} p={p}/>
      <Pair><path d="M92 123 L51 147 L31 137 M51 147 L31 160" fill="none" stroke={p.metal} strokeWidth="5"/></Pair>
    </>;
    case "null-lich": return <>
      <circle cx="120" cy="77" r="54" fill="none" stroke={p.metal} strokeWidth="9"/><circle cx="120" cy="77" r="65" fill="none" stroke={p.glow} strokeWidth="2" strokeDasharray="15 10"/>
      <path d="M90 105 L56 208 L92 196 L120 222 L149 196 L184 208 L150 105 Z" fill={p.dark}/><path d="M102 112 L90 184 L120 164 L149 184 L138 112" fill={p.skin}/>
      <Mask p={p} y={83}/><path d="M93 58 L85 32 L108 44 L120 21 L132 44 L154 32 L147 59 Z" fill={p.metal}/><Gem y={137} r={16} p={p}/>
      <path d="M83 123 L49 149 L30 125 M150 126 L186 144" fill="none" stroke={p.skin} strokeWidth="12"/><path d="M194 63 V214" stroke={p.metal} strokeWidth="6"/><Crystal x={194} y={49} scale={1.3} p={p}/>
    </>;
    case "bounds-bat": return <>
      <Pair><Wing p={p} crystal/></Pair><path d="M96 85 L144 85 L153 146 L120 181 L87 146 Z" fill={p.skin}/><Mask p={p} horn y={80}/><Crystal x={120} y={143} scale={0.95} p={p}/><Pair><path d="M102 165 L92 194 L108 190" fill={p.metal}/></Pair>
    </>;
    case "length-crawler": return <>
      {[0,1,2,3,4].map(i=><g key={i} transform={`translate(${i*31} ${Math.sin(i)*12})`}><path d="M40 151 L22 185 L28 205 M56 151 L70 185 L66 208" fill="none" stroke={p.metal} strokeWidth="6"/><path d="M23 117 L49 101 L76 116 L76 162 L49 177 L23 162 Z" fill={p.skin}/><Crystal x={49} y={109} scale={0.55} p={p}/></g>)}
      <path d="M158 100 L184 78 L218 99 L214 148 L185 169 L154 147 Z" fill={p.dark}/><Eyes x={185} y={116} gap={11} p={p}/><path d="M167 148 L175 168 L183 149 M207 146 L199 169 L191 150" fill={p.light}/>
    </>;
    case "swap-spider": return <>
      <Pair>{[0,1,2,3].map(i=><path key={i} d={`M94 ${119+i*10} L${29-i*5} ${79+i*31} L${17+i*10} ${113+i*31}`} fill="none" stroke={i%2?p.metal:p.skin} strokeWidth="8"/>)}</Pair>
      <path d="M83 92 L120 63 L157 92 L169 133 L147 170 L93 170 L71 133 Z" fill={p.skin}/><path d="M88 100 L120 85 L152 100 L143 143 L120 159 L97 143 Z" fill={p.dark}/>
      <Crystal x={120} y={94} scale={0.9} p={p}/><Eyes p={p} y={133} gap={15}/><path d="M103 160 L109 190 L120 168 L130 190 L137 160" fill={p.metal}/>
    </>;
    case "list-driller": return <>
      <Pair><path d="M91 165 L81 208 L110 208 L118 171" fill={p.dark}/><path d="M79 115 L51 119 L36 156 L59 170 L85 146" fill={p.skin}/></Pair><Armor p={p}/>
      <Mask p={p} y={77}/><path d="M92 57 L105 43 L136 43 L151 57" fill={p.metal}/><Gem y={59} r={8} p={p}/>
      <g transform="rotate(-35 45 151)"><path d="M19 165 L45 106 L73 165 Z" fill={p.light}/><path d="M34 131 L55 139 M28 145 L63 154 M22 158 L69 165" stroke={p.dark}/><path d="M22 170 H69 V184 H22 Z" fill={p.metal}/></g>
    </>;
    case "index-colossus": return <>
      <Pair><path d="M93 162 L69 211 L108 211 L119 171" fill={p.dark}/><path d="M80 86 L43 91 L22 148 L48 176 L80 154 Z" fill={p.skin}/><Crystal x={48} y={94} scale={1.4} p={p}/><path d="M33 146 L59 132 L72 153 L48 170 Z" fill={p.metal}/></Pair>
      <path d="M85 87 L120 73 L155 87 L166 151 L144 184 L97 184 L74 151 Z" fill={p.skin}/><path d="M86 110 L114 123 L103 149 L123 159 L130 183 M146 101 L131 124 L151 140" fill="none" stroke={p.glow} strokeWidth="4"/>
      <Mask p={p} y={65}/><Pair><Crystal x={82} y={53} scale={0.8} p={p}/></Pair><Gem y={141} r={18} p={p}/>
    </>;
    case "grid-sentinel": return <>
      <Armor p={p}/><Mask p={p}/><path d="M89 64 V36 H103 V47 H113 V36 H127 V47 H137 V36 H151 V64 Z" fill={p.metal}/>
      <path d="M29 125 L76 115 L84 174 L57 198 L28 176 Z" fill={p.dark}/><path d="M34 138 H78 M34 153 H80 M35 169 H80 M48 126 V181 M63 123 V187" stroke={p.glow} strokeWidth="2"/><Blade x={190} y={138} p={p}/>
    </>;
    case "constructor-raven": return <>
      <Pair><path d="M102 91 L58 55 L14 70 L44 94 L18 101 L52 121 L29 134 L87 154 L104 136" fill={p.dark}/><path d="M24 74 L88 123 M32 105 L90 134" stroke={p.metal} strokeWidth="5"/></Pair>
      <path d="M100 86 L139 86 L151 155 L120 196 L89 155 Z" fill={p.skin}/><path d="M93 93 L96 57 L124 43 L150 62 L144 95 L120 115 Z" fill={p.skin}/>
      <path d="M115 78 L171 92 L126 106 Z" fill={p.metal}/><Eyes x={119} y={73} gap={10} p={p}/><Gem y={140} r={14} p={p}/>
      <path d="M106 178 L98 201 L78 208 M135 178 L144 201 L165 208" fill="none" stroke={p.metal} strokeWidth="6"/><path d="M175 165 V209 M162 187 H175 M164 200 H175" stroke={p.metal} strokeWidth="6"/><circle cx="175" cy="154" r="12" fill="none" stroke={p.glow} strokeWidth="5"/>
    </>;
    case "this-duelist": return <>
      <path d="M91 99 L45 198 L94 182 L119 201 L172 190 L150 99 Z" fill={p.dark}/><Armor p={p}/><Mask p={p}/><path d="M110 54 Q105 20 145 29 L131 57" fill={p.glow}/>
      <Blade x={45} y={139} angle={-30} p={p}/><Blade x={193} y={137} angle={30} p={p}/><path d="M91 119 L58 147 M150 119 L183 147" stroke={p.metal} strokeWidth="13"/>
    </>;
    case "base-gargoyle": return <>
      <Pair><path d="M98 98 L62 52 L17 46 L38 96 L19 130 L58 119 L81 146 Z" fill={p.dark}/><path d="M28 56 L61 103 L88 115" fill="none" stroke={p.metal} strokeWidth="4"/></Pair>
      <path d="M94 100 L146 100 L153 155 L174 178 L154 198 L119 184 L88 198 L66 177 L88 150 Z" fill={p.skin}/><Mask p={p} horn y={78}/><Pair><path d="M94 119 L66 151 L62 185 H86" stroke={p.metal} strokeWidth="13" fill="none"/></Pair>
      <path d="M65 199 H175 V217 H65 Z" fill={p.dark}/><Gem y={139} r={12} p={p}/>
    </>;
    case "stack-tyrant": return <>
      <Pair><path d="M64 109 L35 111 L21 179 L55 190 L73 155 Z" fill={p.dark}/><path d="M31 132 H57 M27 151 H59 M25 171 H53" stroke={p.glow} strokeWidth="3"/></Pair>
      {[0,1,2].map(i=><g key={i}><path d={`M${64+i*10} ${174-i*36} L${120} ${161-i*36} L${176-i*10} ${174-i*36} V${201-i*36} L120 ${216-i*36} L${64+i*10} ${201-i*36} Z`} fill={i%2?p.dark:p.skin}/><path d={`M${68+i*10} ${179-i*36} L120 ${192-i*36} L${172-i*10} ${179-i*36}`} stroke={p.metal} fill="none"/></g>)}
      <Mask p={p} y={65}/><path d="M91 49 L87 24 L105 34 L120 12 L135 34 L153 24 L149 49 Z" fill={p.metal}/><Gem y={146} r={18} p={p}/><Pair><Crystal x={41} y={83} scale={0.7} p={p}/></Pair>
    </>;
    case "sum-twins": return <>
      <Pair><g transform="translate(-32 6) scale(.9)"><Legs p={p}/><path d="M79 102 L157 102 L165 162 L143 180 L94 180 L73 162 Z" fill={p.skin}/><Mask p={p} y={76}/><path d="M78 115 L43 128 L37 167 L67 178 L88 146 Z" fill={p.metal}/><Gem y={143} r={13} p={p}/></g></Pair>
      <path d="M89 113 H151 M89 145 H151" stroke={p.glow} strokeWidth="6"/><circle cx="120" cy="129" r="20" fill={p.dark}/><path d="M108 129 H132 M120 117 V141" stroke={p.glow} strokeWidth="5"/>
    </>;
    case "stock-mage": return <>
      <circle cx="120" cy="92" r="62" fill="none" stroke={p.metal} strokeWidth="3" strokeDasharray="5 12"/><path d="M94 102 L58 202 L97 191 L120 216 L144 191 L181 202 L147 102 Z" fill={p.dark}/><path d="M99 116 L88 175 L120 194 L153 175 L140 116" fill={p.skin}/><Mask p={p}/>
      <path d="M102 123 H138 L106 164 H138 Z" fill={p.metal}/><path d="M109 129 L120 141 L131 129 M109 158 L120 146 L131 158" fill={p.glow}/>
      <path d="M86 126 L53 140 L37 119 M153 126 L183 146 L204 119" fill="none" stroke={p.skin} strokeWidth="11"/><path d="M22 99 L43 85 L61 93 L80 64" fill="none" stroke={p.glow} strokeWidth="4"/><Crystal x={198} y={94} scale={0.8} p={p}/>
    </>;
    case "mirror-paladin": return <>
      <Pair><path d="M89 119 L49 70 L25 79 L47 135 L69 166 Z" fill={p.light}/><path d="M34 85 L70 139" stroke={p.glow} strokeWidth="4"/></Pair><Armor p={p}/><Mask p={p}/><path d="M120 27 L132 51 L120 67 L108 51 Z" fill={p.glow}/>
      <Pair><Blade x={43} y={143} angle={-14} p={p}/></Pair><path d="M120 104 V175" stroke={p.glow} strokeWidth="3"/>
    </>;
    case "merge-minotaur": return <>
      <Pair><path d="M93 166 L80 209 L110 209 L120 172" fill={p.dark}/><path d="M83 99 L48 112 L29 165 L57 182 L89 145" fill={p.skin}/></Pair>
      <path d="M85 96 L155 96 L169 146 L143 183 L98 183 L71 146 Z" fill={p.skin}/><path d="M84 110 L120 126 L156 110 L144 151 L120 166 L96 151 Z" fill={p.metal}/>
      <Mask p={p} horn y={77}/><path d="M103 96 L137 96 L139 113 L101 113 Z" fill={p.dark}/><Gem y={142} r={11} p={p}/>
      <path d="M193 64 V213" stroke={p.metal} strokeWidth="9"/><path d="M190 69 Q145 55 159 120 L190 103 L220 120 Q235 55 197 69 Z" fill={p.light}/><path d="M160 115 L189 95 M220 115 L198 95" stroke={p.glow} strokeWidth="3"/>
    </>;
    case "final-judge": return <>
      <circle cx="120" cy="116" r="74" fill={p.dark}/><circle cx="120" cy="116" r="87" fill="none" stroke={p.metal} strokeWidth="5"/><circle cx="120" cy="116" r="65" fill="none" stroke={p.glow} strokeWidth="2" strokeDasharray="12 9"/>
      {[0,1,2,3,4,5].map(i=><g key={i} transform={`rotate(${i*60} 120 116)`}><path d="M111 44 L106 17 L120 5 L134 17 L129 44 L120 57 Z" fill={p.skin}/><path d="M120 12 V43" stroke={p.glow} strokeWidth="3"/></g>)}
      <path d="M62 115 Q120 51 178 115 Q120 179 62 115 Z" fill={p.light}/><circle cx="120" cy="115" r="30" fill={p.skin}/><path d="M120 88 L130 115 L120 142 L110 115 Z" fill={p.hurt?p.glow:p.dark}/>
      {p.hurt && <path d="M109 104 L131 126 M131 104 L109 126" stroke={p.dark} strokeWidth="5"/>}<path d="M89 82 L120 62 L151 82 M88 150 L120 171 L152 150" stroke={p.metal} strokeWidth="6" fill="none"/>
      <Gem x={120} y={54} r={8} p={p}/><Gem x={120} y={178} r={8} p={p}/>
    </>;
    default: {
      const exhaustive: never = design;
      return exhaustive;
    }
  }
}
