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
  // Las funciones se escriben con import/export (ver "type": "module" en
  // package.json). Este archivo lleva .cjs justamente por eso: es el único que
  // sigue siendo del formato viejo, porque ESLint lo carga con require.
  parserOptions: {
    "ecmaVersion": 2022,
    "sourceType": "module",
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
