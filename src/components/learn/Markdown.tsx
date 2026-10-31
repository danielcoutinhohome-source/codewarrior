"use client";

import { Fragment, type ReactNode } from "react";
import Code from "../Code";

// A small, safe renderer for tutor replies and lesson text: paragraphs, bullet and numbered
// lists, headings, fenced code, `inline code` and **bold**. No HTML is ever injected.

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(<Fragment key={`${keyBase}t${i++}`}>{text.slice(last, m.index)}</Fragment>);
    if (m[1]) out.push(<code key={`${keyBase}c${i++}`} className="rounded-md bg-[#EAF3FF] px-1.5 py-0.5 font-mono text-[0.92em] text-[#1F3E7A]">{m[1].slice(1, -1)}</code>);
    else out.push(<strong key={`${keyBase}b${i++}`} className="font-black">{m[2].slice(2, -2)}</strong>);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(<Fragment key={`${keyBase}t${i++}`}>{text.slice(last)}</Fragment>);
  return out;
}

export function Inline({ text }: { text: string }) {
  return <>{inline(text, "i")}</>;
}

export function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  if (lang === "java") return <Code code={code} />;
  return (
    <pre className="overflow-x-auto rounded-[18px] bg-[#1E2248] px-5 py-4 font-mono text-[14px] leading-[1.7] text-[#E8ECFF]" style={{ boxShadow: "inset 0 -6px 0 #151838" }}>
      {code}
    </pre>
  );
}

export default function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  let i = 0;
  let k = 0;
  while (i < lines.length) {
    const line = lines[i];
    const fence = line.match(/^\s*```\s*([\w+-]*)\s*$/);
    if (fence) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) body.push(lines[i++]);
      i++;
      const lang = (fence[1] || "").toLowerCase();
      blocks.push(<CodeBlock key={k++} code={body.join("\n")} lang={lang === "java" ? "java" : undefined} />);
      continue;
    }
    if (/^\s*$/.test(line)) {
      i++;
      continue;
    }
    const h = line.match(/^#{1,4}\s+(.*)$/);
    if (h) {
      blocks.push(<p key={k++} className="font-display text-lg leading-tight">{inline(h[1], `h${k}`)}</p>);
      i++;
      continue;
    }
    if (/^\s*([-*•])\s+/.test(line) || /^\s*\d+[.)]\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line);
      const items: string[] = [];
      while (i < lines.length && (ordered ? /^\s*\d+[.)]\s+/.test(lines[i]) : /^\s*([-*•])\s+/.test(lines[i]))) {
        items.push(lines[i].replace(ordered ? /^\s*\d+[.)]\s+/ : /^\s*([-*•])\s+/, ""));
        i++;
      }
      const ListTag = ordered ? "ol" : "ul";
      blocks.push(
        <ListTag key={k++} className={`flex flex-col gap-1 pl-6 ${ordered ? "list-decimal" : "list-disc"}`}>
          {items.map((it, j) => <li key={j}>{inline(it, `l${k}-${j}`)}</li>)}
        </ListTag>,
      );
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^\s*```/.test(lines[i]) && !/^\s*([-*•]|\d+[.)])\s+/.test(lines[i]) && !/^#{1,4}\s/.test(lines[i])) para.push(lines[i++]);
    blocks.push(<p key={k++}>{inline(para.join("\n"), `p${k}`)}</p>);
  }
  return <div className="flex flex-col gap-3 whitespace-pre-wrap break-words leading-relaxed">{blocks}</div>;
}
