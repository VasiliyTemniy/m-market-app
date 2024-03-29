module.exports = {
  overrides: [
    {
      files: [
        '**/*.{ts,tsx}'
      ],
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking'
      ],
      plugins: [
        '@typescript-eslint'
      ],
      env: {
        'commonjs': true,
        'es2021': true,
        'node': true
      },
      rules: {
        '@typescript-eslint/semi': [
          'error'
        ],
        '@typescript-eslint/explicit-function-return-type': 0,
        '@typescript-eslint/explicit-module-boundary-types': 0,
        '@typescript-eslint/restrict-template-expressions': 0,
        '@typescript-eslint/restrict-plus-operands': 0,
        '@typescript-eslint/no-base-to-string': 0,
        '@typescript-eslint/no-unsafe-member-access': 0,
        '@typescript-eslint/no-unused-vars': [
          'error',
          {
            'argsIgnorePattern': '^_',
            'varsIgnorePattern': '^_',
            'caughtErrorsIgnorePattern': '^_'
          }
        ],
        '@typescript-eslint/no-explicit-any': 1,
        'no-useless-escape': 0,
        'no-case-declarations': 0
      },
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 12,
        sourceType: 'module',
        project: [
          './tsconfig.json'
        ],
        tsconfigRootDir: __dirname
      }
    }
  ]
}