import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    root: './src', // Source files will be in src
    base: './', // Relative paths for Electron
    envDir: '../', // Point to the root directory where .env is located (since root is ./src)
    build: {
        outDir: '../dist',
        emptyOutDir: true
    },
    server: {
        port: 3000
    }
})
