import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
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
