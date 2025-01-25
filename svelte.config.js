import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: 'index.html',  // 添加 fallback 选项
			precompress: false,
			strict: false  // 关闭严格模式
		})
	}
};

export default config;
