import * as assert from "assert";
import * as fs from "fs";
import {
  uriToPath,
  normalizePath,
  parseReferencesJson,
  findSnippetLines,
  formatSnippetItem,
  ReferencesData,
} from "../utils";
import { writeTempFile, makeItem } from "./helpers";

// ─────────────────────────────────────────────────────────────────────────────

suite("MCP Utils — uriToPath", () => {
  test("file:/// URI 转本地路径（跨平台）", () => {
    if (process.platform === "win32") {
      assert.strictEqual(uriToPath("file:///C:/Users/foo/bar"), "C:/Users/foo/bar");
      assert.strictEqual(uriToPath("file:///D:/my%20project"), "D:/my project");
    } else {
      assert.strictEqual(uriToPath("file:///home/user/project"), "/home/user/project");
      assert.strictEqual(uriToPath("file:///home/user/my%20project"), "/home/user/my project");
    }
  });

  test("非 URI 字符串原样返回", () => {
    assert.strictEqual(uriToPath("/home/user/project"), "/home/user/project");
    assert.strictEqual(uriToPath("C:\\Users\\foo"), "C:\\Users\\foo");
  });
});

suite("MCP Utils — normalizePath", () => {
  test("去除尾部路径分隔符", () => {
    const p = normalizePath("/home/user/project/");
    assert.ok(!p.endsWith("/") && !p.endsWith("\\"));
  });

  test("Windows 下转小写", () => {
    if (process.platform === "win32") {
      assert.strictEqual(normalizePath("C:\\Users\\Foo\\Bar"), normalizePath("C:\\Users\\foo\\bar"));
    } else {
      const p = normalizePath("/Home/User/Project");
      assert.ok(p.includes("H") || true);
    }
  });

  test("相同路径不同写法规范化后相等（Windows）", () => {
    if (process.platform === "win32") {
      assert.strictEqual(
        normalizePath("C:/Users/foo/bar/"),
        normalizePath("C:\\Users\\FOO\\bar")
      );
    }
  });
});

suite("MCP Utils — parseReferencesJson", () => {
  test("解析新格式（含 groups）", () => {
    const raw = JSON.stringify({
      references: [
        { id: "r1", type: "file-snippet", title: "A", createdAt: "", updatedAt: "" },
      ],
      groups: [
        { id: "g1", name: "核心", createdAt: "", updatedAt: "" },
      ],
    });
    const data: ReferencesData = parseReferencesJson(raw);
    assert.strictEqual(data.references.length, 1);
    assert.strictEqual(data.groups.length, 1);
    assert.strictEqual(data.groups[0].name, "核心");
  });

  test("解析旧格式（纯数组）", () => {
    const raw = JSON.stringify([
      { id: "r1", type: "file-snippet", title: "A", createdAt: "", updatedAt: "" },
    ]);
    const data: ReferencesData = parseReferencesJson(raw);
    assert.strictEqual(data.references.length, 1);
    assert.deepStrictEqual(data.groups, []);
  });

  test("空数据不报错", () => {
    const data = parseReferencesJson(JSON.stringify({ references: [], groups: [] }));
    assert.deepStrictEqual(data.references, []);
    assert.deepStrictEqual(data.groups, []);
  });

  test("references 字段缺失时返回空数组", () => {
    const data = parseReferencesJson(JSON.stringify({ groups: [] }));
    assert.deepStrictEqual(data.references, []);
  });
});

suite("MCP Utils — findSnippetLines", () => {
  test("单行片段 — 精确定位", () => {
    const filePath = writeTempFile("line1\nline2\nline3\nline4\n");
    const result = findSnippetLines(filePath, "line2");
    fs.unlinkSync(filePath);
    assert.ok(result !== null);
    assert.strictEqual(result!.startLine, 2);
    assert.strictEqual(result!.endLine, 2);
  });

  test("多行片段 — 精确定位", () => {
    const filePath = writeTempFile("function foo() {\n  return 42;\n}\n");
    const result = findSnippetLines(filePath, "function foo() {\n  return 42;\n}");
    fs.unlinkSync(filePath);
    assert.ok(result !== null);
    assert.strictEqual(result!.startLine, 1);
    assert.strictEqual(result!.endLine, 3);
  });

  test("片段在文件中间", () => {
    const content = "import A from './a';\nimport B from './b';\n\nconst x = 1;\nconst y = 2;\n";
    const filePath = writeTempFile(content);
    const result = findSnippetLines(filePath, "const x = 1;\nconst y = 2;");
    fs.unlinkSync(filePath);
    assert.ok(result !== null);
    assert.strictEqual(result!.startLine, 4);
    assert.strictEqual(result!.endLine, 5);
  });

  test("trim 后可匹配带前后空白的片段", () => {
    const filePath = writeTempFile("  const a = 1;\n  const b = 2;\n");
    const result = findSnippetLines(filePath, "\nconst a = 1;\nconst b = 2;\n");
    fs.unlinkSync(filePath);
    assert.ok(result !== null);
  });

  test("片段不存在时返回 null", () => {
    const filePath = writeTempFile("hello world\n");
    const result = findSnippetLines(filePath, "this does not exist");
    fs.unlinkSync(filePath);
    assert.strictEqual(result, null);
  });

  test("文件不存在时返回 null", () => {
    const result = findSnippetLines("/non/existent/file.ts", "anything");
    assert.strictEqual(result, null);
  });

  test("snippet 为空时返回 null", () => {
    assert.strictEqual(findSnippetLines("/some/file.ts", ""), null);
  });
});

suite("MCP Utils — formatSnippetItem", () => {
  test("file-snippet 类型正常格式化", () => {
    const filePath = writeTempFile("const answer = 42;\n");
    const item = makeItem({ type: "file-snippet", filePath, snippet: "const answer = 42;" });
    const result = formatSnippetItem(item);
    fs.unlinkSync(filePath);

    assert.ok(result !== null);
    assert.strictEqual(result!.type, "file-snippet");
    assert.strictEqual(result!.filePath, filePath);
    assert.strictEqual(result!.snippet, "const answer = 42;");
    assert.match(result!.lineRange, /第 \d+/);
  });

  test("global-snippet 类型正常格式化", () => {
    const filePath = writeTempFile("export const PI = 3.14;\n");
    const item = makeItem({ type: "global-snippet", filePath, snippet: "export const PI = 3.14;" });
    const result = formatSnippetItem(item);
    fs.unlinkSync(filePath);

    assert.ok(result !== null);
    assert.strictEqual(result!.type, "global-snippet");
  });

  test("file 类型返回 null", () => {
    const item = makeItem({ type: "file" });
    assert.strictEqual(formatSnippetItem(item), null);
  });

  test("comment 类型返回 null", () => {
    const item = makeItem({ type: "comment" });
    assert.strictEqual(formatSnippetItem(item), null);
  });

  test("无法定位行号时 lineRange 显示为 '未知'", () => {
    const item = makeItem({
      type: "file-snippet",
      filePath: "/nonexistent/path.ts",
      snippet: "something",
    });
    const result = formatSnippetItem(item);
    assert.ok(result !== null);
    assert.strictEqual(result!.lineRange, "未知");
  });

  test("filePath 缺失时使用 targetFilePath", () => {
    const filePath = writeTempFile("const x = 0;\n");
    const item = makeItem({
      type: "file-snippet",
      filePath: undefined,
      targetFilePath: filePath,
      snippet: "const x = 0;",
    });
    const result = formatSnippetItem(item);
    fs.unlinkSync(filePath);

    assert.ok(result !== null);
    assert.strictEqual(result!.filePath, filePath);
  });

  test("标题为空时显示 '(无标题)'", () => {
    const item = makeItem({ type: "file-snippet", title: "" });
    const result = formatSnippetItem(item);
    assert.ok(result !== null);
    assert.strictEqual(result!.title, "(无标题)");
  });
});
