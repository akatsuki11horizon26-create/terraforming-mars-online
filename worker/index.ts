/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { isValidRoomCode, normalizeRoomCode } from "../app/net-protocol.js";

export { GameRoom } from "./room";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  ROOMS: DurableObjectNamespace;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Multiplayer rooms. Each passphrase maps to one Durable Object, which owns
    // the authoritative game state for that room.
    if (url.pathname.startsWith("/api/room/")) {
      const [, , , rawCode, ...rest] = url.pathname.split("/");
      const code = normalizeRoomCode(rawCode);
      if (!isValidRoomCode(code)) {
        return Response.json({ error: "合言葉が正しくありません。" }, { status: 400 });
      }
      const id = env.ROOMS.idFromName(code);
      const room = env.ROOMS.get(id);
      const forwarded = new URL(request.url);
      forwarded.pathname = `/${rest.join("/")}`;
      forwarded.searchParams.set("code", code);
      return room.fetch(new Request(forwarded, request));
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
