// CodeWarrior classroom server. Every request is checked for CORS here and handed to the one
// Classroom Durable Object, which owns the SQLite database and the live-update sockets.
import { Classroom, type Env } from "./classroom";

export { Classroom };

const DEV_ORIGINS = ["http://localhost:3000", "http://localhost:4321", "http://127.0.0.1:4321"];

function corsHeaders(origin: string | null, env: Env): Record<string, string> {
  const allowed = [...(env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean), ...DEV_ORIGINS];
  if (!origin || !allowed.includes(origin)) return {};
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "access-control-allow-headers": "authorization, content-type",
    "access-control-max-age": "600",
    vary: "Origin",
  };
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const origin = req.headers.get("origin");
    const cors = corsHeaders(origin, env);
    if (req.method === "OPTIONS") return new Response(null, { status: origin && !cors["access-control-allow-origin"] ? 403 : 204, headers: cors });
    const url = new URL(req.url);
    if (!url.pathname.startsWith("/v1/")) return new Response("CodeWarrior classroom server", { status: 404 });
    // Browsers from other sites can't use the API (bearer tokens, so this is defense in depth).
    if (origin && !cors["access-control-allow-origin"]) return new Response(JSON.stringify({ error: "forbidden", message: "This site isn't allowed to use the classroom server." }), { status: 403, headers: { "content-type": "application/json" } });
    const headers = new Headers(req.headers);
    headers.set("x-client-ip", req.headers.get("cf-connecting-ip") || "local");
    const stub = env.CLASSROOM.get(env.CLASSROOM.idFromName("main"));
    const res = await stub.fetch(new Request(req, { headers }));
    if (res.status === 101) return res;
    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(cors)) out.headers.set(k, v);
    return out;
  },
};
