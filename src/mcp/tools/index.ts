import { listGroupsTool } from "./listGroups.js";
import { getGroupSnippetsTool } from "./getGroupSnippets.js";
import { searchSnippetsTool } from "./searchSnippets.js";
import { McpTool } from "./types.js";

export const TOOLS: McpTool[] = [listGroupsTool, getGroupSnippetsTool, searchSnippetsTool];