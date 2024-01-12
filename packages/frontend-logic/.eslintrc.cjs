module.exports = {
  overrides: [
    {
      files: [
        '**/*.{ts,tsx}'
      ],
      env: {
        'browser': true,
        'es6': true,
        'node': true
      },
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:react/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking'
      ],
      plugins: [
        '@typescript-eslint',
        'react'
      ],
      rules: {
        '@typescript-eslint/semi': [
          'error'
        ],
        '@typescript-eslint/explicit-function-return-type': 0,
        '@typescript-eslint/explicit-module-boundary-types': 0,
        '@typescript-eslint/restrict-template-expressions': 0,
        '@typescript-eslint/restrict-plus-operands': 0,
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
        'no-case-declarations': 0,
        'react/prop-types': 0,
        'react/react-in-jsx-scope': 0
      },
      settings: {
        react: {
          'pragma': 'React',
          'version': 'detect'
        }
      },
      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: [
          './tsconfig.json'
        ],
        tsconfigRootDir: __dirname
      }
    }
  ]
}