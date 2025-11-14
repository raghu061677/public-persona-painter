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
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor libraries - separate into their own chunks for better caching
          'vendor-xlsx': ['xlsx'],
          'vendor-pptxgenjs': ['pptxgenjs'],
          'vendor-leaflet': ['leaflet', 'react-leaflet', 'leaflet.markercluster', 'leaflet.heat'],
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select', '@radix-ui/react-tabs'],
          'vendor-charts': ['recharts', 'highcharts', 'highcharts-react-official'],
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-utils': ['date-fns', 'clsx', 'tailwind-merge', 'class-variance-authority'],
        },
      },
    },
    chunkSizeWarningLimit: 1000, // Increase warning limit since we're now splitting properly
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
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "robots.txt", "offline.html", "favicon-16x16.png", "favicon-32x32.png", "favicon-192x192.png", "apple-touch-icon.png"],
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
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024, // 15 MB - increased for large bundle
        globPatterns: ["**/*.{js,css,html,ico,png,svg,json,woff,woff2}"],
        runtimeCaching: [
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
        navigateFallback: "/offline.html",
        navigateFallbackDenylist: [/^\/api/, /^\/admin\/plans\/.*\/share/, /manifest\.json$/],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
