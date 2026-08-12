module.exports = {
  // compartido/ es una COPIA GENERADA de las cuentas de las facturas
  // (src/Components/ClienteDetalle/facturaCalculos.js). El original ya se
  // revisa con el ESLint del frontend, que es donde se edita; revisarlo otra
  // vez acá no agrega nada y encima falla, porque este ESLint está en una
  // versión del lenguaje anterior a la que usa la app.
  ignorePatterns: ["compartido/"],
  env: {
    es6: true,
    node: true,
  },
  parserOptions: {
    "ecmaVersion": 2018,
  },
  extends: [
    "eslint:recommended",
    "google",
  ],
  rules: {
    "no-restricted-globals": ["error", "name", "length"],
    "prefer-arrow-callback": "error",
    "quotes": ["error", "double", {"allowTemplateLiterals": true}],
  },
  overrides: [
    {
      files: ["**/*.spec.*"],
      env: {
        mocha: true,
      },
      rules: {},
    },
  ],
  globals: {},
};
