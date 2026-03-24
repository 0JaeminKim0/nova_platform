import * as esbuild from 'esbuild'

await esbuild.build({
  entryPoints: ['src/server.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile: 'dist/server.mjs',
  external: ['better-sqlite3'],
  banner: {
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);"
  },
  minify: false,
  sourcemap: false
})

console.log('✅ Build complete → dist/server.mjs')
