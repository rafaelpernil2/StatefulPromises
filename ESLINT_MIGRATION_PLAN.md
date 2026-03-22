# ESLint 6 → 10 Migration Plan

This guide covers migrating from ESLint 6 with the legacy `.eslintrc.json` config to ESLint 10 with flat config (`eslint.config.js`). It assumes a TypeScript project using Prettier integration.

## Prerequisites

- Node.js version compatible with ESLint 10
- A working project with ESLint 6, TypeScript 3.x, and `.eslintrc.json`

## Step 1: Uninstall old packages

Remove all ESLint-related packages and deprecated tooling:

```bash
npm uninstall eslint \
  @typescript-eslint/eslint-plugin \
  @typescript-eslint/eslint-plugin-tslint \
  @typescript-eslint/parser \
  eslint-config-prettier \
  eslint-plugin-prettier \
  prettier \
  tslint \
  typescript
```

**Why remove `tslint` and `@typescript-eslint/eslint-plugin-tslint`?**
TSLint has been deprecated since 2019. The `eslint-plugin-tslint` bridge package is also deprecated and incompatible with ESLint 9+. All TSLint rules have equivalents in `@typescript-eslint`.

**Why remove `typescript`?**
`@typescript-eslint` v8 (required for ESLint 10) needs TypeScript >=4.8.4. If you're on TypeScript 3.x, it must be upgraded together.

## Step 2: Install new packages

```bash
npm install --save-dev \
  eslint@10 \
  typescript-eslint@latest \
  eslint-config-prettier@latest \
  eslint-plugin-prettier@latest \
  prettier@3 \
  typescript@5
```

**Key change:** The `typescript-eslint` package replaces the three separate packages (`@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/eslint-plugin-tslint`). It bundles the parser and plugin together.

## Step 3: Update `@types/node` if needed

If your `@types/node` version is old (e.g., v12), it will be incompatible with TypeScript 5:

```
error TS2320: Interface 'Buffer' cannot simultaneously extend types 'Uint8Array<ArrayBuffer>' and 'Uint8Array<ArrayBufferLike>'.
```

Fix:

```bash
npm install --save-dev @types/node@20
```

## Step 4: Delete `.eslintrc.json`

ESLint 10 no longer supports the legacy config format. Delete it:

```bash
rm .eslintrc.json
```

## Step 5: Create `eslint.config.js` (flat config)

Create a new `eslint.config.js` in the project root. Here's how to translate the key concepts:

### Flat config structure

```js
const tseslint = require("typescript-eslint");
const eslintConfigPrettier = require("eslint-config-prettier");
const eslintPluginPrettier = require("eslint-plugin-prettier/recommended");

module.exports = tseslint.config(
  // Ignored paths (replaces .eslintignore and the old "ignorePatterns")
  {
    ignores: ["lib/**", "node_modules/**"],
  },

  // Replaces "extends": ["plugin:@typescript-eslint/recommended", "plugin:@typescript-eslint/recommended-requiring-type-checking"]
  ...tseslint.configs.recommendedTypeChecked,

  // Replaces "extends": ["plugin:prettier/recommended"]
  eslintConfigPrettier,
  eslintPluginPrettier,

  // Your custom rules
  {
    languageOptions: {
      parserOptions: {
        project: "tsconfig.json",
        sourceType: "module",
      },
    },
    rules: {
      // Your rules here (see mapping below)
    },
  }
);
```

### Key differences from `.eslintrc.json`

| Legacy (`.eslintrc.json`)                    | Flat config (`eslint.config.js`)                  |
|----------------------------------------------|---------------------------------------------------|
| `"parser": "@typescript-eslint/parser"`       | Handled by `tseslint.configs.recommendedTypeChecked` |
| `"plugins": ["@typescript-eslint"]`          | Handled by `tseslint.configs.recommendedTypeChecked` |
| `"extends": [...]`                           | Spread configs directly in the array               |
| `"env": { "node": true, "es6": true }`       | Removed — ESLint 10 uses `languageOptions.globals` if needed |
| `"parserOptions": { ... }`                   | `languageOptions: { parserOptions: { ... } }`     |
| `"ignorePatterns"` / `.eslintignore`         | `{ ignores: [...] }` object in config array        |

### Rule name changes

Some rules were renamed or removed between ESLint 6 and 10:

| Old rule                                      | New rule / action                     |
|-----------------------------------------------|---------------------------------------|
| `id-blacklist`                                | `id-denylist`                         |
| `@typescript-eslint/interface-name-prefix`     | Removed (drop it)                     |
| `@typescript-eslint/no-parameter-properties`   | Removed (drop it)                     |
| `@typescript-eslint/indent`                   | Removed — use Prettier instead        |
| `@typescript-eslint/member-delimiter-style`    | Removed — use Prettier instead        |
| `@typescript-eslint/quotes`                   | Removed — use Prettier instead        |
| `@typescript-eslint/semi`                     | Removed — use Prettier instead        |
| `@typescript-eslint/type-annotation-spacing`   | Removed — use Prettier instead        |
| Formatting rules (`arrow-parens`, `comma-dangle`, `eol-last`, `new-parens`, `no-extra-semi`, `no-trailing-spaces`, `no-multiple-empty-lines`, `no-irregular-whitespace`, `newline-per-chained-call`, `quote-props`, `space-before-function-paren`, `space-in-parens`, `linebreak-style`) | Removed — all handled by Prettier |

**General rule:** Any rule that deals with formatting/whitespace/spacing should be dropped and handled by Prettier instead.

## Step 6: Update Prettier config

Add `endOfLine: "auto"` to your Prettier config to avoid CRLF issues on Windows:

```json
"prettier": {
  "printWidth": 180,
  "trailingComma": "none",
  "singleQuote": true,
  "endOfLine": "auto"
}
```

## Step 7: Update `package.json` scripts

The `-c`, `--ext`, and config file flags are removed in ESLint 10. The flat config is auto-discovered.

**Before:**

```json
"lint": "eslint -c .eslintrc.json --ext .ts src/**/*.ts",
"format": "eslint --fix -c .eslintrc.json --ext .ts src/{,**/}*.ts"
```

**After:**

```json
"lint": "eslint src/",
"format": "eslint --fix src/"
```

File filtering is now handled in `eslint.config.js` via the `files` and `ignores` properties. By default, `typescript-eslint` handles `.ts` files.

## Step 8: Fix TypeScript 5 type errors

TypeScript 5 is stricter than TypeScript 3. Common issues:

### `catch` clause variables are `unknown` (not `any`)

**Before (TS3):**

```ts
} catch (error) {
  expect(error.message).to.eql("...");
}
```

**After (TS5):**

```ts
} catch (error) {
  expect((error as Error).message).to.eql("...");
}
```

### New `@typescript-eslint` rules may flag existing code

The newer `@typescript-eslint` rules are stricter. For example, `@typescript-eslint/no-unsafe-argument` flags spreading `any[]` arrays. For intentional uses, add a targeted disable comment:

```ts
// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
someFunction(...anyArray);
```

## Step 9: Run and verify

```bash
# Auto-fix formatting issues from the Prettier upgrade
npx eslint --fix src/

# Verify lint passes
npx eslint src/

# Verify build
npm run build

# Verify tests
npm test
```

## Checklist

- [ ] Uninstall old packages (`eslint`, `@typescript-eslint/*`, `tslint`, `eslint-config-prettier`, `eslint-plugin-prettier`, `prettier`, `typescript`)
- [ ] Install new packages (`eslint@10`, `typescript-eslint`, `eslint-config-prettier`, `eslint-plugin-prettier`, `prettier@3`, `typescript@5`)
- [ ] Update `@types/node` if on an old version
- [ ] Delete `.eslintrc.json`
- [ ] Create `eslint.config.js` with flat config format
- [ ] Remove deprecated/renamed rules
- [ ] Drop formatting rules (Prettier handles them)
- [ ] Rename `id-blacklist` → `id-denylist`
- [ ] Add `endOfLine: "auto"` to Prettier config
- [ ] Update `lint` and `format` scripts in `package.json`
- [ ] Fix TypeScript 5 type errors (`unknown` catch clauses, etc.)
- [ ] Suppress new lint errors on intentional patterns
- [ ] Run `eslint --fix src/` to auto-fix formatting
- [ ] Verify: lint, build, and tests all pass
