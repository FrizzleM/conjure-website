# Conjure website

The product page: a static site with no build step and no third-party requests.
Fonts are the system's, and every image is inline SVG or ships in `assets/`.

The app's source lives in the private `FrizzleM/Conjure` repository. Paths
below like `README.md`, `docs/…` and `apple/…` are files there, not here.

```
  index.html     the page
  styles.css     theme tokens (the app's, from apple/App/Shared/Theme.swift) and layout
  main.js        motion, platform detection, and the download buttons
  downloads.js   every download URL, the one file a release edits
  assets/        the mark, from docs/icon/
```

## Adding download links

Open `downloads.js` and paste each URL into its `url` field. A button with no
URL reads "Coming soon" and does nothing, so the page is safe to publish before
every platform has a build.

```js
windows: {
  primary: { label: "Download for Windows", url: "https://github.com/…/Conjure_0.2.0_x64-setup.exe" },
  more: [{ label: "MSI installer", url: "https://github.com/…/Conjure_0.2.0_x64_en-US.msi" }],
},
```

- `primary` is the big button on a platform's card.
- `more` holds the small links under it (the MSI, the Flatpak, the APK). Entries
  with no URL are left out.
- `cli.command` shows an install command with a copy button, for example
  `cargo install conjure-cli`.
- `version`, `releaseNotes` and `checksums` fill the line under the grid.

Every URL has to be one a visitor can open. Release assets on the private app
repository return 404 to anyone signed out, so attach builds to a release on
this public repository (or host them elsewhere) and link those.

The page detects the visitor's platform. It highlights that card, and the hero
button becomes "Download for Mac" (or Windows, Linux, iPhone, iPad, Android),
linking straight to that platform's `primary` URL when it has one. An iPad
reporting itself as a Mac is counted as an iPad.

## Previewing

Any static file server works:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Publishing

GitHub Pages serves this repository's `main` branch from the root, the same
way `FrizzleM/conjure-privacy` serves the privacy policy, at
https://frizzlem.github.io/conjure-website/. A push to `main` is a release.

## What the page claims, and where each claim comes from

The copy is kept to what the app repository's README.md and the app say, and
footnotes carry the fine print:

| Claim on the page | Source |
| --- | --- |
| No file size limit | README "Transports": magic-wormhole and the local network have none; buzzheavier's limit is "not measured". Footnote 1 says so. |
| Direct, high-speed transfers | Live transfers are peer to peer; the local network uploads nothing. The race animation is labelled as an illustration (footnote 2). |
| Free, no account | docs/privacy-policy.md: "No server, no account." |
| Four-day retention | Buzzheavier's measured expiry, README "Transports". |
| iOS 17, macOS 14, Android 8.0 | Deployment targets in the Xcode project and `minSdk = 26`. |
| Windows 10, 64-bit | The x64 Tauri installers in docs/desktop-release.md. |

If any of these change, change the page with them.

## Motion

Everything animates only when `prefers-reduced-motion` allows it. With reduced
motion, or with JavaScript off, every section renders in its finished state: the
phone shows a completed send, the race shows both lanes arrived, and the file
size section shows "No limit." without scroll pinning. The download buttons are
the exception: they are built from `downloads.js`, so they need JavaScript.
