"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Warrior from "@/components/Warrior";
import { ButtonLink, Logo, Sky } from "@/components/ui";
import { getSession } from "@/lib/auth";

export default function Home() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (getSession()) router.replace("/map/");
    else setReady(true);
  }, [router]);

  return (
    <Sky>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
      </header>
      <main className="mx-auto flex max-w-6xl flex-wrap items-center gap-10 px-6 pb-48 pt-6">
        <motion.div
          className="min-w-0 flex-[1_1_420px]"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: ready ? 1 : 0, x: ready ? 0 : -20 }}
          transition={{ type: "spring", stiffness: 200, damping: 26 }}
        >
          <p className="text-sm font-black uppercase tracking-[0.18em] text-ocean-deep">AP CSA, but it's a battle</p>
          <h1 className="mt-2 font-display text-[clamp(44px,7vw,76px)] leading-[0.95] text-ink">
            Battle your way to <span className="text-ember">LeetCode</span>
          </h1>
          <p className="mt-4 max-w-md text-lg font-bold text-ink-soft">
            Every question is an attack. Win battles, beat bosses, and climb seven worlds from your first line of Java to real interview problems.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <ButtonLink href="/create/" size="lg">CREATE MY WARRIOR</ButtonLink>
            <ButtonLink href="/login/" tone="white" size="lg">LOG IN</ButtonLink>
          </div>
          <p className="mt-4 text-sm font-bold text-ink-mute">No email or Google account needed. Progress saves on this device.</p>
        </motion.div>
        <motion.div
          className="flex flex-[1_1_320px] justify-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: ready ? 1 : 0, scale: ready ? 1 : 0.9 }}
          transition={{ type: "spring", stiffness: 160, damping: 18, delay: 0.1 }}
        >
          <Warrior size={280} />
        </motion.div>
      </main>
    </Sky>
  );
}
