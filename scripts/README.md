# TDD Documentation Generator

Script untuk auto-generate TDD documentation dari route files.

## Usage

### Generate sekali
```bash
npm run tdd:generate
```

### Watch mode (auto-generate saat ada perubahan)
```bash
npm run tdd:watch
```

## How it works

1. **Scan Routes**: Script akan scan semua file `*.routes.ts` di folder `src/api/`
2. **Extract Functions**: Extract method, path, dan function name dari setiap route
3. **Generate/Update Docs**: Generate atau update file JSON di `tdd-docs/src/data/`
4. **Preserve Existing**: Jika file sudah ada, akan preserve test scenarios, todos, dan BDD scenarios yang sudah dibuat

## Integration

Generator bisa diintegrasikan dengan:
- Pre-commit hook
- CI/CD pipeline
- Watch mode saat development

## Customization

Edit `scripts/generate-tdd-docs.ts` untuk:
- Customize module metadata
- Change output format
- Add custom test scenarios template

