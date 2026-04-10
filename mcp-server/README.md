# file-ref-tags-mcp

[File Ref Tags](https://marketplace.visualstudio.com/items?itemName=LiRenTech.file-ref-tags) VSCode 插件的 MCP Server。

让 AI Agent（Claude Code、Claude Desktop 等）能够查询插件中保存的代码片段，按分组或关键词检索，并将其作为对话上下文使用。

## 前置条件

- Node.js >= 18
- 已安装 [File Ref Tags](https://marketplace.visualstudio.com/items?itemName=LiRenTech.file-ref-tags) VSCode 插件，且在目标工作区至少启动过一次

## 安装

无需安装，直接通过 `npx` 运行：

```bash
npx file-ref-tags-mcp
```

或全局安装：

```bash
npm install -g file-ref-tags-mcp
```

## 配置

**Claude Code**（`~/.claude/settings.json`）：

```json
{
  "mcpServers": {
    "file-ref-tags": {
      "command": "npx",
      "args": ["file-ref-tags-mcp"]
    }
  }
}
```

**Claude Desktop**（`claude_desktop_config.json`）：

```json
{
  "mcpServers": {
    "file-ref-tags": {
      "command": "npx",
      "args": ["file-ref-tags-mcp"]
    }
  }
}
```

## IDE 配置

MCP Server 需要知道从哪个 IDE 的工作区存储中读取数据（VSCode 和 Cursor 的存储路径不同）。

### 方式一：初始化脚本（推荐）

使用 [file-ref-tags-init](https://www.npmjs.com/package/file-ref-tags-init) 交互式 CLI 引导生成配置文件：

```bash
# 初始化当前目录
npx file-ref-tags-init

# 或指定路径
npx file-ref-tags-init /path/to/project
```

运行后按箭头键选择 IDE，Enter 确认，自动写入 `.vscode/file-ref-tags.json`。

### 方式二：手动创建配置文件

在项目根目录手动创建 `.vscode/file-ref-tags.json`：

```json
{
  "ide": "cursor"
}
```

可选值：`vscode` | `cursor` | `auto`（优先 VSCode，找不到再找 Cursor）

**优先级**：工作区配置文件 > 工具参数 `ide` > 默认 `vscode`

## 可用工具

所有工具都需要传入 `workspacePath` 参数（项目根目录的绝对路径）。

所有工具支持可选参数 `ide`（`vscode` | `cursor` | `auto`），仅在工作区未配置 `.vscode/file-ref-tags.json` 时生效，用于临时指定本次调用读取哪个 IDE 的存储目录。

### `list_groups`

列出指定项目中所有分组的名称、ID 和引用项数量。

```
list_groups({ workspacePath: "/path/to/your/project" })
```

---

### `get_group_snippets`

获取指定分组下的所有代码片段。

```
get_group_snippets({
  workspacePath: "/path/to/your/project",
  groupName: "认证模块",   // 不传则返回未分组的片段
  includeAllTypes: false   // true 时同时包含文件引用和注释类型
})
```

每个片段返回：文件路径、行号范围（如第 12-18 行）、片段内容。

`includeAllTypes` 参数说明：

- `false`（默认）：只返回代码片段类型（`file-snippet`、`global-snippet`）
- `true`：额外包含 `file`、`comment` 类型的引用项
- 当返回 `file` / `comment` 类型时，会返回条目基础信息（标题、类型、文件路径或注释内容），不包含代码块与行号定位

---

### `search_snippets`

按关键词在所有分组中搜索代码片段，同时匹配标题和片段内容，不区分大小写。

```
search_snippets({
  workspacePath: "/path/to/your/project",
  query: "鉴权"
})
```

返回匹配的片段及其所属分组、文件路径、行号范围和内容。

## 使用方式

典型工作流：

1. 在 VSCode / Cursor 中编写代码时，用 **File Ref Tags** 将重要代码片段保存到命名分组中
2. 开始 AI 对话时，告诉 Agent 要参考哪个分组：
   > "参考「认证模块」分组，帮我重构登录流程"
3. Agent 调用 `get_group_snippets` 加载片段，以此为上下文进行回答

如果不记得片段在哪个分组，可以让 Agent 搜索：
   > "找一下我之前保存的关于 token 校验的代码"

## License

MIT
