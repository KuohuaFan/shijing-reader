import { execFileSync } from "node:child_process";

export const editor = {
  name: "Dr.Fan",
  url: "https://github.com/KuohuaFan",
};

function git(args, fallback) {
  try {
    return execFileSync("git", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return fallback;
  }
}

export function getEditionMetadata() {
  return {
    editorName: editor.name,
    editorUrl: editor.url,
    dateModified:
      process.env.VITE_DATE_MODIFIED ||
      git(["show", "-s", "--format=%cI", "HEAD"], "2026-09-11T00:00:00+08:00"),
    commitSha:
      process.env.VITE_GIT_COMMIT_SHA || git(["rev-parse", "--short=7", "HEAD"], "local"),
    version: "1.2",
  };
}
