import type { Config } from 'jest';

const config: Config = {
  // Penting: preset ESM
  preset: 'ts-jest/presets/default-esm',

  testEnvironment: 'node',

  // Karena tests kamu ada di dalam src/tests
  roots: ['<rootDir>/src/tests'],

  moduleFileExtensions: ['ts', 'js'],

  // Aktifkan ESM di ts-jest
  transform: { '^.+\\.tsx?$': ['ts-jest', { useESM: true, tsconfig: 'tsconfig.json' }] },

  // Beritahu Jest bahwa .ts diperlakukan sebagai ESM
  extensionsToTreatAsEsm: ['.ts'],

  // Trik penting: kalau import mengandung .js, hapuskan supaya bisa resolve ke .ts
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },

  verbose: true,

  // Test coverage configuration untuk TDD
  collectCoverage: false, // Default false, aktifkan dengan --coverage flag
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
    '!src/tests/**',
    '!src/generated/**',
    '!src/server.ts',
    '!src/app.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};

export default config;
