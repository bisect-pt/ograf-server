import path from 'path'
import { defineConfig } from 'vite'
import pluginChecker from 'vite-plugin-checker'
//

export default defineConfig({
	root: path.resolve(__dirname, 'src'),
	// resolve: {
	//     alias: {
	//       '~bootstrap': path.resolve(__dirname, 'node_modules/bootstrap'),
	//     }
	//   },
	server: {
		port: 8083,
	},
	build: {
		outDir: path.resolve(__dirname, 'dist'),
		rollupOptions: {
			output: {
				// With a hash in the name every build is a new url, so a
				// browser cannot go on running the bundle from before the
				// last one. Without it they are all called index.js, and a
				// cached copy has nothing to displace it. index.html is
				// rewritten to match and is itself revalidated.
				assetFileNames: '[name]-[hash][extname]',
				chunkFileNames: '[name]-[hash].js',
				entryFileNames: '[name]-[hash].js',
			},
			onwarn(warning, warn) {
				// Suppress "Module level directives cause errors when bundled" warnings
				if (warning.code === 'MODULE_LEVEL_DIRECTIVE') {
					return
				}
				warn(warning)
			},
		},
		assetsDir: '',
		emptyOutDir: true,
		chunkSizeWarningLimit: 2000,
	},
	base: '',
	plugins: [pluginChecker({ typescript: true })],
})
