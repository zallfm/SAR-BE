# SAR Auth BE (Fastify + TS)

## Setup
1. Salin `.env.example` menjadi `.env` atau gunakan ENV langsung.
2. Install deps:
   ```bash
   npm i
   ```

## Testing

### Menjalankan Test

```bash
# Semua test
pnpm run test

# Unit test saja
pnpm run test:unit

# Integration test saja
pnpm run test:integration

# Watch mode (untuk TDD)
pnpm run test:watch

# Watch mode untuk unit test
pnpm run test:watch:unit

# Test dengan coverage report
pnpm run test:coverage

# TDD workflow (watch + coverage)
pnpm run test:tdd
```

### Test-Driven Development (TDD)

Project ini mendukung **Test-Driven Development (TDD)**. Untuk mempelajari cara menerapkan TDD di project ini, baca:

- **[TDD_GUIDE.md](./TDD_GUIDE.md)** - Panduan lengkap TDD workflow
- **[TDD_EXAMPLE.md](./TDD_EXAMPLE.md)** - Contoh praktis implementasi TDD

### Quick Start TDD

1. Jalankan test dalam watch mode:
   ```bash
   pnpm run test:tdd
   ```

2. Tulis test terlebih dahulu (🔴 RED)
3. Tulis implementasi minimal (🟢 GREEN)
4. Refactor kode (🔵 REFACTOR)
5. Ulangi untuk fitur berikutnya

Lihat [TDD_GUIDE.md](./TDD_GUIDE.md) untuk detail lengkap.
