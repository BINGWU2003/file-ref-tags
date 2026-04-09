import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { ReferencesData } from "../utils";
import { ReferenceItem } from "../../types/referenct";
import { McpToolResult } from "../tools/types";

export function writeTempFile(content: string, ext = ".ts"): string {
  const filePath = path.join(os.tmpdir(), `frt-test-${Date.now()}${ext}`);
  fs.writeFileSync(filePath, content, "utf8");
  return filePath;
}

export function makeItem(overrides: Partial<ReferenceItem> = {}): ReferenceItem {
  return {
    id: "ref-1",
    type: "file-snippet",
    title: "测试片段",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function makeData(
  items: Partial<ReferenceItem>[],
  groups: { id: string; name: string }[] = []
): ReferencesData {
  return {
    references: items.map((overrides, i) => makeItem({ id: `ref-${i}`, ...overrides })),
    groups: groups.map((g) => ({ ...g, createdAt: "", updatedAt: "" })),
  };
}

export function getText(result: McpToolResult): string {
  return (result.content[0] as { type: "text"; text: string }).text;
}
