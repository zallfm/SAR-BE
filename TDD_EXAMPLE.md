# Contoh Praktis: Implementasi TDD untuk Fitur Baru

Dokumen ini menunjukkan contoh lengkap implementasi TDD untuk fitur baru di project SAR-BE.

## 🎯 Skenario: Menambahkan Fitur Password Validator

Kita akan membuat validator untuk memvalidasi password dengan requirements:
- Minimum 8 karakter
- Harus mengandung huruf besar
- Harus mengandung huruf kecil
- Harus mengandung angka
- Harus mengandung special character

### Step 1: 🔴 RED - Tulis Test Terlebih Dahulu

Buat file `src/tests/unit/password.validator.spec.ts`:

```typescript
import { passwordValidator } from '../../utils/passwordValidator';

describe('passwordValidator', () => {
  describe('validatePassword', () => {
    it('should return true for valid password', () => {
      const result = passwordValidator.validatePassword('Password123!');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return false when password is too short', () => {
      const result = passwordValidator.validatePassword('Pass1!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters');
    });

    it('should return false when password missing uppercase', () => {
      const result = passwordValidator.validatePassword('password123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should return false when password missing lowercase', () => {
      const result = passwordValidator.validatePassword('PASSWORD123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should return false when password missing number', () => {
      const result = passwordValidator.validatePassword('Password!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should return false when password missing special character', () => {
      const result = passwordValidator.validatePassword('Password123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should return multiple errors for password with multiple issues', () => {
      const result = passwordValidator.validatePassword('pass');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });
});
```

**Jalankan test**: `pnpm run test:watch:unit`

Test akan **GAGAL** karena `passwordValidator` belum ada ✅

### Step 2: 🟢 GREEN - Tulis Implementasi Minimal

Buat file `src/utils/passwordValidator.ts`:

```typescript
export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

export const passwordValidator = {
  validatePassword(password: string): PasswordValidationResult {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
};
```

**Jalankan test lagi**: Semua test sekarang harus **PASS** ✅

### Step 3: 🔵 REFACTOR - Perbaiki Kode

Sekarang kita bisa refactor untuk membuat kode lebih maintainable:

```typescript
export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

interface ValidationRule {
  test: RegExp;
  message: string;
}

const VALIDATION_RULES: ValidationRule[] = [
  {
    test: /.{8,}/,
    message: 'Password must be at least 8 characters'
  },
  {
    test: /[A-Z]/,
    message: 'Password must contain at least one uppercase letter'
  },
  {
    test: /[a-z]/,
    message: 'Password must contain at least one lowercase letter'
  },
  {
    test: /[0-9]/,
    message: 'Password must contain at least one number'
  },
  {
    test: /[!@#$%^&*(),.?":{}|<>]/,
    message: 'Password must contain at least one special character'
  }
];

export const passwordValidator = {
  validatePassword(password: string): PasswordValidationResult {
    const errors = VALIDATION_RULES
      .filter(rule => !rule.test.test(password))
      .map(rule => rule.message);

    return {
      isValid: errors.length === 0,
      errors
    };
  }
};
```

**Pastikan test masih PASS** ✅

---

## 🎯 Contoh 2: TDD untuk Service Method (Mengikuti Pola Project)

### Skenario: Menambahkan Method `validateUser` di `authService`

### Step 1: 🔴 RED - Tulis Test

Tambahkan test di `src/tests/unit/auth.service.spec.ts`:

```typescript
import { buildApp } from '../../app';
import { authService } from '../../modules/auth/auth.service';
import { ApplicationError } from '../../core/errors/applicationError';
import { ERROR_CODES } from '../../core/errors/errorCodes';

describe('authService', () => {
  // ... existing tests ...

  describe('validateUser', () => {
    it('should return user data when username exists', async () => {
      const app = await buildApp();
      const result = await authService.validateUser('admin');
      
      expect(result).toBeDefined();
      expect(result.username).toBe('admin');
    });

    it('should throw error when username does not exist', async () => {
      const app = await buildApp();
      
      await expect(
        authService.validateUser('nonexistent')
      ).rejects.toThrow(ApplicationError);
      
      await expect(
        authService.validateUser('nonexistent')
      ).rejects.toHaveProperty('code', ERROR_CODES.AUTH_USER_NOT_FOUND);
    });

    it('should throw error when username is empty', async () => {
      const app = await buildApp();
      
      await expect(
        authService.validateUser('')
      ).rejects.toThrow(ApplicationError);
    });
  });
});
```

**Jalankan test**: Test akan gagal karena method belum ada ✅

### Step 2: 🟢 GREEN - Implementasi Minimal

Tambahkan method di `src/modules/auth/auth.service.ts`:

```typescript
export const authService = {
  // ... existing methods ...

  async validateUser(username: string) {
    if (!username || username.trim() === '') {
      throw new ApplicationError(
        ERROR_CODES.AUTH_INVALID_CREDENTIALS,
        'Username is required',
        {},
        undefined,
        400
      );
    }

    const user = await userRepository.getProfile(username);
    
    if (!user) {
      throw new ApplicationError(
        ERROR_CODES.AUTH_USER_NOT_FOUND,
        ERROR_MESSAGES[ERROR_CODES.AUTH_USER_NOT_FOUND],
        { username },
        undefined,
        404
      );
    }

    return user;
  }
};
```

**Jalankan test**: Test harus pass ✅

### Step 3: 🔵 REFACTOR

Jika perlu, bisa refactor untuk menggunakan helper function atau improve error handling.

---

## 📋 Checklist untuk TDD Workflow

- [ ] **RED**: Test ditulis dan gagal (fungsi belum ada)
- [ ] **GREEN**: Implementasi minimal ditulis, test pass
- [ ] **REFACTOR**: Kode diperbaiki, test tetap pass
- [ ] Test coverage memadai (>70%)
- [ ] Test names deskriptif dan jelas
- [ ] Test mengikuti Arrange-Act-Assert pattern
- [ ] Dependencies di-mock dengan benar
- [ ] Edge cases ditangani

---

## 🚀 Tips untuk TDD di Project Ini

1. **Ikuti pola existing**: Lihat struktur test yang sudah ada (`auth.service.spec.ts`, dll)
2. **Gunakan mock untuk repository**: Mock `userRepository`, `logRepository`, dll
3. **Test error cases**: Pastikan semua error codes di-test
4. **Integration test untuk API**: Gunakan `createTestApp()` untuk integration test
5. **Commit setelah setiap green**: Commit setelah setiap siklus berhasil

---

