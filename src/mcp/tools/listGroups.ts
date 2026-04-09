import { IDE_SCHEMA, McpTool, McpToolResult, WORKSPACE_PATH_SCHEMA } from "./types.js";
import { ReferencesData } from "../utils.js";

export const listGroupsTool: McpTool = {
  definition: {
    name: "list_groups",
    description: "列出指定项目中 file-ref-tags 的所有分组名称和 ID。",
    inputSchema: {
      type: "object",
      properties: {
        workspacePath: WORKSPACE_PATH_SCHEMA,
        ide: IDE_SCHEMA,
      },
      required: ["workspacePath"],
    },
  },

  handle(_args: Record<string, unknown>, data: ReferencesData): McpToolResult {
    const { groups, references } = data;

    const countMap: Record<string, number> = {};
    references.forEach((r) => {
      const gid = r.groupId ?? "__ungrouped__";
      countMap[gid] = (countMap[gid] ?? 0) + 1;
    });

    const lines: string[] = ["## 所有分组\n"];

    if (groups.length === 0) {
      lines.push("（暂无分组）");
    } else {
      groups.forEach((g) => {
        lines.push(`- **${g.name}**（ID: \`${g.id}\`，共 ${countMap[g.id] ?? 0} 个引用项）`);
      });
    }

    const ungroupedCount = countMap["__ungrouped__"] ?? 0;
    if (ungroupedCount > 0) {
      lines.push(`- **（未分组）**（共 ${ungroupedCount} 个引用项）`);
    }

    return { content: [{ type: "text", text: lines.join("\n") }] };
  },
};
