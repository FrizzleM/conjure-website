/*
 * Where every download button on the site points.
 *
 * Publishing a release on this repository fills these in by itself.
 * .github/workflows/download-links.yml takes the release GitHub marks Latest,
 * points every link that names an `asset` at the release file of that name,
 * and commits this file. A link whose file the release does not have goes back
 * to "" until a release that has one.
 *
 * In an `asset` pattern, * stands for any run of characters (usually the
 * version), and case does not matter. Keep each link on one line, as below:
 * the workflow rewrites the `url` on the line its `asset` is on.
 *
 * Links with no `asset` (the stores, the install command) are edited by hand.
 * A link left "" reads "Coming soon" and does nothing. `more` holds the smaller
 * links under a platform's main button, and a link with no URL is left out.
 */
window.CONJURE_DOWNLOADS = {
  // Shown under the download grid, from the release's tag. "" hides it.
  version: "0.9.4",

  // The release page and the SHA256SUMS file attached to it. "" hides each link.
  releaseNotes: "https://github.com/FrizzleM/conjure-website/releases/tag/v0.9.4",
  checksums: "",

  platforms: {
    ios: {
      primary: { label: "Download on the App Store", url: "" },
      // Conjure.ipa, from `just release-ios`
      more: [{ label: "IPA", asset: "*.ipa", url: "https://github.com/FrizzleM/conjure-website/releases/download/v0.9.4/Conjure.ipa" }],
    },

    mac: {
      // Conjure_<version>_universal.dmg, from `just release-mac`
      primary: { label: "Download for Mac", asset: "*.dmg", url: "https://github.com/FrizzleM/conjure-website/releases/download/v0.9.4/Conjure_0.9.4_universal.dmg" },
      more: [{ label: "Mac App Store", url: "" }],
    },

    android: {
      primary: { label: "Get it on Google Play", url: "" },
      // conjure-<version>-universal-debug.apk: every ABI in one APK
      more: [{ label: "APK", asset: "*universal*.apk", url: "https://github.com/FrizzleM/conjure-website/releases/download/v0.9.4/conjure-0.9.4-universal-debug.apk" }],
    },

    windows: {
      // Conjure_<version>_x64-setup.exe (NSIS; adds the firewall rule)
      primary: { label: "Download for Windows", asset: "*-setup.exe", url: "https://github.com/FrizzleM/conjure-website/releases/download/v0.9.4/Conjure_0.9.4_x64-setup.exe" },
      // Conjure_<version>_x64_en-US.msi
      more: [{ label: "MSI installer", asset: "*.msi", url: "" }],
    },

    linux: {
      // Conjure_<version>_amd64.AppImage
      primary: { label: "Download AppImage", asset: "*.AppImage", url: "" },
      more: [
        { label: "Flatpak", asset: "*.flatpak", url: "" },
        { label: ".deb", asset: "*.deb", url: "" },
        { label: ".rpm", asset: "*.rpm", url: "" },
      ],
    },

    cli: {
      primary: { label: "Download cj", url: "" },
      // Shown with a copy button, e.g. "cargo install conjure-cli". "" hides it.
      command: "",
    },
  },
};
