import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

// No `DB` binding is declared in wrangler.jsonc or vite.config.ts: this game
// keeps its state in Durable Objects, and the D1 scaffolding is unused. The
// binding is declared here so the check below is a real runtime guard rather
// than a type error, and stays honest if a control plane ever injects one.
declare global {
  // Cloudflare.Env is a namespace interface; augmenting it is the only way to
  // declare a binding, so the module-syntax rule cannot apply here.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cloudflare {
    interface Env {
      DB?: D1Database;
    }
  }
}

export function getDb() {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  return drizzle(env.DB, { schema });
}
