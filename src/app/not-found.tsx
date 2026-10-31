import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center bg-sky p-6 text-center">
      <div>
        <div className="font-display text-[96px] leading-none text-brand">404</div>
        <h1 className="mt-2 font-display text-3xl">This path leads off the map</h1>
        <p className="mt-2 font-bold text-ink-soft">The page you were looking for doesn&apos;t exist.</p>
        <Link href="/" className="mt-6 inline-block rounded-[18px] bg-brand px-6 py-3 font-display text-xl text-white" style={{ boxShadow: "0 6px 0 #165E8A" }}>
          BACK TO CAMP
        </Link>
      </div>
    </div>
  );
}
