import * as assert from "assert";
import { searchSnippetsTool } from "../tools/searchSnippets";
import { makeData, getText } from "./helpers";

suite("Tool — search_snippets", () => {
  test("按标题命中", () => {
    const data = makeData([
      { title: "鉴权逻辑", type: "file-snippet", snippet: "const token = getToken();" },
      { title: "渲染函数", type: "file-snippet", snippet: "render()" },
    ]);
    const text = getText(searchSnippetsTool.handle({ workspacePath: "/proj", query: "鉴权" }, data));
    assert.ok(text.includes("鉴权逻辑"));
    assert.ok(!text.includes("渲染函数"));
  });

  test("按片段内容命中", () => {
    const data = makeData([
      { title: "工具A", type: "file-snippet", snippet: "validateToken(user)" },
      { title: "工具B", type: "file-snippet", snippet: "renderPage()" },
    ]);
    const text = getText(searchSnippetsTool.handle({ workspacePath: "/proj", query: "validateToken" }, data));
    assert.ok(text.includes("工具A"));
    assert.ok(!text.includes("工具B"));
  });

  test("大小写不敏感", () => {
    const data = makeData([
      { title: "Auth Handler", type: "file-snippet", snippet: "handleAuth()" },
    ]);
    const result = searchSnippetsTool.handle({ workspacePath: "/proj", query: "auth" }, data);
    assert.ok(!result.isError);
    assert.ok(getText(result).includes("Auth Handler"));
  });

  test("无匹配时返回提示文本且不报错", () => {
    const data = makeData([
      { title: "登录", type: "file-snippet", snippet: "login()" },
    ]);
    const result = searchSnippetsTool.handle({ workspacePath: "/proj", query: "不存在的关键词xyz" }, data);
    assert.ok(!result.isError);
    assert.ok(getText(result).includes("未找到"));
  });

  test("query 为空时返回错误", () => {
    const result = searchSnippetsTool.handle({ workspacePath: "/proj", query: "" }, makeData([]));
    assert.strictEqual(result.isError, true);
  });

  test("结果包含正确的分组名", () => {
    const data = makeData(
      [{ title: "token 校验", type: "file-snippet", snippet: "checkToken()", groupId: "g1" }],
      [{ id: "g1", name: "安全模块" }]
    );
    assert.ok(getText(searchSnippetsTool.handle({ workspacePath: "/proj", query: "token" }, data)).includes("安全模块"));
  });

  test("未分组片段显示（未分组）", () => {
    const data = makeData([
      { title: "独立片段", type: "file-snippet", snippet: "standalone()", groupId: undefined },
    ]);
    assert.ok(getText(searchSnippetsTool.handle({ workspacePath: "/proj", query: "standalone" }, data)).includes("（未分组）"));
  });

  test("file 和 comment 类型不出现在结果中", () => {
    const data = makeData([
      { title: "仅文件", type: "file" },
      { title: "注释条目", type: "comment", comment: "这是一段注释" },
      { title: "有效片段", type: "file-snippet", snippet: "valid()" },
    ]);
    // "注释条目"标题包含"条目"，但 comment 类型应被过滤
    assert.ok(getText(searchSnippetsTool.handle({ workspacePath: "/proj", query: "条目" }, data)).includes("未找到"));
  });

  test("同时匹配标题和内容时均返回", () => {
    const data = makeData([
      { title: "登录入口", type: "file-snippet", snippet: "login()" },
      { title: "其他", type: "file-snippet", snippet: "// 登录相关处理" },
    ]);
    const text = getText(searchSnippetsTool.handle({ workspacePath: "/proj", query: "登录" }, data));
    assert.ok(text.includes("登录入口"));
    assert.ok(text.includes("其他"));
  });
});
