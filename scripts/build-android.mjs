/**
 * Local Android release build.
 *   node scripts/build-android.mjs          # signed release APK
 *   node scripts/build-android.mjs --aab    # Play Store bundle
 *   node scripts/build-android.mjs --debug  # debug APK (no signing needed)
 *
 * Handles the two things that trip up a local build on this machine:
 *
 *   1. JDK version. React Native's CMake/NDK tasks fail on JDK 22+ with
 *      "a restricted method in java.lang.System has been called" (JEP 472).
 *      Expo requires JDK 17, so we look for one rather than using whatever
 *      JAVA_HOME happens to point at — Android Studio ships a JDK 25 jbr.
 *
 *   2. Signing. Credentials are passed as ORG_GRADLE_PROJECT_* env vars so the
 *      keystore password never lands in a tracked file. The keystore itself is
 *      gitignored; regenerate it with the keytool command in README.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir, platform } from 'node:os';

const args = new Set(process.argv.slice(2));
const isWin = platform() === 'win32';
const ROOT = process.cwd();

/* ---------- 1. locate a JDK 17-21 ---------- */

const javaExe = (home) => join(home, 'bin', isWin ? 'java.exe' : 'java');

function javaMajor(home) {
  try {
    // `java -version` writes to STDERR, not stdout — capture both.
    const r = spawnSync(javaExe(home), ['-version'], { encoding: 'utf8' });
    const out = `${r.stderr || ''}${r.stdout || ''}`;
    // "17.0.20.1" -> 17, and old-style "1.8.0_392" -> 8
    const m = out.match(/version "(?:1\.)?(\d+)/);
    return m ? Number(m[1]) : null;
  } catch {
    return null;
  }
}

function findJdk() {
  const candidates = [];

  // JDKs Gradle has auto-provisioned (toolchain downloads)
  const gradleJdks = join(homedir(), '.gradle', 'jdks');
  if (existsSync(gradleJdks)) {
    for (const d of readdirSync(gradleJdks)) candidates.push(join(gradleJdks, d));
  }

  // common install locations
  for (const base of [
    'C:/Program Files/Eclipse Adoptium',
    'C:/Program Files/Java',
    'C:/Program Files/Microsoft',
    'C:/Program Files/Zulu',
    '/Library/Java/JavaVirtualMachines',
    '/usr/lib/jvm',
  ]) {
    if (!existsSync(base)) continue;
    for (const d of readdirSync(base)) {
      candidates.push(join(base, d));
      candidates.push(join(base, d, 'Contents', 'Home')); // macOS layout
    }
  }

  if (process.env.JAVA_HOME) candidates.push(process.env.JAVA_HOME);

  const usable = [];
  for (const c of candidates) {
    if (!existsSync(javaExe(c))) continue;
    const v = javaMajor(c);
    if (v && v >= 17 && v <= 21) usable.push({ home: c, v });
  }
  // prefer 17 — the version Expo documents
  usable.sort((a, b) => a.v - b.v);
  return usable[0] || null;
}

const jdk = findJdk();
if (!jdk) {
  const cur = process.env.JAVA_HOME ? `${process.env.JAVA_HOME} (Java ${javaMajor(process.env.JAVA_HOME)})` : 'unset';
  console.error(
    `\n✗ No JDK 17-21 found. JAVA_HOME is ${cur}.\n\n` +
      `  React Native's native (CMake/NDK) build fails on JDK 22+.\n` +
      `  Install one, e.g.:  winget install EclipseAdoptium.Temurin.17.JDK\n`
  );
  process.exit(1);
}
console.log(`› JDK ${jdk.v}: ${jdk.home}`);

/* ---------- 2. Android SDK ---------- */

const sdk =
  process.env.ANDROID_HOME ||
  process.env.ANDROID_SDK_ROOT ||
  (isWin ? join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk') : join(homedir(), 'Library/Android/sdk'));
if (!existsSync(sdk)) {
  console.error(`\n✗ Android SDK not found at ${sdk}. Set ANDROID_HOME.\n`);
  process.exit(1);
}
console.log(`› Android SDK: ${sdk}`);

/* ---------- 3. signing ---------- */

// Kept in credentials/ rather than android/app/ because android/ is generated
// and gitignored — a `prebuild --clean` would delete the signing key with it.
const keystore = join(ROOT, 'credentials', 'release.keystore');
const wantRelease = !args.has('--debug');
const env = { ...process.env, JAVA_HOME: jdk.home, ANDROID_HOME: sdk, ANDROID_SDK_ROOT: sdk };

if (wantRelease) {
  if (existsSync(keystore)) {
    // `storeFile file(...)` resolves relative to android/app, so point at ours
    env.ORG_GRADLE_PROJECT_SPLITLOCAL_STORE_FILE = keystore.replace(/\\/g, '/');
    env.ORG_GRADLE_PROJECT_SPLITLOCAL_STORE_PASSWORD = process.env.SPLITLOCAL_STORE_PASSWORD || 'splitlocal';
    env.ORG_GRADLE_PROJECT_SPLITLOCAL_KEY_ALIAS = process.env.SPLITLOCAL_KEY_ALIAS || 'splitlocal';
    env.ORG_GRADLE_PROJECT_SPLITLOCAL_KEY_PASSWORD = process.env.SPLITLOCAL_KEY_PASSWORD || 'splitlocal';
    console.log('› signing with credentials/release.keystore');
  } else {
    console.log('› no release.keystore — Gradle will fall back to the debug key (see README)');
  }
}

/* ---------- 4. build ---------- */

if (args.has('--check')) {
  console.log('\n(--check: environment looks good; not building)');
  process.exit(0);
}

if (!existsSync(join(ROOT, 'android'))) {
  console.log('\n› android/ missing, running prebuild');
  const pre = spawnSync('npx', ['expo', 'prebuild', '--platform', 'android'], {
    stdio: 'inherit',
    shell: true,
    env,
  });
  if (pre.status !== 0) process.exit(pre.status || 1);
}

const task = args.has('--debug')
  ? ':app:assembleDebug'
  : args.has('--aab')
    ? ':app:bundleRelease'
    : ':app:assembleRelease';

console.log(`\n› gradlew ${task}\n`);
// Use an absolute path: with shell:true on Windows a bare "gradlew.bat" is
// resolved against PATH rather than cwd, so it is "not recognized".
const gradlew = join(ROOT, 'android', isWin ? 'gradlew.bat' : 'gradlew');
const r = spawnSync(gradlew, [task, '--no-daemon'], {
  cwd: join(ROOT, 'android'),
  stdio: 'inherit',
  env,
  shell: isWin,
});
if (r.status !== 0) {
  console.error(`\n✗ Gradle failed (exit ${r.status}).`);
  process.exit(r.status || 1);
}

/* ---------- 5. report the artifact ---------- */

const out = args.has('--aab')
  ? join(ROOT, 'android/app/build/outputs/bundle/release/app-release.aab')
  : args.has('--debug')
    ? join(ROOT, 'android/app/build/outputs/apk/debug/app-debug.apk')
    : join(ROOT, 'android/app/build/outputs/apk/release/app-release.apk');

if (existsSync(out)) {
  const { statSync } = await import('node:fs');
  console.log(`\n✓ ${out}\n  ${(statSync(out).size / 1024 / 1024).toFixed(1)} MB`);
} else {
  console.log(`\n! build reported success but ${out} is missing`);
  process.exit(1);
}
