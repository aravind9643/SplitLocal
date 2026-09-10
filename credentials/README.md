# Signing keys

This folder holds the Android release keystore. It is gitignored on purpose --
losing or leaking it means you can never ship an update to the same app.

Back up elease.keystore somewhere safe (password manager / private storage).

Regenerate (only for a brand-new app identity):

    keytool -genkeypair -v -storetype PKCS12 -keystore credentials/release.keystore `n      -alias splitlocal -keyalg RSA -keysize 2048 -validity 10950

Override the default passwords at build time:

    SPLITLOCAL_STORE_PASSWORD=... SPLITLOCAL_KEY_PASSWORD=... npm run android:apk

