import fs from "fs";
import path from "path";
import os from "os";
import {
  uriToPath,
  normalizePath,
  parseReferencesJson,
  ReferencesData,
} from "./utils.js";

const EXTENSION_STORAGE_DIR = "LiRenTech.file-ref-tags";
const WORKSPACE_CONFIG_RELATIVE_PATH = path.join(".vscode", "file-ref-tags.json");

export type SupportedIde = "vscode" | "cursor";
export type IdeOption = SupportedIde | "auto";

function vscodeUserDir(): string {
  switch (process.platform) {
    case "win32":
      return path.join(process.env.APPDATA ?? os.homedir(), "Code", "User");
    case "darwin":
      return path.join(
        os.homedir(),
        "Library",
        "Application Support",
        "Code",
        "User"
      );
    default:
      return path.join(os.homedir(), ".config", "Code", "User");
  }
}

function cursorUserDir(): string {
  switch (process.platform) {
    case "win32":
      return path.join(process.env.APPDATA ?? os.homedir(), "Cursor", "User");
    case "darwin":
      return path.join(
        os.homedir(),
        "Library",
        "Application Support",
        "Cursor",
        "User"
      );
    default:
      return path.join(os.homedir(), ".config", "Cursor", "User");
  }
}

function parseIdeOption(raw: unknown): IdeOption {
  if (typeof raw !== "string" || raw.trim() === "") {
    return "auto";
  }

  const value = raw.trim().toLowerCase();
  if (value === "auto") {
    return "auto";
  }
  if (value === "vscode" || value === "code") {
    return "vscode";
  }
  if (value === "cursor") {
    return "cursor";
  }

  throw new Error(`不支持的 ide 参数: "${String(raw)}"。可选值: auto | vscode | cursor`);
}

function getIdeSearchOrder(ide: IdeOption): SupportedIde[] {
  if (ide === "vscode") {
    return ["vscode"];
  }
  if (ide === "cursor") {
    return ["cursor"];
  }
  return ["vscode", "cursor"];
}

function userDirForIde(ide: SupportedIde): string {
  return ide === "cursor" ? cursorUserDir() : vscodeUserDir();
}

function getWorkspaceUris(meta: Record<string, unknown>): string[] {
  const uris: string[] = [];

  if (typeof meta.folder === "string" && meta.folder) {
    uris.push(meta.folder);
  }

  if (typeof meta.workspace === "string" && meta.workspace) {
    uris.push(meta.workspace);
  }

  if (
    meta.workspace &&
    typeof meta.workspace === "object" &&
    "configPath" in meta.workspace
  ) {
    const configPath = (meta.workspace as Record<string, unknown>).configPath;
    if (typeof configPath === "string" && configPath) {
      uris.push(configPath);
    }
  }

  return uris;
}

function readIdeOptionFromWorkspaceConfig(workspacePath: string): IdeOption | undefined {
  const configPath = path.join(workspacePath, WORKSPACE_CONFIG_RELATIVE_PATH);
  if (!fs.existsSync(configPath)) {
    return undefined;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch {
    throw new Error(
      `无法解析配置文件 "${configPath}"。请确保它是合法 JSON，例如：{"ide":"cursor"}`
    );
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error(`配置文件 "${configPath}" 格式错误，应为 JSON 对象。`);
  }

  const ide = (parsed as Record<string, unknown>).ide;
  if (typeof ide === "undefined" || ide === null || ide === "") {
    throw new Error(
      `配置文件 "${configPath}" 缺少 "ide" 字段。可选值: auto | vscode | cursor`
    );
  }

  return parseIdeOption(ide);
}

function resolveIdeOption(workspacePath: string, ideArg?: unknown): IdeOption {
  if (typeof ideArg !== "undefined" && ideArg !== null && ideArg !== "") {
    return parseIdeOption(ideArg);
  }

  const configIde = readIdeOptionFromWorkspaceConfig(workspacePath);
  if (configIde) {
    return configIde;
  }

  const configPath = path.join(workspacePath, WORKSPACE_CONFIG_RELATIVE_PATH);
  throw new Error(
    `未提供 ide 参数，且未找到配置文件 "${configPath}"。\n` +
      `请新增该文件并配置：\n` +
      `{\n` +
      `  "ide": "cursor"\n` +
      `}\n` +
      `可选值: auto | vscode | cursor`
  );
}

function findReferencesJson(
  workspacePath: string,
  ideOption: IdeOption
): { refsPath: string | null; searchedWorkspaceStorageDirs: string[] } {
  const normalizedTarget = normalizePath(workspacePath);
  const searchedWorkspaceStorageDirs: string[] = [];

  for (const ide of getIdeSearchOrder(ideOption)) {
    const workspaceStorageDir = path.join(userDirForIde(ide), "workspaceStorage");
    searchedWorkspaceStorageDirs.push(workspaceStorageDir);

    if (!fs.existsSync(workspaceStorageDir)) {
      continue;
    }

    for (const hash of fs.readdirSync(workspaceStorageDir)) {
      const workspaceJson = path.join(workspaceStorageDir, hash, "workspace.json");
      if (!fs.existsSync(workspaceJson)) {
        continue;
      }

      try {
        const meta = JSON.parse(
          fs.readFileSync(workspaceJson, "utf8")
        ) as Record<string, unknown>;
        const workspaceUris = getWorkspaceUris(meta);
        const isMatched = workspaceUris.some(
          (uri) => normalizePath(uriToPath(uri)) === normalizedTarget
        );

        if (!isMatched) {
          continue;
        }

        const refsPath = path.join(
          workspaceStorageDir,
          hash,
          EXTENSION_STORAGE_DIR,
          "references.json"
        );
        if (fs.existsSync(refsPath)) {
          return { refsPath, searchedWorkspaceStorageDirs };
        }
      } catch {
        // Ignore malformed workspace metadata entries.
      }
    }
  }

  return { refsPath: null, searchedWorkspaceStorageDirs };
}

export function loadData(workspacePath: string, ide?: unknown): ReferencesData {
  const ideOption = resolveIdeOption(workspacePath, ide);
  const { refsPath, searchedWorkspaceStorageDirs } = findReferencesJson(
    workspacePath,
    ideOption
  );

  if (!refsPath) {
    throw new Error(
      `在 ${
        ideOption === "auto" ? "VSCode/Cursor" : ideOption
      } workspaceStorage 中未找到工作区 "${workspacePath}" 对应的 references.json。\n` +
        `已搜索目录：\n` +
        searchedWorkspaceStorageDirs.map((dir) => `  - ${dir}`).join("\n") +
        `\n请确认：\n` +
        `  1. 该路径曾在对应 IDE 中以工作区形式打开过\n` +
        `  2. file-ref-tags 扩展已安装并至少启动过一次\n` +
        `  3. 如需临时覆盖，可在 MCP 调用中传 ide: "cursor" 或 ide: "vscode"`
    );
  }

  return parseReferencesJson(fs.readFileSync(refsPath, "utf8"));
}
