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

  verbose: true
};

export default config;
