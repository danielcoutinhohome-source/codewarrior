import type { Theme } from "@/lib/game";

type Props = { theme: Theme; variant: number };
const ink = "#26324B";
const gold = "#FFC957";
const mint = "#82F7D0";
function Label({ text, x = 100, y = 146, color = mint }: { text: string; x?: number; y?: number; color?: string }) {
  return <g><rect x={x - 41} y={y - 12} width="82" height="19" rx="4" fill={ink} stroke={color} strokeWidth="2"/><text x={x} y={y + 1} textAnchor="middle" fontFamily="monospace" fontSize="9" fontWeight="bold" fill={color}>{text}</text></g>;
}
function Bolts() { return <g fill={gold}>{[[-35,-12],[35,-12],[-35,12],[35,12]].map(([x,y])=><circle key={`${x},${y}`} cx={100+x} cy={160+y} r="3"/>)}</g>; }
function Windows({ color = gold }: { color?: string }) { return <g fill={color} stroke={ink} strokeWidth="2">{[54,86,118].map((x,i)=><g key={x}><rect x={x} y={85 + (i%2)*12} width="20" height="26" rx="7"/><path d={`M${x+10} ${85+(i%2)*12} v26`} strokeWidth="2"/></g>)}</g>; }

// Small explorable-looking districts: each silhouette belongs to its world.
// All decoration is static SVG, with no timers, filters, or external assets.
export default function WorldLandmark({ theme: t, variant: v }: Props) {
  let art;
  switch (t.scene) {
    case "shore": art = v === 0 ? <>
      <path d="M25 164 H179 L161 188 H44 Z" fill="#925939"/><path d="M34 169 H171 M44 179 H164" stroke="#E6BC80" strokeWidth="3"/>
      <path d="M44 151 V77 H157 V151" fill="#47B8C5"/><path d="M32 79 L59 47 H142 L171 79 Z" fill="#EF765C"/>
      <path d="M44 79 H157" stroke="#FFF0CE" strokeWidth="7" strokeDasharray="15 10"/><Windows/><Label text="BYTE ARCADE" y={135}/>
      <rect x="72" y="150" width="22" height="31" rx="3" fill={ink}/><path d="M78 157 H88 M79 164 H85" stroke={mint} strokeWidth="3"/>
      <path d="M158 130 L180 108 L187 114 L166 135 Z" fill={gold}/><circle cx="179" cy="97" r="8" fill="#F9E6AF"/>
    </> : v === 1 ? <>
      <path d="M12 139 Q102 170 190 137 L165 177 Q105 199 40 173 Z" fill="#89533E" stroke={ink} strokeWidth="3"/>
      <path d="M101 32 V155 M46 141 H165" stroke="#553F37" strokeWidth="6"/>
      <path d="M106 42 Q158 53 170 114 L106 120 Z" fill="#FFF0CF"/><path d="M94 55 L46 111 L94 119 Z" fill="#F28A65"/>
      <path d="M101 32 V12 L142 18 L131 32 Z" fill={ink}/><text x="120" y="25" fill={mint} fontSize="10" fontFamily="monospace">&lt;/&gt;</text>
      {[49,77,105,133,161].map(x=><circle key={x} cx={x} cy="157" r="6" fill={gold} stroke={ink} strokeWidth="2"/>)}
      <Label text="PORT 8080" x={103} y={141}/>
    </> : <>
      <path d="M45 178 L62 51 H131 L149 178 Z" fill="#FFF2CF" stroke={ink} strokeWidth="3"/><path d="M56 89 H138 M51 125 H143" stroke="#F07568" strokeWidth="21"/>
      <rect x="59" y="34" width="76" height="27" rx="4" fill={ink}/><rect x="71" y="39" width="52" height="17" fill={gold}/><path d="M53 34 L97 10 L142 34 Z" fill="#ED7661"/>
      <path d="M73 168 V145 Q97 126 121 145 V168" fill={ink}/><Label text="SAFE CAST" y={185}/>
      <path d="M12 183 Q28 164 42 180 M153 178 Q176 160 194 183" fill="none" stroke="#75D5CE" strokeWidth="5"/>
    </>; break;
    case "woods": art = v === 0 ? <>
      <path d="M86 190 L85 83 L57 58 M115 190 V94 L153 61" stroke="#745045" strokeWidth="19" fill="none"/>
      <path d="M25 94 Q7 38 61 32 Q88 -7 119 29 Q177 5 187 69 Q191 105 147 108 Z" fill="#438F6C" stroke="#285A51" strokeWidth="3"/>
      <rect x="52" y="74" width="105" height="68" rx="9" fill="#C99A63"/><path d="M39 77 L105 34 L170 77 Z" fill="#49777B"/><Windows color={mint}/>
      <path d="M113 146 L128 195 M96 146 L110 195 M100 157 H116 M104 170 H120 M108 183 H125" stroke="#E1BC81" strokeWidth="4"/>
      <Label text="IF / ELSE INN" y={132}/>
    </> : v === 1 ? <>
      <path d="M26 188 L37 74 Q44 25 94 32 M174 188 L163 74 Q156 25 106 32" fill="none" stroke="#755348" strokeWidth="22"/>
      <path d="M29 89 L15 59 L49 62 M170 89 L188 53 L151 62 M70 36 L58 13 L87 26 M132 36 L148 12 L113 24" fill="#6BA874"/>
      <path d="M65 44 Q101 72 139 44" fill="none" stroke={gold} strokeWidth="3"/>
      <Label text="TRUE →" x={60} y={110}/><Label text="← FALSE" x={146} y={147}/>
      <path d="M26 188 Q14 153 5 180 M170 188 Q192 145 198 181" stroke="#77B67B" fill="none" strokeWidth="6"/>
      <text x="92" y="108" fontFamily="monospace" fontSize="27" fill={mint}>?</text>
    </> : <>
      <path d="M35 176 Q18 106 60 89 Q102 58 157 89 Q185 114 170 176 Z" fill="#68817B" stroke={ink} strokeWidth="3"/>
      <path d="M69 171 V113 Q102 80 136 113 V171 Z" fill={ink}/><path d="M81 160 V118 M121 160 V118" stroke={mint} strokeWidth="4"/>
      <path d="M35 105 Q-3 77 20 65 Q56 48 77 84 M146 96 Q158 46 187 61 Q211 87 171 110" fill="#BA7CBD"/>
      <g fill="#FFE9C7"><circle cx="25" cy="75" r="6"/><circle cx="53" cy="78" r="4"/><circle cx="174" cy="76" r="7"/></g>
      <Label text="BRANCH CACHE" y={183}/>
    </>; break;
    case "lagoon": art = v === 0 ? <>
      <ellipse cx="101" cy="177" rx="91" ry="18" fill="#51B8B8"/><path d="M50 164 V91 H148 V164" fill="#77CED0" stroke={ink} strokeWidth="3"/>
      <path d="M44 95 L100 58 L156 95 Z" fill="#417D9C"/><path d="M84 158 V103 H118 V158" fill={ink}/>
      <circle cx="101" cy="128" r="23" fill="none" stroke={gold} strokeWidth="9" strokeDasharray="10 7"/><circle cx="101" cy="128" r="7" fill={mint}/>
      <path d="M21 168 V132 H51 M148 112 H178 V162" fill="none" stroke="#CEEEDC" strokeWidth="12"/><path d="M21 149 V170 M178 146 V172" stroke="#7DEBEE" strokeWidth="7"/>
      <Label text="LOOP PUMP" y={74}/>
    </> : v === 1 ? <>
      <path d="M40 180 L52 57 H148 L160 180 Z" fill="#6CA9AD" stroke={ink} strokeWidth="3"/>
      <path d="M36 61 H164 L146 36 H55 Z" fill="#F0CC88"/><path d="M74 166 V76 H128 V166" fill="#2F7189"/>
      <path d="M101 85 C48 94 151 151 101 158 C48 151 150 95 101 85" fill="none" stroke={mint} strokeWidth="6"/>
      <path d="M54 180 Q100 160 149 180" fill="none" stroke="#F7DC97" strokeWidth="8"/>
      <Label text="WHILE (true)" y={49}/>
    </> : <>
      <path d="M17 174 Q100 146 185 174" fill="none" stroke="#D39B6A" strokeWidth="14"/>
      {[32,70,132,170].map(x=><path key={x} d={`M${x} 182 V126`} stroke="#D3B17C" strokeWidth="7"/>)}
      <path d="M27 126 Q100 103 176 126" fill="none" stroke="#F5D69B" strokeWidth="5"/>
      <path d="M85 147 V81 M116 146 V81" stroke="#4C8C85" strokeWidth="5"/>
      <path d="M56 89 Q100 25 146 89 Z" fill="#B9E498"/><path d="M91 62 Q91 22 106 12 Q120 37 111 65" fill="#EB9CB6"/>
      <Label text="BREAK POINT" y={114}/>
    </>; break;
    case "peaks": art = v === 0 ? <>
      <path d="M38 177 V100 L99 59 L162 100 V177 Z" fill="#7B83AC" stroke={ink} strokeWidth="3"/>
      <path d="M20 105 L100 34 L180 105 L156 102 L100 57 L43 104 Z" fill="#EDF8FF"/><Windows color="#BCEFFF"/>
      <path d="M91 177 V128 H119 V177" fill={ink}/><path d="M30 177 Q98 157 174 177" stroke="#E7F6FF" strokeWidth="12"/>
      <Label text="STRING LODGE" y={145}/><path d="M153 70 V39 H165 V85" stroke="#7B83AC" strokeWidth="8"/>
    </> : v === 1 ? <>
      <path d="M12 33 L191 12" stroke={ink} strokeWidth="4"/><path d="M89 24 V57" stroke="#8AABC6" strokeWidth="6"/>
      <rect x="48" y="57" width="90" height="77" rx="15" fill="#E78387" stroke={ink} strokeWidth="3"/>
      <rect x="58" y="67" width="70" height="36" rx="7" fill="#C7F4FF"/><path d="M93 67 V103" stroke={ink} strokeWidth="3"/>
      <Label text="substring()" x={93} y={119}/><path d="M60 143 H126" stroke="#9DB6CB" strokeWidth="6"/>
      <path d="M21 188 L43 150 L77 187 M130 188 L158 148 L187 188" fill="#D5EDFF"/>
    </> : <>
      <path d="M24 185 L54 97 L83 118 L110 40 L151 114 L176 184 Z" fill="#8496BE"/>
      <path d="M81 119 L110 40 L135 88 L115 80 L103 101 L95 94 Z" fill="#F0F9FF"/>
      <path d="M77 171 L93 116 L111 95 L131 137 L125 174 Z" fill="#A8EDFF" stroke="#60A8D0" strokeWidth="3"/>
      <text x="106" y="151" fill={ink} fontFamily="monospace" fontSize="24" textAnchor="middle">""</text><Label text="EMPTY SUMMIT" y={184}/>
    </>; break;
    case "caverns": art = v === 0 ? <>
      <path d="M13 183 L24 63 L72 22 L139 24 L181 71 L190 183 Z" fill="#64537C" stroke={ink} strokeWidth="3"/>
      <path d="M42 180 V85 Q102 26 162 85 V180 Z" fill="#282B48"/><path d="M56 180 V92 Q102 53 147 92 V180" fill="none" stroke="#AD91B8" strokeWidth="10"/>
      <path d="M64 102 H141 M64 131 H141 M64 160 H141" stroke="#AC8AB6" strokeWidth="4"/>
      <path d="M68 173 L102 92 L135 173 Z" fill="#B387F0" stroke={mint} strokeWidth="3"/><Label text="INDEX VAULT" y={57}/>
    </> : v === 1 ? <>
      <path d="M13 165 L181 145 M16 184 L185 164" stroke="#9A92B4" strokeWidth="4"/>
      {[29,61,93,125,157].map(x=><path key={x} d={`M${x} 159 l4 20`} stroke="#B78E75" strokeWidth="6"/>)}
      <path d="M39 123 H148 L139 159 H51 Z" fill="#8C7189" stroke={ink} strokeWidth="4"/>
      <path d="M51 122 L65 69 L86 108 L105 45 L123 107 L137 82 L143 123" fill="#B694EE" stroke="#D9C9FF" strokeWidth="3"/>
      <circle cx="64" cy="163" r="12" fill={ink} stroke={gold} strokeWidth="3"/><circle cx="126" cy="155" r="12" fill={ink} stroke={gold} strokeWidth="3"/>
      <Label text="[0][1][2]" y={141}/>
    </> : <>
      <path d="M34 185 V60 H167 V185 Z" fill="#76618C" stroke={ink} strokeWidth="3"/>
      {[58,99,140].map((x,i)=><g key={x}><rect x={x-12} y="76" width="27" height="85" rx="4" fill="#302D4E" stroke="#B8A0CD" strokeWidth="2"/><text x={x+1} y="100" fill={mint} fontFamily="monospace" fontSize="14" textAnchor="middle">{i}</text><circle cx={x+1} cy="135" r="5" fill={gold}/></g>)}
      <path d="M25 61 L52 36 H149 L177 61 Z" fill="#AC90B8"/><Label text="BOUNDS CHECK" y={177}/>
    </>; break;
    case "castle": art = v === 0 ? <>
      <path d="M36 179 V88 H166 V179 Z" fill="#A991AE" stroke={ink} strokeWidth="3"/><path d="M26 88 L62 47 H143 L177 88 Z" fill="#7D578D"/>
      <path d="M70 177 V115 Q100 82 132 115 V177 Z" fill={ink}/><path d="M78 175 Q78 144 100 126 Q125 149 123 175" fill="#FF9B58"/>
      <path d="M91 174 Q88 154 103 149 L112 174" fill={gold}/><path d="M145 70 V25 H162 V86" stroke="#A991AE" strokeWidth="13"/>
      <path d="M24 183 H181" stroke="#D5B4BD" strokeWidth="9"/><Label text="CLASS FORGE" y={93}/>
    </> : v === 1 ? <>
      <path d="M19 181 V62 H182 V181" fill="#9E8CA6" stroke={ink} strokeWidth="3"/>
      <path d="M16 63 V40 H40 V55 H66 V40 H91 V55 H115 V40 H140 V55 H163 V40 H186 V63 Z" fill="#CAB5C5"/>
      {[48,100,152].map(x=><path key={x} d={`M${x-17} 179 V105 Q${x} 78 ${x+17} 105 V179 Z`} fill="#514462" stroke="#D2B9CD" strokeWidth="5"/>)}
      <path d="M33 82 H169" stroke={gold} strokeWidth="3"/><Label text="RECURSIVE HALL" y={74}/>
      <path d="M76 113 H123 V148 L100 162 L76 148 Z" fill="#A94969"/><text x="100" y="142" fill={gold} textAnchor="middle" fontSize="17">↻</text>
    </> : <>
      <path d="M39 181 V75 L64 58 L88 75 V181 M118 181 V75 L142 58 L166 75 V181" fill="#AD96B8" stroke={ink} strokeWidth="3"/>
      <path d="M39 78 H88 M118 78 H166" stroke="#DEC4CD" strokeWidth="8"/>
      <path d="M62 83 H143 V126 L103 151 L62 126 Z" fill="#7666B1" stroke={gold} strokeWidth="3"/>
      <text x="103" y="119" textAnchor="middle" fontFamily="monospace" fontSize="23" fill="#FFFFFF">{`{ }`}</text>
      <Label text="OBJECT GARDEN" y={173}/>
      <path d="M7 186 Q28 139 46 180 M155 180 Q182 137 197 186" fill="#668778"/>
    </>; break;
    case "citadel": art = v === 0 ? <>
      <path d="M29 181 V59 L64 35 H148 L174 59 V181 Z" fill="#303A68" stroke="#91A5D9" strokeWidth="3"/>
      {[49,88,127].map(x=><g key={x}><rect x={x} y="69" width="26" height="93" rx="4" fill="#171F42" stroke="#6388B9" strokeWidth="2"/>{[81,102,123,144].map((y,i)=><g key={y}><path d={`M${x+5} ${y} h15`} stroke={i%2?mint:"#C49CFF"} strokeWidth="3"/><circle cx={x+19} cy={y+6} r="1.5" fill={gold}/></g>)}</g>)}
      <path d="M64 34 V19 H140 V35" fill="none" stroke="#6B93C5" strokeWidth="4"/><Label text="SERVER GARDEN" y={57}/>
      <path d="M9 188 H194" stroke={mint} strokeWidth="3"/>
    </> : v === 1 ? <>
      <path d="M29 182 L51 150 H151 L177 182 Z" fill="#38456C" stroke="#7FA1D2" strokeWidth="3"/>
      <ellipse cx="103" cy="149" rx="46" ry="10" fill="#83EBD6" opacity=".6"/>
      <path d="M50 139 L66 37 H139 L156 139 Z" fill="#79DFC8" fillOpacity=".16" stroke={mint} strokeWidth="2" strokeDasharray="8 5"/>
      <path d="M74 104 L91 84 L104 96 L130 60 M74 119 H133 M76 56 V120" fill="none" stroke={mint} strokeWidth="5"/>
      <Label text="O(n log n)" y={38}/><Label text="ALGO EXCHANGE" y={175}/>
    </> : <>
      <path d="M46 182 V95 H158 V182 Z" fill="#333F66" stroke="#8BA1CF" strokeWidth="3"/>
      <path d="M32 99 L102 46 L173 99 Z" fill="#596C99" stroke="#A6BCED" strokeWidth="3"/>
      <path d="M102 46 V15" stroke={mint} strokeWidth="4"/><circle cx="102" cy="17" r="9" fill="none" stroke={mint} strokeWidth="3"/>
      <path d="M70 171 V120 H135 V171 Z" fill="#151F3D" stroke="#C49CFF" strokeWidth="3"/>
      <path d="M81 145 L94 157 L124 127" fill="none" stroke={mint} strokeWidth="6"/><Label text="ACCEPTED" y={104}/>
      <path d="M12 185 L25 125 L42 185 M166 185 L184 118 L198 185" fill="#516D93" stroke="#80DFCE" strokeWidth="2"/>
    </>; break;
    default: { const exhaustive: never = t.scene; throw new Error(`Unknown scene ${exhaustive}`); }
  }
  return <svg aria-hidden="true" viewBox="0 0 200 200" width="100%" height="100%" data-world={t.scene} data-landmark={v} className="pointer-events-none overflow-visible"><ellipse cx="102" cy="186" rx="85" ry="10" fill={ink} opacity=".18"/><g strokeLinejoin="round" strokeLinecap="round">{art}<Bolts/></g></svg>;
}

// Tiny discoveries at the roadside: unlike large landmarks these are repeated
// clusters, using the world's colors and computing metaphor.
export function WorldDiscovery({ theme: t, variant: v }: Props) {
  const color = t.scene === "peaks" ? "#C7F3FF" : t.scene === "shore" ? gold : t.scene === "caverns" ? "#C2A0F4" : mint;
  const words = { shore: ["PORT 8080", "HELLO SEA", "CAST AWAY"], woods: ["if (quest)", "TRUE TRAIL", "ELSEWHERE"], lagoon: ["i++", "LOOP ON", "BREAK HERE"], peaks: ["charAt(0)", "STAY COOL", "ICE.length"], caverns: ["INDEX 0", "[LOOT]", "NO OOB"], castle: ["new Hero()", "RETURN HOME", "BASE CASE"], citadel: ["TEST PASSED", "O(awesome)", "NEXT BUILD"] }[t.scene];
  return <svg aria-hidden="true" viewBox="0 0 120 100" width="100%" height="100%" className="pointer-events-none" data-discovery={t.scene}>
    <ellipse cx="60" cy="90" rx="55" ry="7" fill={ink} opacity=".2"/>
    {v===0 ? <><path d="M59 85 V30" stroke={ink} strokeWidth="6"/><path d="M11 27 H99 L112 42 L99 57 H11 Z" fill={t.roadEdge} stroke={ink} strokeWidth="2"/><text x="58" y="46" textAnchor="middle" fontFamily="monospace" fontWeight="bold" fontSize="10" fill={color}>{words[0]}</text></> : v===1 ? <><path d="M22 82 L31 43 H86 L98 82 Z" fill={t.far} stroke={ink} strokeWidth="3"/><path d="M39 46 L46 12 L61 31 L74 6 L85 46 Z" fill={color}/><Label text={words[1]} x={60} y={76} color={color}/></> : <><rect x="23" y="37" width="77" height="49" rx="7" fill={ink} stroke={color} strokeWidth="2"/><path d="M34 50 l9 7 l-9 7 M50 66 H65" stroke={color} fill="none" strokeWidth="3"/><text x="61" y="78" textAnchor="middle" fontSize="7" fontFamily="monospace" fill="#FFFFFF">{words[2]}</text><path d="M59 36 V20 M50 20 H68" stroke={color} strokeWidth="3"/></>}
    <g fill={color} opacity=".8"><circle cx="11" cy="83" r="3"/><circle cx="108" cy="76" r="4"/><path d="M9 68 L12 61 L15 68 L12 75 Z"/></g>
  </svg>;
}

// Ground micro-biomes fill the near field without obscuring the road. Small
// repeated motifs stay inexpensive and scale with the existing perspective.
export function WorldGroundDetails({ theme: t, width: W, height: H }: { theme: Theme; width: number; height: number }) {
  const color = t.scene === "peaks" ? "#FFFFFF" : t.scene === "shore" ? "#F3B48A" : t.scene === "caverns" ? "#BC94EF" : t.scene === "castle" ? "#D3B9D3" : mint;
  return <svg aria-hidden="true" className="pointer-events-none absolute inset-0" width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
    {Array.from({ length: W < 640 ? 28 : 48 }, (_, i) => {
      const row = Math.floor(i / 8), depth = (row + 1) / 6;
      const y = H * (.41 + depth * .57);
      const edge = .5 + (i%2 ? 1 : -1) * (.19 + ((i*19)%31)/100);
      const x = W * edge;
      const size = (3 + depth * 9) * (W < 640 ? .7 : 1);
      let art;
      switch (t.scene) {
        case "shore": art = i%3 ? <><path d="M-2 -10 L1 -3 L9 -5 L4 2 L8 8 L0 5 L-7 10 L-5 2 L-11 -2 L-3 -3 Z" fill={color}/><circle r="2" fill="#FFEBD2"/></> : <><ellipse rx="22" ry="7" fill="#72D6DB" opacity=".6"/><path d="M-12 0 Q0 -5 13 0" fill="none" stroke="#F4F6DF" strokeWidth="2"/></>; break;
        case "woods": art = i%3 ? <><path d="M0 10 Q-12 -9 -6 -10 Q7 -5 0 10 M0 10 Q15 -6 8 -10 Q-4 -2 0 10" fill="#347F50"/><circle cy="-8" r="3" fill={i%2?"#FFF3B4":"#F6B9D2"}/></> : <><path d="M-17 4 L13 -5" stroke="#7C5C43" strokeWidth="9"/><ellipse cx="-17" cy="4" rx="4" ry="6" fill="#D6B17C"/></>; break;
        case "lagoon": art = i%3 ? <><ellipse rx="17" ry="7" fill="#347D8F" opacity=".5"/><path d="M-12 0 Q0 -16 13 0 L0 5 Z" fill="#92D592"/><path d="M0 0 Q-8 -14 0 -11 Q8 -14 0 0" fill="#F8A9CD"/></> : <><path d="M-14 0 Q0 -10 12 0 Q0 10 -14 0 L-21 -7 V7 Z" fill="#FFDB92"/><circle cx="8" cy="-1" r="1.5" fill={ink}/></>; break;
        case "peaks": art = i%3 ? <path d="M-15 0 H15 M0 -12 V12 M-10 -9 L10 9 M-10 9 L10 -9" fill="none" stroke={color} strokeWidth="1.5" opacity=".6"/> : <g fill="#9AAFC9" opacity=".5"><ellipse cx="-6" cy="-3" rx="3" ry="5"/><ellipse cx="5" cy="5" rx="3" ry="5"/></g>; break;
        case "caverns": art = i%3 ? <path d="M-15 4 L-5 -2 L0 3 L9 -8 L18 -4" fill="none" stroke={color} strokeWidth="1.5" opacity=".65"/> : <><path d="M-12 8 L-6 -10 L2 0 L9 -15 L15 8 Z" fill={color}/><path d="M-5 -3 L-1 6 M9 -8 V6" stroke="#E9DAFF" strokeWidth="2"/></>; break;
        case "castle": art = i%3 ? <path d="M-17 0 L-2 -7 L15 0 L2 8 Z M-2 -7 L-3 -14" fill="none" stroke={color} strokeWidth="1.5" opacity=".6"/> : <><path d="M0 10 V-4 M0 6 L-8 0 M0 7 L9 2" stroke="#63936F" strokeWidth="3"/><circle cy="-6" r="5" fill="#E58EA9"/><circle cy="-6" r="2" fill={gold}/></>; break;
        case "citadel": art = <><path d="M-20 7 H-8 V-7 H12" stroke={color} strokeWidth="1.5" fill="none" opacity=".5"/><circle cx="14" cy="-7" r="3" fill="none" stroke={color} strokeWidth="1.5"/><path d="M-20 11 H-5 V0 H7" stroke="#B79BF0" strokeWidth="1" fill="none" opacity=".5"/></>; break;
      }
      return <g key={i} transform={`translate(${x} ${y}) scale(${size/12})`}>{art}</g>;
    })}
  </svg>;
}
