// Cloudflare Worker entry point. Deploy with `npx wrangler deploy` from tutor-server/.
import { handle, type Env } from "./handler";

export default {
  fetch(req: Request, env: Env) {
    return handle(req, env, req.headers.get("cf-connecting-ip") || "unknown");
  },
};
