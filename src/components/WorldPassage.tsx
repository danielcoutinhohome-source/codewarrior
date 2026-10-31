import type { Theme } from "@/lib/game";
import { darken } from "@/lib/color";
// Large, quiet silhouettes frame the route. Detail is concentrated at the edges,
// leaving the vanishing point and the single boss threshold as the focal point.
export function PassageFrame({ theme:t }: {theme:Theme}) {
  const cave=t.scene==="caverns"||t.scene==="peaks",woods=t.scene==="woods"||t.scene==="lagoon",tech=t.scene==="citadel";
  const shadow=darken(t.groundNear,.65),edge=darken(t.far,.35);
  return <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1000 600" preserveAspectRatio="none">
    {[-1,1].map(side=><g key={side} transform={side===1?"translate(1000 0) scale(-1 1)":undefined}>
      {woods?<><path d="M-40 620 L24 340 L16 0 H138 L105 290 L172 225 L205 90 L227 93 L205 267 L109 371 L87 620 Z" fill={shadow}/><path d="M62 336 L75 190 L149 147 L172 30 M82 221 L30 135" fill="none" stroke={edge} strokeWidth="13"/><path d="M0 0 H350 Q310 85 241 56 Q171 134 104 75 Q40 134 0 108 Z" fill={shadow}/><path d="M0 535 Q87 468 176 502 L138 529 L75 525 L20 600" fill={shadow}/></>:
      cave?<><path d="M0 0 H259 L219 85 L182 65 L158 178 L115 126 L89 314 L128 468 L77 600 H0 Z" fill={shadow}/><path d="M0 0 L86 81 L50 181 L89 314 L28 409 L77 600 H0" fill={edge} opacity=".6"/><path d="M84 0 L116 121 L149 0 M174 0 L185 70 L213 0" fill={edge}/><path d="M8 555 L37 443 L64 541 L95 500 L118 600 H0 Z" fill={edge}/>{t.scene==="caverns"&&<path d="M37 469 L47 506 L40 543 M103 151 L96 181" stroke="#AC86CF" strokeWidth="2" fill="none" opacity=".7"/>}</>:
      tech?<><path d="M0 600 V0 H100 V355 L153 392 V600 Z" fill={shadow}/><path d="M118 202 H184 V600 H153 V392 L118 363 Z" fill={edge}/>{[40,100,160,220,280].map(y=><path key={y} d={`M35 ${y} H71`} stroke="#69DFC6" strokeWidth="3" opacity=".5"/>)}<path d="M24 0 Q115 179 249 184 M81 0 Q165 100 353 211" stroke={edge} strokeWidth="7" fill="none"/><path d="M0 560 H106 V487 H141" stroke="#746AB4" strokeWidth="2" fill="none"/></>:
      <><path d="M0 600 V100 L89 140 L105 282 L172 318 L132 600 Z" fill={shadow}/><path d="M0 156 L70 185 L66 346 L119 389 L87 600 H0 Z" fill={edge}/>{t.scene==="castle"&&<path d="M0 80 H34 V49 H70 V80 H102 V145 H0 Z" fill={shadow}/>}</>}
    </g>)}
    <path d="M0 600 H1000" stroke={shadow} strokeWidth="16"/>
  </svg>;
}
export function BossDoor({ theme:t, ready }: {theme:Theme;ready:boolean}) {
  const runes=t.scene==="woods"?["if","else"]:t.scene==="caverns"?["[0]","[n]"]:t.scene==="citadel"?["PASS","FAIL"]:["{","}"];
  return <svg aria-hidden="true" viewBox="0 0 240 280" width="100%" height="100%" data-boss-door={t.scene}>
    <path d="M17 275 V71 L57 14 H183 L223 71 V275 Z" fill="#141B2B" stroke={darken(t.far,.1)} strokeWidth="12"/>
    <path d="M39 266 V77 L69 36 H171 L201 77 V266 Z" fill="#080E19" stroke={ready?"#84EFD6":"#647089"} strokeWidth="3"/>
    <path d="M120 38 V263 M46 92 H194 M46 227 H194" stroke="#3B485F" strokeWidth="3"/>
    <path d="M120 102 L159 143 L120 184 L81 143 Z" fill="#19283B" stroke={ready?"#84EFD6":"#B3767C"} strokeWidth="3"/>
    <text x="120" y="153" fill={ready?"#A5FFE8":"#C48B93"} textAnchor="middle" fontFamily="monospace" fontSize="25">{ready?"</>":"?"}</text>
    {[74,166].map((x,i)=><text key={x} x={x} y="211" fill="#768AAB" fontFamily="monospace" fontSize="14" textAnchor="middle">{runes[i]}</text>)}
    {t.scene==="woods"&&<path d="M13 272 L28 122 L10 75 M27 137 L46 101 M227 272 L211 120 L230 72 M212 138 L194 104" fill="none" stroke="#365E48" strokeWidth="11" strokeLinecap="round"/>}
    {t.scene==="caverns"&&<path d="M8 278 L17 223 L32 253 L45 220 L48 278 M190 278 L197 222 L211 243 L228 213 L234 278" fill="#705892" stroke="#A68CC4" strokeWidth="2"/>}
    {t.scene==="citadel"&&<g stroke="#75BFAF" strokeWidth="3">{[85,110,135,160,185,210].map(y=><path key={y} d={`M21 ${y} H29 M211 ${y} H219`}/>)}</g>}
    <path d="M15 276 H225" stroke="#1E293E" strokeWidth="12"/>
  </svg>;
}
export function BossRoom({theme:t}:{theme:Theme}) {
  const accent=t.scene==="caverns"?"#B68BE8":t.scene==="woods"?"#91B687":t.scene==="citadel"?"#75E7D1":"#B5BDE0";
  return <div aria-hidden="true" className="pointer-events-none absolute inset-0" data-boss-room={t.scene} style={{background:`radial-gradient(ellipse at 50% 75%, ${darken(t.groundNear,.3)}, #080D19 85%)`}}>
    <svg viewBox="0 0 1000 450" preserveAspectRatio="none" width="100%" height="100%">
      <path d="M0 320 Q500 265 1000 320 V450 H0 Z" fill="#141D2C"/><ellipse cx="500" cy="357" rx="355" ry="63" fill="none" stroke={accent} strokeOpacity=".2" strokeWidth="3"/>
      {[0,1].map(side=><g key={side} transform={side?"translate(1000 0) scale(-1 1)":undefined}>
        {t.scene==="woods"?<><path d="M10 450 L60 95 L24 0 H190 L120 128 L166 450 Z" fill="#182822"/><path d="M90 121 Q183 30 330 24" fill="none" stroke="#1E352B" strokeWidth="32"/></>:t.scene==="caverns"||t.scene==="peaks"?<path d="M0 0 H250 L215 112 L158 53 L128 204 L83 161 L108 450 H0 Z" fill="#242338"/>:<><path d="M20 450 V45 H135 V450" fill="#1A2438"/><path d="M47 75 H110 M47 110 H110 M47 145 H110" stroke={accent} strokeWidth="3" strokeOpacity=".35"/></>}
        <path d="M168 324 V243" stroke="#293547" strokeWidth="12"/><path d="M168 253 Q145 228 168 201 Q190 228 168 253 Z" fill={accent} opacity=".65"/>
      </g>)}
      <path d="M430 260 V115 Q500 42 570 115 V260" fill="none" stroke={accent} strokeOpacity=".15" strokeWidth="7"/>
    </svg>
  </div>;
}
