import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { defineConfig } from "vite";

function git(args: string[], fallback: string) {
  try {
    return execFileSync("git", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return fallback;
  }
}

const dateModified =
  process.env.VITE_DATE_MODIFIED ||
  git(["show", "-s", "--format=%cI", "HEAD"], "2026-09-11T00:00:00+08:00");
const commitSha =
  process.env.VITE_GIT_COMMIT_SHA || git(["rev-parse", "--short=7", "HEAD"], "local");

const editionHtmlPlugin = {
  name: "edition-html-metadata",
  transformIndexHtml(html: string) {
    return html
      .replaceAll("__DATE_MODIFIED__", dateModified)
      .replaceAll("__GIT_SHA__", commitSha);
  },
};

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? "/shijing-reader/" : "/",
  plugins: [editionHtmlPlugin, react(), tailwindcss()],
  define: {
    "import.meta.env.VITE_DATE_MODIFIED": JSON.stringify(dateModified),
    "import.meta.env.VITE_GIT_COMMIT_SHA": JSON.stringify(commitSha),
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    host: true,
  },
});
