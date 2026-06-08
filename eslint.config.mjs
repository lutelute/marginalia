import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'release/**',
      'node_modules/**',
      'report-build-system/**',
      'build/**',
      '*.config.js',
      '*.config.ts',
      '*.config.mjs',
    ],
  },

  // TypeScript / React (renderer)
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // --- 既存コードベースの実態に合わせて warning に格下げ ---
      // Stage 2 のコンポーネント分割・リファクタリングで順次 error 化する（ラチェット方式）
      // no-explicit-any: 残りは IPC 境界 / サードパーティ AST(unist 等) / レガシー
      // データのパースなど本質的に動的な箇所が中心。warning 維持で個別に判断する。
      '@typescript-eslint/no-explicit-any': 'warn',
      // _ prefix の引数・変数、rest 分割代入での使い捨ては「意図的に未使用」の慣用句として許可
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      // 全箇所を型ガード / 早期 return で解消済み → error 維持（再発防止）
      '@typescript-eslint/no-non-null-assertion': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // rules-of-hooks は Stage 2-1 で全違反を修正済み → error 維持
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/error-boundaries': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/use-memo': 'warn',
      'react-hooks/incompatible-library': 'warn',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-useless-escape': 'warn',
    },
    languageOptions: {
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        localStorage: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        Blob: 'readonly',
        File: 'readonly',
        FileReader: 'readonly',
        CSS: 'readonly',
        getComputedStyle: 'readonly',
        ResizeObserver: 'readonly',
        MutationObserver: 'readonly',
        IntersectionObserver: 'readonly',
        HTMLElement: 'readonly',
        HTMLDivElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLTextAreaElement: 'readonly',
        KeyboardEvent: 'readonly',
        MouseEvent: 'readonly',
        Range: 'readonly',
        Selection: 'readonly',
        Node: 'readonly',
        NodeListOf: 'readonly',
        Element: 'readonly',
        atob: 'readonly',
        btoa: 'readonly',
        crypto: 'readonly',
        confirm: 'readonly',
        alert: 'readonly',
      },
    },
  },

  // Electron main process (CommonJS / Node)
  {
    files: ['electron/**/*.js', 'scripts/**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        require: 'readonly',
        module: 'writable',
        process: 'readonly',
        console: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        URL: 'readonly',
        Response: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-async-promise-executor': 'error',
    },
  },

  // Tests (ESM)
  {
    files: ['**/*.test.{ts,tsx,js,mjs}'],
    languageOptions: {
      sourceType: 'module',
      globals: {
        process: 'readonly',
        console: 'readonly',
      },
    },
    rules: {
      // テストは型安全性より可読性・簡潔さを優先（fixture への ! / any を許容）
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  prettier
);
