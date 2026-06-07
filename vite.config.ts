import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

// Base path is "/" for local dev and "/<repo>/" when deploying to a GitHub
// Pages project site. Pass VITE_BASE_PATH=<repo-slug> at build time (no
// slashes needed — they're added here, which also dodges Git Bash/MSYS
// turning a leading-slash value into a Windows path).
const slug = (process.env.VITE_BASE_PATH ?? "").replace(/^\/+|\/+$/g, "");
const base = slug ? `/${slug}/` : "/";
// TanStack Router basepath must NOT carry a trailing slash ("/sel-me", not
// "/sel-me/"); root deploys use "/".
const routerBasepath = slug ? `/${slug}` : "/";

export default defineConfig({
  base,
  plugins: [
    tsConfigPaths(),
    tailwindcss(),
    tanstackStart({
      // Ship a fully client-rendered SPA — every feature runs in the browser
      // (localStorage / IndexedDB), so no server is required at runtime.
      spa: { enabled: true },
      // Keep the SSR/prerender router base aligned with the runtime client
      // router (see src/router.tsx) so the shell renders/serves correctly.
      router: { basepath: routerBasepath },
    }),
    viteReact(),
  ],
  resolve: {
    dedupe: ["react", "react-dom", "@tanstack/react-router"],
  },
});
