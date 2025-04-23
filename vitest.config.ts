import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/src/tests/**/*.test.ts'],
    exclude: [
      'src/site-index.ts',
      'src/sites/**',
      'src/index.ts',
      'src/types.ts'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text'],
      exclude: [
        'dist/**',
        'src/sites/**',
        'src/site-index.ts',
        'src/index.ts',
        'src/types.ts',
        '**/scripts/**',
        '**/vite/**',
        '*.config.js',
        '*.config.ts'
      ]
    }
  }
})