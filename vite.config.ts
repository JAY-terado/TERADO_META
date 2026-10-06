import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      dedupe: ['react', 'react-dom'],
    },
    server: {
      host: true,
      port: Number(env.PORT || env.VITE_PORT) || 5173,
      allowedHosts: ['app.shreenathhomes.com']
    },
    preview: {
      port: Number(env.PORT || env.VITE_PORT) || 5173,
      allowedHosts: ['app.shreenathhomes.com']
    },
    define: {
      'process.env': {
        NEXT_PUBLIC_API_URL: env.NEXT_PUBLIC_API_URL,
        NEXT_PUBLIC_GATEWAY_URL: env.NEXT_PUBLIC_GATEWAY_URL,
        NEXT_PUBLIC_SECRET_KEY: env.NEXT_PUBLIC_SECRET_KEY,
        NEXT_PUBLIC_SIGNATURE_VERSION: env.NEXT_PUBLIC_SIGNATURE_VERSION,
        NEXT_PUBLIC_ENVIROMENT: env.NEXT_PUBLIC_ENVIROMENT,
        NEXT_PUBLIC_FB_APP_ID: env.NEXT_PUBLIC_FB_APP_ID || '1972458773429923'
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: (id: string) => {
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) {
              return 'vendor-react';
            }
            if (id.includes('node_modules/lucide-react') || id.includes('node_modules/sweetalert2') || id.includes('node_modules/js-cookie') || id.includes('node_modules/axios')) {
              return 'vendor-ui';
            }
            if (id.includes('/src/admin/pages/Leads') || id.includes('/src/admin/pages/TemplateSettings') || id.includes('/src/admin/pages/Users')) {
              return 'admin-pages';
            }
          },
        },
      },
    },
  }
})

