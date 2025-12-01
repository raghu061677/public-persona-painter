import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "recharts",
      "highcharts",
      "highcharts-react-official",
      "@supabase/supabase-js",
      "@supabase/postgrest-js",
      "@supabase/realtime-js",
      "@supabase/storage-js",
      "@supabase/functions-js"
    ],
    dedupe: ["react", "react-dom"]
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react/jsx-runtime'],
          'vendor-xlsx': ['xlsx'],
          'vendor-pptx': ['pptxgenjs'],
          'vendor-charts': ['recharts', 'highcharts', 'highcharts-react-official'],
          'vendor-ui': ['@radix-ui/react-accordion', '@radix-ui/react-alert-dialog', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-popover', '@radix-ui/react-select', '@radix-ui/react-tabs', '@radix-ui/react-toast'],
          'vendor-supabase': ['@supabase/supabase-js', '@supabase/postgrest-js', '@supabase/realtime-js', '@supabase/storage-js', '@supabase/functions-js'],
          'vendor-table': ['@tanstack/react-table', '@tanstack/react-query'],
        },
      },
    },
    chunkSizeWarningLimit: 1500,
    // Optimize for better tree-shaking
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: true,
      },
    },
  },
  plugins: [
    react(),
    // Bundle analyzer - generates stats.html
    visualizer({
      open: false,
      gzipSize: true,
      brotliSize: true,
      filename: 'dist/stats.html',
    }),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "prompt",
      injectRegister: 'auto',
      includeAssets: ["favicon.ico", "robots.txt", "favicon-16x16.png", "favicon-32x32.png", "favicon-192x192.png", "apple-touch-icon.png"],
      manifestFilename: "manifest.json",
      manifest: {
        name: "Go-Ads 360° - OOH Media Management",
        short_name: "Go-Ads 360°",
        description: "Complete OOH advertising management platform for media owners and agencies",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#1e40af",
        orientation: "portrait-primary",
        icons: [
          {
            src: "/favicon-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/favicon-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable"
          },
          {
            src: "/apple-touch-icon.png",
            sizes: "180x180",
            type: "image/png"
          }
        ],
        categories: ["business", "productivity", "utilities"],
        shortcuts: [
          {
            name: "Dashboard",
            short_name: "Dashboard",
            description: "View your dashboard",
            url: "/admin/dashboard",
            icons: [{ src: "/favicon-192x192.png", sizes: "192x192" }]
          },
          {
            name: "Media Assets",
            short_name: "Assets",
            description: "Manage media assets",
            url: "/admin/media-assets",
            icons: [{ src: "/favicon-192x192.png", sizes: "192x192" }]
          },
          {
            name: "Campaigns",
            short_name: "Campaigns",
            description: "View campaigns",
            url: "/admin/campaigns",
            icons: [{ src: "/favicon-192x192.png", sizes: "192x192" }]
          }
        ],
        prefer_related_applications: false
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 20 * 1024 * 1024,
        // Minimal precaching - only essential static assets
        globPatterns: ["**/*.{css,html,ico,png,woff,woff2}"],
        // Exclude all JS to prevent dependency order issues
        globIgnores: [
          '**/node_modules/**',
          '**/*.js',
          '**/*.js.map',
          '**/manifest.json'
        ],
        // Skip waiting to prevent automatic reloads
        skipWaiting: false,
        clientsClaim: false,
        runtimeCaching: [
          {
            // Cache JavaScript files on demand with NetworkFirst strategy
            urlPattern: /\.js$/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "js-runtime-cache",
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 1 day
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/psryfvfdmjguhamvmqqd\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api-cache",
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 5, // 5 minutes
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\.(png|jpg|jpeg|svg|gif|webp)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "images-cache",
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
        navigateFallback: undefined,
        navigateFallbackDenylist: [/^\/_/, /\/api\//, /\/manifest\.json$/],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    conditions: ['import', 'module', 'browser', 'default'],
  },
}));
