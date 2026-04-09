import * as assert from "assert";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { loadData } from "../storage";

type IdeName = "vscode" | "cursor";

function toFileUri(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");
  if (/^[a-zA-Z]:\//.test(normalized)) {
    return `file:///${encodeURI(normalized)}`;
  }
  return `file://${encodeURI(normalized)}`;
}

function getIdeUserDir(ide: IdeName): string {
  if (process.platform === "win32") {
    const appData = process.env.APPDATA ?? os.homedir();
    return ide === "cursor"
      ? path.join(appData, "Cursor", "User")
      : path.join(appData, "Code", "User");
  }

  const home = os.homedir();
  return process.platform === "darwin"
    ? path.join(
      home,
      "Library",
      "Application Support",
      ide === "cursor" ? "Cursor" : "Code",
      "User"
    )
    : path.join(home, ".config", ide === "cursor" ? "Cursor" : "Code", "User");
}

function writeWorkspaceConfig(workspacePath: string, ide: "auto" | IdeName): void {
  const configDir = path.join(workspacePath, ".vscode");
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(
    path.join(configDir, "file-ref-tags.json"),
    JSON.stringify({ ide }, null, 2),
    "utf8"
  );
}

function writeWorkspaceStorageEntry(
  workspacePath: string,
  ide: IdeName,
  snippetTitle: string
): void {
  const hash = `${ide}-workspace-hash`;
  const workspaceStorageDir = path.join(getIdeUserDir(ide), "workspaceStorage", hash);
  fs.mkdirSync(workspaceStorageDir, { recursive: true });

  const workspaceMeta = {
    folder: toFileUri(workspacePath),
  };
  fs.writeFileSync(
    path.join(workspaceStorageDir, "workspace.json"),
    JSON.stringify(workspaceMeta, null, 2),
    "utf8"
  );

  const refsDir = path.join(workspaceStorageDir, "LiRenTech.file-ref-tags");
  fs.mkdirSync(refsDir, { recursive: true });
  fs.writeFileSync(
    path.join(refsDir, "references.json"),
    JSON.stringify({
      references: [
        {
          id: `${ide}-ref-1`,
          type: "file-snippet",
          title: snippetTitle,
          snippet: `console.log("${snippetTitle}")`,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      groups: [],
    }),
    "utf8"
  );
}

suite("MCP Storage - ide config", () => {
  const originalAppData = process.env.APPDATA;
  const originalHome = process.env.HOME;
  const originalUserProfile = process.env.USERPROFILE;
  const createdDirs: string[] = [];

  function createIsolatedRoot(): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "frt-storage-test-"));
    createdDirs.push(root);
    return root;
  }

  function setupUserEnv(root: string): void {
    process.env.APPDATA = path.join(root, "appdata");
    process.env.HOME = path.join(root, "home");
    process.env.USERPROFILE = path.join(root, "userprofile");
  }

  teardown(() => {
    process.env.APPDATA = originalAppData;
    process.env.HOME = originalHome;
    process.env.USERPROFILE = originalUserProfile;

    for (const dir of createdDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("未传 ide 参数时读取 .vscode/file-ref-tags.json", () => {
    const root = createIsolatedRoot();
    setupUserEnv(root);
    const workspacePath = path.join(root, "workspace-a");
    fs.mkdirSync(workspacePath, { recursive: true });

    writeWorkspaceConfig(workspacePath, "cursor");
    writeWorkspaceStorageEntry(workspacePath, "cursor", "cursor-snippet");

    const data = loadData(workspacePath);
    assert.strictEqual(data.references.length, 1);
    assert.strictEqual(data.references[0].title, "cursor-snippet");
  });

  test("调用参数 ide 优先级高于工作区配置", () => {
    const root = createIsolatedRoot();
    setupUserEnv(root);
    const workspacePath = path.join(root, "workspace-b");
    fs.mkdirSync(workspacePath, { recursive: true });

    writeWorkspaceConfig(workspacePath, "vscode");
    writeWorkspaceStorageEntry(workspacePath, "vscode", "vscode-snippet");
    writeWorkspaceStorageEntry(workspacePath, "cursor", "cursor-snippet");

    const fromConfig = loadData(workspacePath);
    assert.strictEqual(fromConfig.references[0].title, "vscode-snippet");

    const fromArg = loadData(workspacePath, "cursor");
    assert.strictEqual(fromArg.references[0].title, "vscode-snippet");
  });

  test("未传 ide 且无配置文件时默认读取 vscode", () => {
    const root = createIsolatedRoot();
    setupUserEnv(root);
    const workspacePath = path.join(root, "workspace-c");
    fs.mkdirSync(workspacePath, { recursive: true });

    writeWorkspaceStorageEntry(workspacePath, "vscode", "vscode-default-snippet");

    const data = loadData(workspacePath);
    assert.strictEqual(data.references.length, 1);
    assert.strictEqual(data.references[0].title, "vscode-default-snippet");
  });

  test("未传 ide 且无配置文件时，vscode 不存在则报错", () => {
    const root = createIsolatedRoot();
    setupUserEnv(root);
    const workspacePath = path.join(root, "workspace-c2");
    fs.mkdirSync(workspacePath, { recursive: true });

    assert.throws(
      () => loadData(workspacePath),
      (err) =>
        err instanceof Error &&
        err.message.includes("vscode") &&
        err.message.includes("workspaceStorage")
    );
  });

  test("配置文件中 ide 值非法时抛错", () => {
    const root = createIsolatedRoot();
    setupUserEnv(root);
    const workspacePath = path.join(root, "workspace-d");
    fs.mkdirSync(path.join(workspacePath, ".vscode"), { recursive: true });
    fs.writeFileSync(
      path.join(workspacePath, ".vscode", "file-ref-tags.json"),
      JSON.stringify({ ide: "unknown-ide" }, null, 2),
      "utf8"
    );

    assert.throws(
      () => loadData(workspacePath),
      (err) =>
        err instanceof Error &&
        err.message.includes("不支持的 ide 参数") &&
        err.message.includes("auto | vscode | cursor")
    );
  });

  test("无配置文件时可通过显式 ide 参数读取数据", () => {
    const root = createIsolatedRoot();
    setupUserEnv(root);
    const workspacePath = path.join(root, "workspace-e");
    fs.mkdirSync(workspacePath, { recursive: true });

    writeWorkspaceStorageEntry(workspacePath, "vscode", "vscode-only-snippet");

    const data = loadData(workspacePath, "vscode");
    assert.strictEqual(data.references.length, 1);
    assert.strictEqual(data.references[0].title, "vscode-only-snippet");
  });
});
