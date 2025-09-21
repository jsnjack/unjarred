import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import copy from 'rollup-plugin-copy-watch'
import execute from 'rollup-plugin-execute'
import { defineConfig } from 'vite'

// Get browser target from environment variable, default to firefox
const browser = process.env.BROWSER || 'firefox'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        vue(),
        execute([
            `VERSION=\`monova\` envsubst < manifest.template.${browser} > dist/manifest.json`
        ], {
            hook: 'writeBundle'
        }),
        copy({
            watch: process.argv.includes('--watch') ? 'public' : undefined,
            targets: [
                { src: 'public/*', dest: 'dist' }
            ]
        })
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        }
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: 'index.html',
                background: 'src/background.js'
            },
            output: {
                entryFileNames: chunkInfo => {
                    return chunkInfo.name === 'background' ? '[name].js' : 'assets/[name]-[hash].js';
                }
            }
        }
    }
})
