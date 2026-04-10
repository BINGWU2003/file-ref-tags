const esbuild = require("esbuild");

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');
const npm = process.argv.includes('--npm');

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
	name: 'esbuild-problem-matcher',

	setup(build) {
		build.onStart(() => {
			console.log('[watch] build started');
		});
		build.onEnd((result) => {
			result.errors.forEach(({ text, location }) => {
				console.error(`✘ [ERROR] ${text}`);
				console.error(`    ${location.file}:${location.line}:${location.column}:`);
			});
			console.log('[watch] build finished');
		});
	},
};

async function main() {
	// VSCode 扩展：CJS 格式，排除 vscode 模块
	const extensionCtx = await esbuild.context({
		entryPoints: [
			'src/extension.ts'
		],
		bundle: true,
		format: 'cjs',
		minify: production,
		sourcemap: !production,
		sourcesContent: false,
		platform: 'node',
		outfile: 'dist/extension.js',
		external: ['vscode'],
		logLevel: 'silent',
		plugins: [
			esbuildProblemMatcherPlugin,
		],
	});

	// MCP Server：ESM 格式（@modelcontextprotocol/sdk 为纯 ESM 包）
	const mcpCtx = await esbuild.context({
		entryPoints: ['src/mcp/server.ts'],
		bundle: true,
		format: 'esm',
		minify: production,
		sourcemap: !production,
		sourcesContent: false,
		platform: 'node',
		outfile: 'dist/mcp/server.mjs',
		banner: { js: '#!/usr/bin/env node' },
		logLevel: 'silent',
		plugins: [esbuildProblemMatcherPlugin],
	});

	// MCP Init CLI：引导用户初始化 .vscode/file-ref-tags.json
	const mcpInitCtx = await esbuild.context({
		entryPoints: ['src/cli/init.ts'],
		bundle: true,
		format: 'esm',
		minify: production,
		sourcemap: !production,
		sourcesContent: false,
		platform: 'node',
		outfile: 'dist/mcp/init.mjs',
		banner: { js: '#!/usr/bin/env node' },
		logLevel: 'silent',
		plugins: [esbuildProblemMatcherPlugin],
	});

	// npm 发布专用：单文件打包，依赖内嵌，输出到 mcp-server/dist/
	const npmBase = {
		bundle: true,
		format: 'esm',
		minify: production,
		sourcemap: false,
		platform: 'node',
		banner: { js: '#!/usr/bin/env node' },
		logLevel: 'silent',
		plugins: [esbuildProblemMatcherPlugin],
	};
	const mcpNpmCtx = npm ? await esbuild.context({
		...npmBase,
		entryPoints: ['src/mcp/server.ts'],
		outfile: 'mcp-server/dist/server.mjs',
	}) : null;
	const mcpInitNpmCtx = npm ? await esbuild.context({
		...npmBase,
		entryPoints: ['src/cli/init.ts'],
		outfile: 'init-cli/dist/init.mjs',
	}) : null;

	if (watch) {
		await extensionCtx.watch();
		await mcpCtx.watch();
		await mcpInitCtx.watch();
	} else {
		await extensionCtx.rebuild();
		await extensionCtx.dispose();
		await mcpCtx.rebuild();
		await mcpCtx.dispose();
		await mcpInitCtx.rebuild();
		await mcpInitCtx.dispose();
		if (mcpNpmCtx) {
			await mcpNpmCtx.rebuild();
			await mcpNpmCtx.dispose();
			await mcpInitNpmCtx.rebuild();
			await mcpInitNpmCtx.dispose();
		}
	}
}

main().catch(e => {
	console.error(e);
	process.exit(1);
});
