import { defineConfig } from 'vitest/config';

// Suite que corre contra el emulador de Firestore.
// Se lanza con `npm run test:rules`, que levanta el emulador vía firebase-tools.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.js'],
    // El emulador arranca en frío y las reglas se recargan por archivo.
    testTimeout: 20_000,
    hookTimeout: 30_000,
    // Los tests comparten una sola instancia de emulador: sin paralelismo entre archivos.
    fileParallelism: false,
  },
});
