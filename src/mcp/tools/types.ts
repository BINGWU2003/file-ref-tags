import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ReferencesData } from "../utils.js";

export type McpToolResult = CallToolResult;

export interface McpTool {
  definition: {
    name: string;
    description: string;
    inputSchema: {
      type: "object";
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
  handle(args: Record<string, unknown>, data: ReferencesData): McpToolResult;
}

export const WORKSPACE_PATH_SCHEMA = {
  type: "string",
  description: "项目根目录的绝对路径，用于定位该项目对应的 file-ref-tags 数据。",
} as const;

export const IDE_SCHEMA = {
  type: "string",
  enum: ["auto", "vscode", "cursor"],
  description:
    "可选，指定数据来源 IDE。auto 会自动在 VSCode 和 Cursor 中查找（默认值）。",
} as const;
