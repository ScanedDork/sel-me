# Self-hosted storage server

The app's **Remote server** storage mode talks to a tiny REST contract you can
host anywhere — your homelab, a VPS, a Cloudflare Worker, Deno Deploy, etc.

## Contract

| Method | Path     | Body                | Response                |
| ------ | -------- | ------------------- | ----------------------- |
| GET    | `/<key>` | —                   | `200` raw JSON, or `404`|
| PUT    | `/<key>` | raw JSON string     | `204`                   |
| DELETE | `/<key>` | —                   | `204`                   |

`<key>` is URL-encoded. The app currently uses a single key (`jobs-app-v1`),
but treat it as opaque.

Optional auth: if the user sets a token in Settings, the app sends
`Authorization: Bearer <token>` on every request — reject anything else.

CORS: respond with `Access-Control-Allow-Origin: *` (or your app's origin),
and allow `Authorization, Content-Type` headers + `GET, PUT, DELETE, OPTIONS`.

## Reference implementation (Bun)

```ts
// server.ts — run with: bun server.ts
const TOKEN = process.env.TOKEN; // optional
const DATA = new Map<string, string>();

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, PUT, DELETE, OPTIONS",
  "access-control-allow-headers": "authorization, content-type",
};

Bun.serve({
  port: 8787,
  async fetch(req) {
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (TOKEN && req.headers.get("authorization") !== `Bearer ${TOKEN}`) {
      return new Response("unauthorized", { status: 401, headers: cors });
    }
    const key = decodeURIComponent(new URL(req.url).pathname.slice(1));
    if (!key) return new Response("missing key", { status: 400, headers: cors });

    if (req.method === "GET") {
      const v = DATA.get(key);
      return v == null
        ? new Response("not found", { status: 404, headers: cors })
        : new Response(v, { headers: { ...cors, "content-type": "application/json" } });
    }
    if (req.method === "PUT") {
      DATA.set(key, await req.text());
      return new Response(null, { status: 204, headers: cors });
    }
    if (req.method === "DELETE") {
      DATA.delete(key);
      return new Response(null, { status: 204, headers: cors });
    }
    return new Response("method not allowed", { status: 405, headers: cors });
  },
});
```

Swap the in-memory `Map` for SQLite/Postgres/a flat file as you like.
