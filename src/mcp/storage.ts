import fs from "fs";
import path from "path";
import os from "os";
import { uriToPath, normalizePath, parseReferencesJson, ReferencesData } from "./utils.js";

function vscodeUserDir(): string {
  switch (process.platform) {
    case "win32":
      return path.join(process.env.APPDATA ?? os.homedir(), "Code", "User");
    case "darwin":
      return path.join(os.homedir(), "Library", "Application Support", "Code", "User");
    default:
      return path.join(os.homedir(), ".config", "Code", "User");
  }
}

function findReferencesJson(workspacePath: string): string | null {
  const workspaceStorageDir = path.join(vscodeUserDir(), "workspaceStorage");
  if (!fs.existsSync(workspaceStorageDir)) {
    return null;
  }

  const normalizedTarget = normalizePath(workspacePath);

  for (const hash of fs.readdirSync(workspaceStorageDir)) {
    const workspaceJson = path.join(workspaceStorageDir, hash, "workspace.json");
    if (!fs.existsSync(workspaceJson)) { continue; }
    try {
      const meta = JSON.parse(fs.readFileSync(workspaceJson, "utf8")) as Record<string, unknown>;
      const folderUri = (meta.folder ?? meta.workspace ?? "") as string;
      if (normalizePath(uriToPath(folderUri)) === normalizedTarget) {
        const refsPath = path.join(workspaceStorageDir, hash, "LiRenTech.file-ref-tags", "references.json");
        if (fs.existsSync(refsPath)) { return refsPath; }
      }
    } catch {
      // 跳过无法解析的条目
    }
  }
  return null;
}

export function loadData(workspacePath: string): ReferencesData {
  const refsPath = findReferencesJson(workspacePath);
  if (!refsPath) {
    throw new Error(
      `在 VSCode workspaceStorage 中未找到工作区 "${workspacePath}" 对应的 references.json。\n` +
      `请确认：\n` +
      `  1. 该路径曾在 VSCode 中以工作区形式打开过\n` +
      `  2. file-ref-tags 扩展已安装并至少启动过一次`
    );
  }
  return parseReferencesJson(fs.readFileSync(refsPath, "utf8"));
}
