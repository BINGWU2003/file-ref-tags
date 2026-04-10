/**
 * File Ref Tags 初始化脚本
 *
 * 用法：node dist/mcp/init.mjs [workspacePath]
 * 引导用户选择 IDE，生成 .vscode/file-ref-tags.json
 */

import fs from "fs";
import path from "path";

type IdeOption = "vscode" | "cursor" | "auto";

const WORKSPACE_CONFIG_RELATIVE_PATH = path.join(".vscode", "file-ref-tags.json");

async function main(): Promise<void> {
  const p = await import("@clack/prompts");

  const workspacePath = process.argv[2] ?? process.cwd();
  const resolvedWorkspace = path.resolve(workspacePath);

  if (!fs.existsSync(resolvedWorkspace)) {
    p.cancel(`路径不存在：${resolvedWorkspace}`);
    process.exit(1);
  }

  console.log();
  p.intro("File Ref Tags — 工作区初始化");

  const configPath = path.join(resolvedWorkspace, WORKSPACE_CONFIG_RELATIVE_PATH);
  const configExists = fs.existsSync(configPath);

  if (configExists) {
    let currentIde = "(未知)";
    try {
      const existing = JSON.parse(fs.readFileSync(configPath, "utf8")) as Record<string, unknown>;
      currentIde = String(existing.ide ?? "(未设置)");
    } catch {
      // ignore
    }
    p.note(`已检测到配置文件\n当前 ide = ${currentIde}`, configPath);
  }

  const ide = await p.select<IdeOption>({
    message: "选择使用的 IDE",
    options: [
      {
        value: "vscode",
        label: "VS Code",
        hint: "读取 VS Code 的工作区存储",
      },
      {
        value: "cursor",
        label: "Cursor",
        hint: "读取 Cursor 的工作区存储",
      },
      {
        value: "auto",
        label: "Auto",
        hint: "优先 VS Code，找不到再找 Cursor",
      },
    ],
  });

  if (p.isCancel(ide)) {
    p.cancel("已取消");
    process.exit(0);
  }

  const vscodeDir = path.join(resolvedWorkspace, ".vscode");
  if (!fs.existsSync(vscodeDir)) {
    fs.mkdirSync(vscodeDir, { recursive: true });
  }

  fs.writeFileSync(configPath, JSON.stringify({ ide }, null, 2) + "\n", "utf8");

  p.outro(`ide = "${ide}"  已写入 ${configPath}`);
}

main().catch(async (err: Error) => {
  const p = await import("@clack/prompts");
  p.cancel(`错误：${err.message}`);
  process.exit(1);
});
