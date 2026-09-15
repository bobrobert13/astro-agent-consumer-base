import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';
import vue from 'eslint-plugin-vue';
import vueParser from 'vue-eslint-parser';
import globals from 'globals';

/**
 * Config plano, mismo patrón que el proyecto Astro precedente del equipo
 * (`js.configs.recommended` + `astro.configs.recommended` + un bloque `*.vue`
 * con `vue-eslint-parser`), con dos diferencias necesarias en Astro 7:
 *
 * 1. `eslint-plugin-astro@3` declara como peers `typescript-eslint` y
 *    `@typescript-eslint/parser`; sin ellos el plugin no puede parsear el
 *    bloque `<script>` de un `.astro`.
 * 2. NO se instala `eslint-plugin-jsx-a11y`: su peer llega solo hasta ESLint 9
 *    y choca con ESLint 10. Solo lo necesitaría
 *    `astro.configs['jsx-a11y-recommended']`, que aquí no se usa.
 *
 * Se usa `tseslint.configs.recommended` (no la variante *type-checked*):
 * `astro sync` ya genera los tipos que interesan y exigir program graph hace
 * que cada `.astro`/`.vue` tenga que resolver el tsconfig completo.
 */
export default [
  {
    ignores: [
      'dist/**',
      '.astro/**',
      'public/**',
      'node_modules/**',
      'release/**',
      'coverage/**',
      'src/env.d.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node, ...globals.es2024 },
    },
  },
  {
    // Los `.cjs` de Electron (preload) **tienen** que ser CommonJS: un preload
    // sandboxeado no acepta ESM. Aquí `require` no es un estilo a evitar, es el
    // único mecanismo disponible.
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['**/*.astro'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.vue'],
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: { ...globals.browser },
    },
    plugins: { vue },
    rules: {
      ...vue.configs['flat/essential'].rules,
      // Un componente de isla siempre se nombra con dos palabras: `Chat`, `App` o
      // `Item` colisionan con etiquetas HTML y hacen el árbol ilegible.
      'vue/multi-word-component-names': 'error',
      // `verbatimModuleSyntax` está activo en el tsconfig; el rule de Vue puede
      // llegar a pedir lo contrario en SFCs con `defineProps<T>()`.
      'vue/define-macros-order': ['error', { order: ['defineOptions', 'defineProps', 'defineEmits', 'defineSlots'] }],
    },
  },
];
