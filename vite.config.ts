import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The `base` MUST exactly match the GitHub Pages repo subpath (case-sensitive):
// the game is served from https://ryanmathewson.github.io/RobotGame/
// For a user-site repo (username.github.io) this would be '/'.
export default defineConfig({
  base: '/RobotGame/',
  plugins: [react()],
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});
