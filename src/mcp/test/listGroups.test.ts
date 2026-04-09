import * as assert from "assert";
import { listGroupsTool } from "../tools/listGroups";
import { makeData, getText } from "./helpers";

suite("Tool — list_groups", () => {
  test("无分组时显示暂无分组", () => {
    const data = makeData([]);
    const text = getText(listGroupsTool.handle({}, data));
    assert.ok(text.includes("（暂无分组）"));
  });

  test("正确列出所有分组名称和 ID", () => {
    const data = makeData([], [
      { id: "g1", name: "核心模块" },
      { id: "g2", name: "工具函数" },
    ]);
    const text = getText(listGroupsTool.handle({}, data));
    assert.ok(text.includes("核心模块"));
    assert.ok(text.includes("工具函数"));
    assert.ok(text.includes("g1"));
    assert.ok(text.includes("g2"));
  });

  test("正确统计每个分组的引用项数量", () => {
    const data = makeData(
      [
        { id: "r1", groupId: "g1" },
        { id: "r2", groupId: "g1" },
        { id: "r3", groupId: "g2" },
      ],
      [
        { id: "g1", name: "A" },
        { id: "g2", name: "B" },
      ]
    );
    const text = getText(listGroupsTool.handle({}, data));
    assert.ok(text.includes("共 2 个引用项") || text.match(/A.*2/));
    assert.ok(text.includes("共 1 个引用项") || text.match(/B.*1/));
  });

  test("有未分组引用项时显示未分组条目", () => {
    const data = makeData(
      [{ id: "r1", groupId: undefined }],
      [{ id: "g1", name: "已分组" }]
    );
    const text = getText(listGroupsTool.handle({}, data));
    assert.ok(text.includes("未分组"));
  });

  test("无未分组引用项时不显示未分组条目", () => {
    const data = makeData(
      [{ id: "r1", groupId: "g1" }],
      [{ id: "g1", name: "已分组" }]
    );
    const text = getText(listGroupsTool.handle({}, data));
    assert.ok(!text.includes("未分组"));
  });

  test("分组引用项计数为 0 时正确显示", () => {
    const data = makeData(
      [],
      [{ id: "g1", name: "空分组" }]
    );
    const text = getText(listGroupsTool.handle({}, data));
    assert.ok(text.includes("空分组"));
    assert.ok(text.includes("共 0 个引用项"));
  });
});
