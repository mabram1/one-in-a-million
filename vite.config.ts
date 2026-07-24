import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the same build works on GitHub Pages (served from a
  // subdirectory), Vercel (root), and Capacitor (capacitor:// / file://).
  base: './',
  build: {
    // Keep the historical output directory so Pages, vercel.json and
    // capacitor.config.json (webDir: "www") all keep working unchanged.
    outDir: 'www',
    emptyOutDir: true,
    target: 'es2020',
    sourcemap: true,
  },
  server: { host: true, port: 5173 },
});
