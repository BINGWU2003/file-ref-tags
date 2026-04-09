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
		entryPoints: [
			'src/mcp/server.ts'
		],
		bundle: true,
		format: 'esm',
		minify: production,
		sourcemap: !production,
		sourcesContent: false,
		platform: 'node',
		outfile: 'dist/mcp/server.mjs',
		banner: { js: '#!/usr/bin/env node' },
		logLevel: 'silent',
		plugins: [
			esbuildProblemMatcherPlugin,
		],
	});

	// npm 发布专用：单文件打包，依赖内嵌，输出到 mcp-server/dist/
	const mcpNpmCtx = npm ? await esbuild.context({
		entryPoints: ['src/mcp/server.ts'],
		bundle: true,
		format: 'esm',
		minify: production,
		sourcemap: false,
		platform: 'node',
		outfile: 'mcp-server/dist/server.mjs',
		// 不设 external，将所有依赖打包进单文件
		banner: { js: '#!/usr/bin/env node' },
		logLevel: 'silent',
		plugins: [esbuildProblemMatcherPlugin],
	}) : null;

	if (watch) {
		await extensionCtx.watch();
		await mcpCtx.watch();
	} else {
		await extensionCtx.rebuild();
		await extensionCtx.dispose();
		await mcpCtx.rebuild();
		await mcpCtx.dispose();
		if (mcpNpmCtx) {
			await mcpNpmCtx.rebuild();
			await mcpNpmCtx.dispose();
		}
	}
}

main().catch(e => {
	console.error(e);
	process.exit(1);
});
