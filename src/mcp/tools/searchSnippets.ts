import { McpTool, McpToolResult, WORKSPACE_PATH_SCHEMA } from "./types.js";
import { ReferencesData, formatSnippetItem } from "../utils.js";
import { ReferenceItem } from "../../types/referenct.js";

export const searchSnippetsTool: McpTool = {
  definition: {
    name: "search_snippets",
    description:
      "在指定项目的所有 file-ref-tags 片段中按关键词搜索，匹配范围包括标题和片段内容。适用于用户不记得分组名、只记得关键词的场景。",
    inputSchema: {
      type: "object",
      properties: {
        workspacePath: WORKSPACE_PATH_SCHEMA,
        query: {
          type: "string",
          description: "搜索关键词，不区分大小写，同时匹配标题和片段内容。",
        },
      },
      required: ["workspacePath", "query"],
    },
  },

  handle(args: Record<string, unknown>, data: ReferencesData): McpToolResult {
    const { references, groups } = data;
    const query = ((args.query as string | undefined) ?? "").trim();

    if (!query) {
      return {
        content: [{ type: "text", text: "错误：query 不能为空。" }],
        isError: true,
      };
    }

    const lower = query.toLowerCase();

    const matched = references.filter((r) => {
      if (r.type !== "file-snippet" && r.type !== "global-snippet") {
        return false;
      }
      return (
        r.title?.toLowerCase().includes(lower) ||
        r.snippet?.toLowerCase().includes(lower)
      );
    });

    if (matched.length === 0) {
      return {
        content: [{ type: "text", text: `未找到包含 "${query}" 的代码片段。` }],
      };
    }

    const groupMap = new Map(groups.map((g) => [g.id, g.name]));

    const lines: string[] = [`## 搜索「${query}」的结果（共 ${matched.length} 项）\n`];

    matched.forEach((item: ReferenceItem, idx: number) => {
      const formatted = formatSnippetItem(item);
      const groupName = item.groupId ? (groupMap.get(item.groupId) ?? "未知分组") : "（未分组）";

      lines.push(`### ${idx + 1}. ${item.title || "(无标题)"}`);
      lines.push(`- 分组：${groupName}`);

      if (!formatted) { return; }

      lines.push(`- 文件：${formatted.filePath}`);
      lines.push(`- 位置：${formatted.lineRange}`);
      lines.push("");
      lines.push("```");
      lines.push(formatted.snippet);
      lines.push("```");
      lines.push("");
    });

    return { content: [{ type: "text", text: lines.join("\n") }] };
  },
};
