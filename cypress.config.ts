import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:7510/',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    // experimentalSessionAndOrigin: true,
    pageLoadTimeout: 600000,
    defaultCommandTimeout: 10000,
    testIsolation: false,
    viewportWidth: 1366,
    viewportHeight: 768,
    reporter: 'cypress-multi-reporters',
    reporterOptions: {
      configFile: 'reporter-config.json',
    },
    chromeWebSecurity: false,
    video: true,
    screenshotOnRunFailure: true,
  },
});
