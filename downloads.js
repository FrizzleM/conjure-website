/*
 * Where every download button on the site points.
 *
 * This is the only file to edit when a release goes out. Paste a URL into
 * `url` and its button goes live; leave it "" and the button reads
 * "Coming soon" and does nothing. `more` holds the smaller links under a
 * platform's main button, and a link with no URL is left out.
 *
 * The artifact names match what docs/desktop-release.md says a release
 * contains, so a GitHub release asset URL drops straight in:
 *   https://github.com/<owner>/<repo>/releases/download/v<version>/<file>
 */
window.CONJURE_DOWNLOADS = {
  // Shown under the download grid. "" hides it.
  version: "",

  // The release page and the SHA256SUMS file. "" hides each link.
  releaseNotes: "",
  checksums: "",

  platforms: {
    ios: {
      primary: { label: "Download on the App Store", url: "" },
    },

    mac: {
      // Conjure_<version>.dmg, from `just release-mac`
      primary: { label: "Download for Mac", url: "" },
      more: [{ label: "Mac App Store", url: "" }],
    },

    android: {
      primary: { label: "Get it on Google Play", url: "" },
      more: [{ label: "APK", url: "" }],
    },

    windows: {
      // Conjure_<version>_x64-setup.exe (NSIS; adds the firewall rule)
      primary: { label: "Download for Windows", url: "" },
      // Conjure_<version>_x64_en-US.msi
      more: [{ label: "MSI installer", url: "" }],
    },

    linux: {
      // conjure_<version>_amd64.AppImage
      primary: { label: "Download AppImage", url: "" },
      more: [
        { label: "Flatpak", url: "" },
        { label: ".deb", url: "" },
        { label: ".rpm", url: "" },
      ],
    },

    cli: {
      primary: { label: "Download cj", url: "" },
      // Shown with a copy button, e.g. "cargo install conjure-cli". "" hides it.
      command: "",
    },
  },
};
