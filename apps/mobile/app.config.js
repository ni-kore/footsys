// Expo config. Everything static lives in app.json; this file only makes the
// web base URL configurable at build time.
//
// baseUrl is the path the site is served from:
//   - GitHub Pages serves under /footsys/, so the Pages workflow builds with
//     EXPO_BASE_URL=/footsys.
//   - The Docker image (Unraid, NAS, VPS) serves from the domain root, so no
//     base path is set there and assets resolve at "/".
//
// Expo loads app.json first and passes it in as `config`.
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    baseUrl: process.env.EXPO_BASE_URL ?? '',
  },
});
