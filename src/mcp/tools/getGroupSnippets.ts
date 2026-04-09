import { IDE_SCHEMA, McpTool, McpToolResult, WORKSPACE_PATH_SCHEMA } from "./types.js";
import { ReferencesData, formatSnippetItem } from "../utils.js";
import { ReferenceItem } from "../../types/referenct.js";

export const getGroupSnippetsTool: McpTool = {
  definition: {
    name: "get_group_snippets",
    description:
      "读取指定项目中某个 file-ref-tags 分组下的所有代码片段，返回每个片段的文件路径、行号范围和片段内容。",
    inputSchema: {
      type: "object",
      properties: {
        workspacePath: WORKSPACE_PATH_SCHEMA,
        ide: IDE_SCHEMA,
        groupName: {
          type: "string",
          description: "要查询的分组名称。传入空字符串或不传时，返回未分配分组的片段。",
        },
        includeAllTypes: {
          type: "boolean",
          description: "是否同时包含 file 和 comment 类型的条目。默认 false，只返回代码片段。",
        },
      },
      required: ["workspacePath"],
    },
  },

  handle(args: Record<string, unknown>, data: ReferencesData): McpToolResult {
    const { groups, references } = data;
    const groupName = (args.groupName as string | undefined) ?? "";
    const includeAllTypes = (args.includeAllTypes as boolean | undefined) ?? false;

    // 定位目标分组
    let targetGroupId: string | null = null;
    if (groupName !== "") {
      const group = groups.find((g) => g.name === groupName || g.id === groupName);
      if (!group) {
        const available = groups.map((g) => `"${g.name}"`).join(", ") || "（无）";
        return {
          content: [{
            type: "text",
            text: `未找到名为 "${groupName}" 的分组。\n可用分组：${available}`,
          }],
          isError: true,
        };
      }
      targetGroupId = group.id;
    }

    // 筛选该分组下的引用项
    const items = references.filter((r) => {
      const inGroup = targetGroupId === null ? !r.groupId : r.groupId === targetGroupId;
      if (!inGroup) { return false; }
      return includeAllTypes || r.type === "file-snippet" || r.type === "global-snippet";
    });

    const label = groupName || "（未分组）";

    if (items.length === 0) {
      return {
        content: [{
          type: "text",
          text: `分组 "${label}" 下没有${includeAllTypes ? "" : "代码片段类型的"}引用项。`,
        }],
      };
    }

    const lines: string[] = [`## 分组「${label}」的代码片段（共 ${items.length} 项）\n`];

    items.forEach((item: ReferenceItem, idx: number) => {
      const formatted = formatSnippetItem(item);

      if (!formatted) {
        lines.push(`### ${idx + 1}. ${item.title || "(无标题)"}`);
        lines.push(`- 类型：${item.type}`);
        if (item.filePath) { lines.push(`- 文件：${item.filePath}`); }
        if (item.comment) { lines.push(`- 注释：${item.comment}`); }
        lines.push("");
        return;
      }

      lines.push(`### ${idx + 1}. ${formatted.title}`);
      lines.push(`- 类型：${formatted.type}`);
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
