// Runs the tutor server with Node (for local development or any Node host).
//   ANTHROPIC_API_KEY=... npx tsx tutor-server/src/node.ts
// Test-only mock mode: TUTOR_PROVIDER=mock ALLOW_MOCK=1 npx tsx tutor-server/src/node.ts
import { createServer } from "node:http";
import { handle, type Env } from "./handler";

const port = Number(process.env.PORT || 8787);
createServer(async (req, res) => {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const body = chunks.length ? Buffer.concat(chunks).toString() : undefined;
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") headers.set(k, v);
  const request = new Request(`http://localhost:${port}${req.url}`, { method: req.method, headers, body: req.method === "GET" || req.method === "HEAD" ? undefined : body });
  const response = await handle(request, process.env as Env, req.socket.remoteAddress || "local");
  res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
  res.end(await response.text());
}).listen(port, () => console.log(`CodeWarrior tutor server on http://localhost:${port} (provider: ${process.env.TUTOR_PROVIDER || "anthropic"})`));
