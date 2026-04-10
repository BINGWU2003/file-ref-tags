# file-ref-tags-init

[file-ref-tags-mcp](https://www.npmjs.com/package/file-ref-tags-mcp) 的工作区初始化工具。

交互式 CLI，引导选择 IDE 并生成 `.vscode/file-ref-tags.json` 配置文件。

## 使用

```bash
# 初始化当前目录
npx file-ref-tags-init

# 或指定路径
npx file-ref-tags-init /path/to/project
```

运行后按箭头键选择 IDE，Enter 确认：

- **VS Code** — 读取 VS Code 的工作区存储
- **Cursor** — 读取 Cursor 的工作区存储
- **Auto** — 优先 VS Code，找不到再找 Cursor

自动写入 `<workspace>/.vscode/file-ref-tags.json`：

```json
{
  "ide": "cursor"
}
```

## License

MIT
