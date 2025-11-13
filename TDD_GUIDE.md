# Panduan Test-Driven Development (TDD) untuk SAR-BE

## 🎯 Apa itu TDD?

**Test-Driven Development (TDD)** adalah metodologi pengembangan di mana Anda menulis test **SEBELUM** menulis kode implementasi. Siklus TDD terdiri dari 3 tahap:

1. **🔴 RED**: Tulis test yang gagal (test menulis requirement yang belum ada)
2. **🟢 GREEN**: Tulis kode minimal untuk membuat test pass
3. **🔵 REFACTOR**: Perbaiki kode tanpa mengubah behavior (test tetap pass)

## 📋 Workflow TDD

### Siklus Red-Green-Refactor

```
┌─────────┐
│  RED    │ → Tulis test, pastikan gagal
└────┬────┘
     │
     ▼
┌─────────┐
│ GREEN   │ → Tulis kode minimal, pastikan test pass
└────┬────┘
     │
     ▼
┌─────────┐
│ REFACTOR│ → Perbaiki kode (clean, optimize, remove duplication)
└────┬────┘
     │
     └───► Repeat untuk fitur berikutnya
```

## 🛠️ Setup untuk TDD di Project Ini

### 1. Menjalankan Test dalam Watch Mode

Untuk development aktif dengan TDD, gunakan watch mode yang akan otomatis re-run test saat file berubah:

```bash
# Watch mode untuk semua test
pnpm run test:watch

# Watch mode hanya untuk unit test
pnpm run test:watch:unit

# Watch mode dengan coverage (untuk TDD workflow)
pnpm run test:tdd
```

### 2. Struktur File Test

Ikuti konvensi naming yang sudah ada:
- **Unit test**: `*.spec.ts` atau `*.test.ts` di `src/tests/unit/`
- **Integration test**: `*.spec.ts` di `src/tests/integration/`

Contoh struktur:
```
src/
├── modules/
│   └── feature/
│       ├── feature.service.ts      ← Implementasi
│       └── feature.repository.ts
└── tests/
    ├── unit/
    │   └── feature.service.spec.ts ← Unit test
    └── integration/
        └── feature.api.spec.ts     ← Integration test
```

## 📝 Contoh Praktis: Implementasi TDD

### Contoh: Membuat Fitur Validasi Email

#### Step 1: 🔴 RED - Tulis Test Terlebih Dahulu

Buat file `src/tests/unit/email.validator.spec.ts`:

```typescript
import { emailValidator } from '../../utils/emailValidator';

describe('emailValidator', () => {
  describe('validateEmail', () => {
    it('should return true for valid email', () => {
      expect(emailValidator.validateEmail('user@example.com')).toBe(true);
      expect(emailValidator.validateEmail('test.user@domain.co.id')).toBe(true);
    });

    it('should return false for invalid email', () => {
      expect(emailValidator.validateEmail('invalid-email')).toBe(false);
      expect(emailValidator.validateEmail('@domain.com')).toBe(false);
      expect(emailValidator.validateEmail('user@')).toBe(false);
    });

    it('should validate email domain must be @toyota.co.id', () => {
      expect(emailValidator.validateEmail('user@toyota.co.id')).toBe(true);
      expect(emailValidator.validateEmail('user@gmail.com')).toBe(false);
    });
  });
});
```

**Jalankan test**: `pnpm run test:watch:unit`

Test akan **GAGAL** karena `emailValidator` belum ada ✅ (ini yang kita inginkan!)

#### Step 2: 🟢 GREEN - Tulis Kode Minimal

Buat file `src/utils/emailValidator.ts`:

```typescript
export const emailValidator = {
  validateEmail(email: string): boolean {
    if (!email || !email.includes('@')) {
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return false;
    }
    
    // Domain harus @toyota.co.id
    return email.endsWith('@toyota.co.id');
  }
};
```

**Jalankan test lagi**: Test sekarang harus **PASS** ✅

#### Step 3: 🔵 REFACTOR - Perbaiki Kode

Sekarang perbaiki kode tanpa mengubah behavior:

```typescript
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REQUIRED_DOMAIN = '@toyota.co.id';

export const emailValidator = {
  validateEmail(email: string): boolean {
    if (!email?.includes('@')) {
      return false;
    }
    
    if (!EMAIL_REGEX.test(email)) {
      return false;
    }
    
    return email.endsWith(REQUIRED_DOMAIN);
  }
};
```

**Pastikan test masih PASS** ✅

## 🎯 Best Practices untuk TDD di Project Ini

### 1. Mulai dari Test Terkecil

Tulis test untuk satu behavior pada satu waktu:

```typescript
// ✅ BAIK: Test spesifik, satu behavior
it('should throw error when username is empty', async () => {
  await expect(service.createUser('', 'password')).rejects.toThrow();
});

// ❌ BURUK: Test terlalu kompleks, multiple behaviors
it('should handle user creation with all validations', async () => {
  // terlalu banyak assertion dalam satu test
});
```

### 2. Gunakan Descriptive Test Names

```typescript
// ✅ BAIK: Jelas apa yang di-test
describe('authService.login', () => {
  it('should return token when credentials are valid', async () => {
    // ...
  });

  it('should throw AUTH-ERR-001 when password is incorrect', async () => {
    // ...
  });

  it('should lock account after 5 failed attempts', async () => {
    // ...
  });
});

// ❌ BURUK: Tidak jelas
it('test login', async () => {
  // ...
});
```

### 3. Arrange-Act-Assert Pattern

```typescript
it('should calculate total price correctly', () => {
  // Arrange: Setup test data
  const items = [
    { price: 100, quantity: 2 },
    { price: 50, quantity: 3 }
  ];

  // Act: Execute the function
  const total = calculateTotal(items);

  // Assert: Verify the result
  expect(total).toBe(350);
});
```

### 4. Mock External Dependencies

```typescript
import { userRepository } from '../../modules/auth/user.repository';

jest.mock('../../modules/auth/user.repository');

describe('authService', () => {
  it('should call repository with correct parameters', async () => {
    const mockLogin = jest.fn().mockResolvedValue({ username: 'user' });
    (userRepository.login as jest.Mock) = mockLogin;

    await authService.login(app, 'user', 'pass', 'req-1');

    expect(mockLogin).toHaveBeenCalledWith('user');
  });
});
```

### 5. Test Behavior, Not Implementation

```typescript
// ✅ BAIK: Test behavior (output/result)
it('should return user data when login succeeds', async () => {
  const result = await authService.login(app, 'user', 'pass', 'req-1');
  expect(result.token).toBeDefined();
  expect(result.user.username).toBe('user');
});

// ❌ BURUK: Test implementation details
it('should call safeCompare function', async () => {
  // jangan test internal implementation
});
```

## 📊 Test Coverage

Gunakan coverage untuk memastikan tidak ada bagian kode yang terlewat:

```bash
# Generate coverage report
pnpm run test:coverage

# Coverage untuk unit test saja
pnpm run test:coverage:unit
```

Coverage report akan tersedia di folder `coverage/`. Buka `coverage/index.html` di browser untuk melihat detail.

## 🔄 Workflow Development dengan TDD

### Untuk Fitur Baru:

1. **Tulis test pertama** → Run test → Pastikan gagal (RED)
2. **Tulis implementasi minimal** → Run test → Pastikan pass (GREEN)
3. **Refactor** → Run test → Pastikan tetap pass
4. **Tambah test case berikutnya** → Ulangi siklus

### Untuk Bug Fix:

1. **Tulis test yang reproduces bug** → Run test → Pastikan gagal (RED)
2. **Fix bug** → Run test → Pastikan pass (GREEN)
3. **Refactor jika perlu**

## 🚀 Tips untuk Memulai TDD

1. **Mulai dari yang kecil**: Test fungsi sederhana dulu
2. **Gunakan watch mode**: `pnpm run test:watch` untuk feedback cepat
3. **Satu test pada satu waktu**: Jangan menulis banyak test sekaligus
4. **Commit sering**: Commit setelah setiap siklus green
5. **Jangan khawatir tentang coverage awal**: Fokus pada behavior yang penting

## 📚 Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [TDD by Example (Kent Beck)](https://www.amazon.com/Test-Driven-Development-Kent-Beck/dp/0321146530)
- [Clean Code - Robert C. Martin](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882)

## ❓ FAQ

**Q: Apakah semua kode harus di-test?**  
A: Tidak perlu 100%, tapi fokus pada business logic dan critical paths. Coverage threshold di project ini adalah 70%.

**Q: Bagaimana dengan test yang sudah ada?**  
A: Test yang sudah ada tetap valid. Mulai terapkan TDD untuk fitur baru atau saat refactoring.

**Q: Apakah harus TDD untuk semua fitur?**  
A: Idealnya ya, tapi praktisnya gunakan TDD untuk:
- Business logic yang kompleks
- Fitur kritis (auth, payment, dll)
- Bug fixes
- Refactoring

**Q: Integration test juga pakai TDD?**  
A: Bisa, tapi biasanya dimulai dengan unit test dulu. Integration test untuk memastikan komponen bekerja bersama.

---

**Happy Testing! 🧪✨**

