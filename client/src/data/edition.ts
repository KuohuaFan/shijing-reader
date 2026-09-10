export const edition = {
  editorName: "Dr.Fan",
  editorUrl: "https://github.com/KuohuaFan",
  dateModified: import.meta.env.VITE_DATE_MODIFIED || "2026-09-11T00:00:00+08:00",
  commitSha: import.meta.env.VITE_GIT_COMMIT_SHA || "local",
  version: "1.2",
} as const;

export const editionDate = edition.dateModified.slice(0, 10);
