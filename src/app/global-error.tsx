"use client";

// Last-resort screen so a crash never shows as a blank page.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100dvh", display: "grid", placeItems: "center", background: "#DFF2FF", fontFamily: "system-ui, sans-serif", color: "#1F2440" }}>
        <div style={{ maxWidth: 420, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 28, margin: "0 0 8px" }}>Something went wrong</h1>
          <p style={{ fontWeight: 600, margin: "0 0 16px" }}>Your progress is saved. Reloading usually fixes this.</p>
          <button type="button" onClick={() => location.reload()} style={{ padding: "10px 18px", borderRadius: 12, border: 0, background: "#2D9CDB", color: "#fff", fontWeight: 800, fontSize: 16, cursor: "pointer" }}>
            Reload
          </button>
          <button type="button" onClick={reset} style={{ marginLeft: 8, padding: "10px 18px", borderRadius: 12, border: "2px solid #D5E4F5", background: "#fff", fontWeight: 800, fontSize: 16, cursor: "pointer" }}>
            Try again
          </button>
          <p style={{ fontSize: 12, opacity: 0.6, marginTop: 16 }}>{error?.message}</p>
        </div>
      </body>
    </html>
  );
}
