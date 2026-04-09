import fs from "fs";
import path from "path";
import { ReferenceItem, ReferenceGroup } from "../types/referenct.js";

export interface ReferencesData {
  references: ReferenceItem[];
  groups: ReferenceGroup[];
}

export interface LineRange {
  startLine: number;
  endLine: number;
}

export interface FormattedSnippet {
  title: string;
  type: string;
  filePath: string;
  lineRange: string;
  snippet: string;
}

// ── 路径工具 ──────────────────────────────────────────────────────────────────

/** 将 VSCode workspace.json 中的 file:// URI 转为本地路径 */
export function uriToPath(uri: string): string {
  if (uri.startsWith("file:///")) {
    const p = decodeURIComponent(uri.slice("file:///".length));
    // Windows: file:///C:/foo → C:/foo；Unix: file:///home/foo → /home/foo
    return process.platform === "win32" ? p : "/" + p;
  }
  return uri;
}

/** 规范化路径用于比较（去除尾部分隔符；Windows 下转小写） */
export function normalizePath(p: string): string {
  const normalized = path.normalize(p).replace(/[/\\]+$/, "");
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

// ── 数据解析 ─────────────────────────────────────────────────────────────────

/** 将 references.json 的原始内容解析为结构化数据，兼容旧的纯数组格式 */
export function parseReferencesJson(raw: string): ReferencesData {
  const parsed = JSON.parse(raw) as unknown;

  if (Array.isArray(parsed)) {
    return { references: parsed as ReferenceItem[], groups: [] };
  }

  const obj = parsed as Record<string, unknown>;
  return {
    references: Array.isArray(obj.references) ? (obj.references as ReferenceItem[]) : [],
    groups: Array.isArray(obj.groups) ? (obj.groups as ReferenceGroup[]) : [],
  };
}

// ── 代码片段定位 ──────────────────────────────────────────────────────────────

/**
 * 在 filePath 对应的源文件中搜索 snippet 文本，返回其行号范围（1-based）。
 * 先尝试精确匹配，再尝试 trim 后的版本，找不到返回 null。
 */
export function findSnippetLines(filePath: string, snippet: string): LineRange | null {
  if (!filePath || !snippet) {
    return null;
  }

  let fileContent: string;
  try {
    fileContent = fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }

  const fileLines = fileContent.split("\n");
  const candidates = [snippet.split("\n"), snippet.trim().split("\n")];

  for (const snippetLines of candidates) {
    const firstLineTrimmed = snippetLines[0].trim();

    for (let i = 0; i <= fileLines.length - snippetLines.length; i++) {
      if (!fileLines[i].includes(firstLineTrimmed)) {
        continue;
      }

      let matched = true;
      for (let j = 1; j < snippetLines.length; j++) {
        if (!fileLines[i + j].includes(snippetLines[j].trim())) {
          matched = false;
          break;
        }
      }

      if (matched) {
        return { startLine: i + 1, endLine: i + snippetLines.length };
      }
    }
  }

  return null;
}

// ── 引用项格式化 ──────────────────────────────────────────────────────────────

/**
 * 将一个代码片段类型的引用项格式化为可输出的结构。
 * 非片段类型（file、comment）返回 null。
 */
export function formatSnippetItem(item: ReferenceItem): FormattedSnippet | null {
  if (item.type !== "file-snippet" && item.type !== "global-snippet") {
    return null;
  }

  const filePath = item.filePath ?? item.targetFilePath ?? null;
  const snippet = item.snippet ?? null;

  let lineRange = "未知";
  if (filePath && snippet) {
    const result = findSnippetLines(filePath, snippet);
    if (result) {
      lineRange =
        result.startLine === result.endLine
          ? `第 ${result.startLine} 行`
          : `第 ${result.startLine}-${result.endLine} 行`;
    }
  }

  return {
    title: item.title || "(无标题)",
    type: item.type,
    filePath: filePath ?? "(无文件)",
    lineRange,
    snippet: snippet ?? "(无片段内容)",
  };
}
