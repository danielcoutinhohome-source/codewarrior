"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Monster from "@/components/Monster";
import Warrior from "@/components/Warrior";
import { ButtonLink, Logo } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { WORLDS } from "@/lib/game";

const FEATURES = [
  { title: "Every answer is an attack", text: "Get it right and your warrior strikes. Miss and the enemy hits back. Two tries per question." },
  { title: "Seven worlds, seven bosses", text: "From variables to recursion, each world ends with a boss that only the fog can hide." },
  { title: "Earn coins, gear up", text: "Buy potions, firewalls and power surges, or new armor, energy blades and auras." },
  { title: "Built for AP CSA", text: "Real Java, checked against a real compiler, ending in actual LeetCode problems." },
];

export default function Home() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (getSession()) router.replace("/map/");
    else setReady(true);
  }, [router]);

  const lineup = [WORLDS[0].enemies[1], WORLDS[2].enemies[2], WORLDS[3].enemies[4], WORLDS[5].enemies[4]];

  return (
    <div className="min-h-dvh overflow-hidden bg-sky">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <Link href="/login/" className="font-black text-ocean-deep hover:underline">Log in</Link>
      </header>

      <main className="mx-auto flex max-w-6xl flex-wrap items-center gap-10 px-6 pb-10 pt-4">
        <motion.div className="min-w-0 flex-[1_1_420px]" initial={{ opacity: 0, x: -20 }} animate={{ opacity: ready ? 1 : 0, x: ready ? 0 : -20 }} transition={{ type: "spring", stiffness: 200, damping: 26 }}>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-ocean-deep">AP CSA, but it&apos;s a battle</p>
          <h1 className="mt-2 font-display text-[clamp(44px,7vw,76px)] leading-[0.95] text-ink">
            Battle your way to <span className="text-brand">LeetCode</span>
          </h1>
          <p className="mt-4 max-w-md text-lg font-bold text-ink-soft">
            Answer Java questions to fight bugs, beat bosses and climb seven worlds, from your first variable to real interview problems.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <ButtonLink href="/create/" size="lg">CREATE MY WARRIOR</ButtonLink>
            <ButtonLink href="/login/" tone="white" size="lg">LOG IN</ButtonLink>
          </div>
          <p className="mt-4 text-sm font-bold text-ink-mute">No email or Google account needed. Play on this device, or save online with a class account.</p>
        </motion.div>

        <motion.div className="relative flex flex-[1_1_360px] items-end justify-center gap-2" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: ready ? 1 : 0, scale: ready ? 1 : 0.92 }} transition={{ type: "spring", stiffness: 160, damping: 18, delay: 0.1 }}>
          <div aria-hidden className="absolute bottom-2 left-1/2 h-14 w-[90%] -translate-x-1/2 rounded-[50%] bg-gold" style={{ boxShadow: "0 14px 0 #E5A300" }} />
          <div className="relative z-10 -mr-6"><Warrior size={230} /></div>
          <motion.div className="relative z-10 mb-3" animate={{ x: [0, -6, 0] }} transition={{ duration: 1.6, repeat: Infinity }}>
            <Monster enemy={WORLDS[2].enemies[2]} size={170} />
          </motion.div>
        </motion.div>
      </main>

      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-10 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f, i) => (
          <motion.div key={f.title} className="card p-5" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}>
            <h2 className="font-display text-xl leading-tight">{f.title}</h2>
            <p className="mt-2 font-bold text-ink-soft">{f.text}</p>
          </motion.div>
        ))}
      </section>

      <section className="border-t-[10px] border-grass-deep bg-grass">
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-center gap-4 px-6 pt-8">
          {lineup.map((e, i) => (
            <motion.div key={e.name} initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.08, type: "spring", stiffness: 200, damping: 16 }} className="text-center">
              <Monster enemy={e} boss={i === 3} size={i === 3 ? 160 : 120} />
              <div className="-mt-1 font-display text-white drop-shadow-[0_2px_0_rgba(0,0,0,.25)]">{e.name}</div>
            </motion.div>
          ))}
        </div>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6 font-bold text-[#1E5A1E]">
          <span>Every world ends with a boss. Can you reach the LeetCode Citadel?</span>
          <Link href="/teacher/" className="font-black underline-offset-4 hover:underline">For teachers</Link>
        </div>
      </section>
    </div>
  );
}
