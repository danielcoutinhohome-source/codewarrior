"use client";

import type { RefObject } from "react";

const KW = new Set(
  "public private static void int double boolean String char return if else for while new class this true false null import final break continue".split(" "),
);
const TYPES = new Set("ArrayList Arrays Set HashSet List Math System Integer Counter BankAccount".split(" "));

// Minimal Java syntax coloring.
function tokens(src: string) {
  const out: { t: string; c?: string }[] = [];
  const re = /(\/\/.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)/gm;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    if (m.index > last) out.push({ t: src.slice(last, m.index) });
    if (m[1]) out.push({ t: m[1], c: "#7D87A6" });
    else if (m[2]) out.push({ t: m[2], c: "#F2C46B" });
    else if (m[3]) out.push({ t: m[3], c: "#7FE0B4" });
    else out.push({ t: m[4], c: KW.has(m[4]) ? "#C3A6FF" : TYPES.has(m[4]) ? "#7FC8FF" : undefined });
    last = re.lastIndex;
  }
  if (last < src.length) out.push({ t: src.slice(last) });
  return out;
}

function Colored({ src }: { src: string }) {
  return (
    <>
      {tokens(src).map((k, i) => (
        <span key={i} style={k.c ? { color: k.c } : undefined}>
          {k.t}
        </span>
      ))}
    </>
  );
}

type Blank = { value: string; onChange: (v: string) => void; disabled?: boolean; inputRef?: RefObject<HTMLInputElement | null>; solved?: string };

export default function Code({ code, blank }: { code: string; blank?: Blank }) {
  const parts = blank ? code.split("___") : [code];
  return (
    <pre className="overflow-x-auto rounded-[18px] bg-[#1E2248] px-5 py-4 font-mono text-[15px] leading-[1.75] text-[#E8ECFF]" style={{ boxShadow: "inset 0 -6px 0 #151838" }}>
      {parts.map((p, i) => (
        <span key={i}>
          <Colored src={p} />
          {blank && i < parts.length - 1 && (
            <input
              ref={i === 0 ? blank.inputRef : undefined}
              aria-label="Fill in the blank"
              value={blank.solved ?? blank.value}
              onChange={(e) => blank.onChange(e.target.value)}
              disabled={blank.disabled}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              size={Math.max(4, (blank.solved ?? blank.value).length + 1)}
              className="mx-0.5 rounded-lg border-2 border-gold bg-[#2B3060] px-1.5 text-center font-mono text-gold outline-none focus:border-white disabled:opacity-90"
            />
          )}
        </span>
      ))}
    </pre>
  );
}
