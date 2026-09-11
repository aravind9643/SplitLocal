/**
 * Config plugin: make local Gradle builds substantially faster.
 *
 * The dominant cost in a React Native release build is compiling C++ (Hermes,
 * Reanimated, gesture-handler, expo-modules-core, the app's own JNI) once per
 * ABI. The template ships four ABIs, so ~75% of native compile time produces
 * slices that a given device will never run.
 *
 * Nothing here changes what ships: `npm run android:aab` still emits all four
 * ABIs for Play. It only affects local builds, where the defaults are
 * conservative.
 */
const { withGradleProperties } = require('@expo/config-plugins');

/** Replace a property if present, otherwise append it. */
function set(props, key, value) {
  const found = props.find((p) => p.type === 'property' && p.key === key);
  if (found) found.value = value;
  else props.push({ type: 'property', key, value });
}

module.exports = function withFastBuilds(config) {
  return withGradleProperties(config, (cfg) => {
    const p = cfg.modResults;

    // The daemon's default 2 GB forces GC churn on a build this size. The
    // Gradle+Kotlin daemons and the C++ toolchain are the memory hogs.
    set(p, 'org.gradle.jvmargs', '-Xmx4096m -XX:MaxMetaspaceSize=1024m');

    // Reuse task outputs across builds, not just within one.
    set(p, 'org.gradle.caching', 'true');
    set(p, 'org.gradle.parallel', 'true');
    // Skip configuring tasks that aren't needed for the requested task.
    set(p, 'org.gradle.configureondemand', 'true');

    // Shrink release builds. Expo leaves both off by default, which leaves
    // ~7.5 MB of unshrunk DEX and every unused resource in the APK.
    // R8 strips unreachable Java/Kotlin; shrinkResources drops unreferenced
    // drawables/layouts pulled in by libraries.
    //
    // NB: the property is `enableMinifyInReleaseBuilds` — the older RN name
    // `enableProguardInReleaseBuilds` is not read by the Expo 57 template, and
    // setting it alone makes shrinkResources fail with "Removing unused
    // resources requires unused code shrinking to be turned on".
    set(p, 'android.enableMinifyInReleaseBuilds', 'true');
    set(p, 'android.enableShrinkResourcesInReleaseBuilds', 'true');

    return cfg;
  });
};
