import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          ui: ["react-toastify"],
        },
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: false,
    minify: "esbuild",
    target: "es2015",
    cssCodeSplit: true,
    assetsInlineLimit: 4096,
    reportCompressedSize: false,
    commonjsOptions: {
      include: [/node_modules/],
      extensions: [".js", ".cjs"],
    },
    esbuild: {
      target: "es2015",
      supported: {
        "top-level-await": true,
      },
      legalComments: "none",
      treeShaking: true,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom", "react-toastify"],
    esbuildOptions: {
      target: "es2015",
      supported: {
        "top-level-await": true,
      },
      legalComments: "none",
      treeShaking: true,
    },
  },
});
