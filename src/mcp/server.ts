#!/usr/bin/env node
/**
 * File Ref Tags MCP Server
 *
 * 用法：node dist/mcp/server.mjs
 * 工具调用时传入 workspacePath（项目根目录），server 自动定位对应的 references.json。
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { loadData } from "./storage.js";
import { TOOLS } from "./tools/index.js";

// ── MCP Server ────────────────────────────────────────────────────────────────

const server = new Server(
  { name: "file-ref-tags", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS.map((t) => t.definition),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const typedArgs = (args ?? {}) as Record<string, unknown>;

  const workspacePath = typedArgs.workspacePath as string | undefined;
  if (!workspacePath) {
    return {
      content: [{ type: "text", text: "错误：必须提供 workspacePath 参数。" }],
      isError: true,
    };
  }

  let data;
  try {
    data = loadData(workspacePath);
  } catch (err) {
    return {
      content: [{ type: "text", text: `错误：${(err as Error).message}` }],
      isError: true,
    };
  }

  const tool = TOOLS.find((t) => t.definition.name === name);
  if (!tool) {
    return {
      content: [{ type: "text", text: `未知工具：${name}` }],
      isError: true,
    };
  }

  return tool.handle(typedArgs, data);
});

// ── 启动 ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write("File Ref Tags MCP server 已启动（stdio 模式）\n");
}

main().catch((err: Error) => {
  process.stderr.write(`启动失败：${err.message}\n`);
  process.exit(1);
});
