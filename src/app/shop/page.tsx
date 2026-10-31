"use client";

import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import ItemArt from "@/components/ItemArt";
import TopBar from "@/components/TopBar";
import Warrior from "@/components/Warrior";
import { CoinIcon } from "@/components/icons";
import { Button, Pedestal, Screen } from "@/components/ui";
import { withEquipment } from "@/lib/equipment";
import { SHOP, type ItemKind, type ShopItem } from "@/lib/game";
import { buy, equip, isEquipped, ownsItem } from "@/lib/progress";
import { play } from "@/lib/sfx";
import { useWarrior } from "@/lib/useWarrior";

const TABS: { kind: ItemKind; label: string; blurb: string }[] = [
  { kind: "power", label: "Power-ups", blurb: "Use these during battles. They stack up in your bag." },
  { kind: "body", label: "Body", blurb: "Pick your warrior's frame. All bodies are free." },
  { kind: "energy", label: "Energy", blurb: "Your color. It paints your armor accents, headwear, weapon, thrusters and eyes." },
  { kind: "weapon", label: "Weapons", blurb: "One of each: sword, scythe, warhammer and glaive. Every weapon glows in your energy color." },
  { kind: "headwear", label: "Headwear", blurb: "Hats, ears, beards and wild hair. Every accessory matches your equipped energy color." },
  { kind: "finish", label: "Finish", blurb: "Special surface effects on top of your armor color." },
  { kind: "aura", label: "Auras", blurb: "An animated effect around your warrior in battles and on the map." },
  { kind: "title", label: "Titles", blurb: "Shown under your name. Some can only be earned by beating bosses." },
];

export default function ShopPage() {
  const { account, progress, warm, refresh } = useWarrior();
  const [tab, setTab] = useState<ItemKind>("power");
  const [preview, setPreview] = useState<ShopItem | null>(null);
  const [msg, setMsg] = useState<{ text: string; good: boolean; id: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const items = useMemo(() => SHOP.filter((s) => s.kind === tab), [tab]);
  if (!account || !progress) return <div className="min-h-dvh bg-sky" />;

  const look = preview ? withEquipment(account.avatar, preview) : account.avatar;

  const say = (text: string, good: boolean) => {
    const m = { text, good, id: Date.now() };
    setMsg(m);
    setTimeout(() => setMsg((x) => (x?.id === m.id ? null : x)), 2600);
  };

  const onBuy = async (it: ShopItem) => {
    if (busy) return;
    setBusy(true);
    const r = await buy(account.id, it.id);
    if (r.ok) {
      play("buy");
      if (it.kind !== "power") {
        await equip(account.id, it.id);
        say(`${it.name} is yours and equipped!`, true);
      } else say(`+1 ${it.name}. You have ${(progress.inventory[it.id] || 0) + 1}.`, true);
      await refresh();
    } else {
      play("wrong");
      say(r.reason || "Couldn't buy that.", false);
    }
    setBusy(false);
  };

  const onEquip = async (it: ShopItem) => {
    await equip(account.id, it.id);
    play("click");
    await refresh();
  };

  return (
    <Screen fade={!warm}>
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 pb-12 pt-4 sm:px-5">
        <TopBar account={account} progress={progress} />

        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <div className="text-[13px] font-black uppercase tracking-[0.15em] text-ocean-deep">Spend your coins</div>
            <h1 className="font-display text-[clamp(34px,5vw,48px)] leading-none">Item Shop</h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 font-display text-2xl text-[#8A6400] shadow-card-sm">
            <CoinIcon size={26} /> {progress.coins}
          </div>
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
          <section className="card flex flex-col gap-3 p-5 lg:sticky lg:top-4">
            <Pedestal>
              {/* One warrior that stays mounted: trying items on swaps its gear in place with a soft
                  bounce. (Re-mounting it on every hover made the preview blink.) */}
              <PreviewBounce look={JSON.stringify(look)}>
                  <Warrior weapon={look.weapon} headwear={look.headwear} body={look.body} armor={look.armor} energy={look.energy} finish={look.finish} aura={look.aura} size={170} />
              </PreviewBounce>
            </Pedestal>
            <div className="text-center">
              <div className="font-display text-2xl">{account.username}</div>
              <div className="font-extrabold text-ink-mute">{preview?.kind === "title" ? preview.value : account.avatar.title}</div>
              <p className="mt-1 text-sm font-bold text-ink-mute">{preview ? `Previewing ${preview.name}` : "Hover or tap an item to try it on."}</p>
            </div>
          </section>

          <section className="flex min-w-0 flex-col gap-4">
            <div className="flex gap-1.5 overflow-x-auto rounded-2xl bg-white p-1.5 shadow-card-sm" role="tablist">
              {TABS.map((t) => (
                <button key={t.kind} role="tab" aria-selected={tab === t.kind} onClick={() => { setTab(t.kind); setPreview(null); }} className="relative flex-none rounded-xl px-4 py-2 text-sm font-black" style={{ color: tab === t.kind ? "#FFFFFF" : "#4A5175" }}>
                  {tab === t.kind && <motion.span layoutId="shop-tab" className="absolute inset-0 rounded-xl bg-ember" transition={{ type: "spring", stiffness: 500, damping: 36 }} />}
                  <span className="relative">{t.label}</span>
                </button>
              ))}
            </div>
            <p className="font-bold text-ink-soft">{TABS.find((t) => t.kind === tab)!.blurb}</p>

            <AnimatePresence>
              {msg && (
                <motion.div key={msg.id} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="status" className="rounded-2xl px-4 py-3 font-black" style={{ background: msg.good ? "#E3F9EA" : "#FFE8EA", color: msg.good ? "#2BA155" : "#D9434A" }}>
                  {msg.text}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div key={tab} className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3" initial="hide" animate="show" variants={{ show: { transition: { staggerChildren: 0.06 } } }}>
              {items.map((it) => {
                const owned = it.kind !== "power" && ownsItem(progress, it.id);
                const on = it.kind !== "power" && isEquipped(account, it.id);
                const earnOnly = it.price < 0;
                const short = it.price > progress.coins;
                return (
                  <motion.div
                    key={it.id}
                    variants={{ hide: { opacity: 0.25, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } } }}
                    onMouseEnter={() => setPreview(it)}
                    onFocus={() => setPreview(it)}
                    onMouseLeave={() => setPreview(null)}
                    whileHover={{ scale: 1.02 }}
                    className="flex flex-col items-center gap-2 rounded-[22px] border-[3px] bg-white p-4 text-center"
                    style={{ borderColor: on ? "#3EC46D" : "#D5E4F5", boxShadow: `0 6px 0 ${on ? "#2BA155" : "#C5D7EC"}` }}
                  >
                    <button type="button" onClick={() => setPreview(it)} aria-label={`Preview ${it.name}`} className="grid h-[84px] w-full place-items-center rounded-2xl bg-sky focus-visible:outline focus-visible:outline-2 focus-visible:outline-ocean">
                      <ItemArt it={it} avatar={account.avatar} />
                    </button>
                    <div className="font-display text-lg leading-tight">{it.name}</div>
                    <p className="min-h-[2.5em] text-[13px] font-bold leading-snug text-ink-mute">{it.blurb}</p>
                    {it.kind === "power" && <div className="text-xs font-black text-ocean-deep">In your bag: {progress.inventory[it.id] || 0}</div>}
                    {on ? (
                      <span className="rounded-xl bg-[#E3F9EA] px-3 py-1.5 text-sm font-black text-[#2BA155]">EQUIPPED</span>
                    ) : owned ? (
                      <Button size="sm" tone="grass" onClick={() => onEquip(it)}>EQUIP</Button>
                    ) : earnOnly ? (
                      <span className="rounded-xl bg-sky px-3 py-1.5 text-xs font-black text-ink-mute">Beat {it.earnedBy}</span>
                    ) : (
                      <Button size="sm" tone={short ? "white" : "ember"} onClick={() => onBuy(it)} aria-label={`Buy ${it.name} for ${it.price} coins`}>
                        <span className="inline-flex items-center gap-1.5"><CoinIcon size={16} /> {it.price}</span>
                      </Button>
                    )}
                  </motion.div>
                );
              })}
            </motion.div>
          </section>
        </div>
      </div>
    </Screen>
  );
}

function PreviewBounce({ look, children }: { look: string; children: React.ReactNode }) {
  const controls = useAnimationControls();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    controls.start({ scale: [0.97, 1.03, 1], transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } });
  }, [look, controls]);
  return <motion.div animate={controls}>{children}</motion.div>;
}
