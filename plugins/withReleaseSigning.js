/**
 * Config plugin: point the Android `release` build type at a real keystore.
 *
 * The generated `android/` directory is disposable — `expo prebuild --clean`
 * recreates it — so editing app/build.gradle by hand would silently lose the
 * signing config on the next prebuild. This applies it every time instead.
 *
 * Credentials come from gradle.properties (or the environment, via
 * ORG_GRADLE_PROJECT_* vars) so they are never committed in source. By default
 * Expo signs release builds with the *debug* keystore, which is fine for a
 * local test install but cannot be updated across installs or uploaded to Play.
 */
const { withAppBuildGradle } = require('@expo/config-plugins');

const SIGNING_CONFIG = `
        release {
            // Values come from gradle.properties / ORG_GRADLE_PROJECT_* env vars.
            // Falls back to the debug keystore so a fresh clone still builds.
            if (project.hasProperty('SPLITLOCAL_STORE_FILE')) {
                storeFile file(SPLITLOCAL_STORE_FILE)
                storePassword SPLITLOCAL_STORE_PASSWORD
                keyAlias SPLITLOCAL_KEY_ALIAS
                keyPassword SPLITLOCAL_KEY_PASSWORD
            } else {
                storeFile file('debug.keystore')
                storePassword 'android'
                keyAlias 'androiddebugkey'
                keyPassword 'android'
            }
        }
`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let src = cfg.modResults.contents;

    // 1. add a `release` signing config alongside the existing `debug` one
    if (!src.includes('SPLITLOCAL_STORE_FILE')) {
      const anchor = /(signingConfigs \{\n)/;
      if (!anchor.test(src)) {
        throw new Error('withReleaseSigning: could not find signingConfigs block');
      }
      src = src.replace(anchor, `$1${SIGNING_CONFIG}`);
    }

    // 2. point the *release build type* at it.
    //
    // This must be scoped to the buildTypes block. Matching `release {` across
    // the whole file also hits the `release {}` we just added inside
    // signingConfigs, and the following `signingConfig signingConfigs.debug`
    // then belongs to the DEBUG build type — silently swapping the two, which
    // yields a debug-signed release APK.
    const buildTypes = src.match(/buildTypes \{[\s\S]*?\n {4}\}/);
    if (!buildTypes) {
      throw new Error('withReleaseSigning: could not find buildTypes block');
    }
    const patched = buildTypes[0].replace(
      /(release \{[\s\S]*?)signingConfig signingConfigs\.debug/,
      '$1signingConfig signingConfigs.release'
    );
    if (!/release \{[\s\S]*?signingConfig signingConfigs\.release/.test(patched)) {
      throw new Error('withReleaseSigning: could not repoint the release signingConfig');
    }
    // guard against the inverse mistake ever shipping again
    if (/debug \{\s*signingConfig signingConfigs\.release/.test(patched)) {
      throw new Error('withReleaseSigning: patched the debug build type by mistake');
    }
    src = src.replace(buildTypes[0], patched);

    cfg.modResults.contents = src;
    return cfg;
  });
};
