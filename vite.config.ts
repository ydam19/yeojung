import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'node',
    pool: 'vmThreads',
  },
  server: {
    proxy: {
      '/api/kakao-transit': {
        target: 'https://dapi.kakao.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/kakao-transit/, '/v2/routing/publictraffic'),
      },
      '/api/kakao-local': {
        target: 'https://dapi.kakao.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/kakao-local/, '/v2/local/search/keyword.json'),
      },
      '/api/kakao-directions': {
        target: 'https://apis-navi.kakaomobility.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/kakao-directions/, '/v1/directions'),
      },
    },
  },
})
