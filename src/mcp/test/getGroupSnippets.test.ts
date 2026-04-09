import * as assert from "assert";
import { getGroupSnippetsTool } from "../tools/getGroupSnippets";
import { makeData, getText } from "./helpers";

suite("Tool — get_group_snippets", () => {
  test("按分组名称查询，返回对应片段", () => {
    const data = makeData(
      [
        { id: "r1", title: "登录", type: "file-snippet", snippet: "login()", groupId: "g1" },
        { id: "r2", title: "注册", type: "file-snippet", snippet: "register()", groupId: "g2" },
      ],
      [
        { id: "g1", name: "认证" },
        { id: "g2", name: "其他" },
      ]
    );
    const text = getText(getGroupSnippetsTool.handle({ workspacePath: "/proj", groupName: "认证" }, data));
    assert.ok(text.includes("登录"));
    assert.ok(!text.includes("注册"));
  });

  test("按分组 ID 查询", () => {
    const data = makeData(
      [{ id: "r1", title: "片段A", type: "file-snippet", snippet: "a()", groupId: "g1" }],
      [{ id: "g1", name: "模块A" }]
    );
    const text = getText(getGroupSnippetsTool.handle({ workspacePath: "/proj", groupName: "g1" }, data));
    assert.ok(text.includes("片段A"));
  });

  test("分组名不存在时返回错误并列出可用分组", () => {
    const data = makeData(
      [],
      [{ id: "g1", name: "已有分组" }]
    );
    const result = getGroupSnippetsTool.handle({ workspacePath: "/proj", groupName: "不存在" }, data);
    assert.strictEqual(result.isError, true);
    assert.ok(getText(result).includes("已有分组"));
  });

  test("groupName 不传时返回未分组片段", () => {
    const data = makeData([
      { id: "r1", title: "无组片段", type: "file-snippet", snippet: "free()", groupId: undefined },
      { id: "r2", title: "有组片段", type: "file-snippet", snippet: "grouped()", groupId: "g1" },
    ], [{ id: "g1", name: "分组" }]);
    const text = getText(getGroupSnippetsTool.handle({ workspacePath: "/proj" }, data));
    assert.ok(text.includes("无组片段"));
    assert.ok(!text.includes("有组片段"));
  });

  test("分组下无片段时返回提示", () => {
    const data = makeData(
      [],
      [{ id: "g1", name: "空分组" }]
    );
    const result = getGroupSnippetsTool.handle({ workspacePath: "/proj", groupName: "空分组" }, data);
    assert.ok(!result.isError);
    assert.ok(getText(result).includes("没有"));
  });

  test("默认只返回 file-snippet 和 global-snippet 类型", () => {
    const data = makeData(
      [
        { id: "r1", title: "片段条目", type: "file-snippet", snippet: "s()", groupId: "g1" },
        { id: "r2", title: "注释条目", type: "comment", comment: "备注", groupId: "g1" },
        { id: "r3", title: "纯文件条目", type: "file", groupId: "g1" },
      ],
      [{ id: "g1", name: "混合" }]
    );
    const text = getText(getGroupSnippetsTool.handle({ workspacePath: "/proj", groupName: "混合" }, data));
    assert.ok(text.includes("片段条目"));
    assert.ok(!text.includes("注释条目"));
    assert.ok(!text.includes("纯文件条目"));
  });

  test("includeAllTypes 为 true 时包含所有类型", () => {
    const data = makeData(
      [
        { id: "r1", title: "片段", type: "file-snippet", snippet: "s()", groupId: "g1" },
        { id: "r2", title: "注释", type: "comment", comment: "备注", groupId: "g1" },
      ],
      [{ id: "g1", name: "混合" }]
    );
    const text = getText(getGroupSnippetsTool.handle(
      { workspacePath: "/proj", groupName: "混合", includeAllTypes: true },
      data
    ));
    assert.ok(text.includes("片段"));
    assert.ok(text.includes("注释"));
  });

  test("global-snippet 类型也被包含", () => {
    const data = makeData(
      [{ id: "r1", title: "全局片段", type: "global-snippet", snippet: "global()", groupId: "g1" }],
      [{ id: "g1", name: "全局" }]
    );
    const text = getText(getGroupSnippetsTool.handle({ workspacePath: "/proj", groupName: "全局" }, data));
    assert.ok(text.includes("全局片段"));
  });
});
