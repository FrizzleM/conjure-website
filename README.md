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
  .github/       the workflow that points downloads.js at each new release
```

## Download links

### From a release

Publish a release on this repository with the builds attached, and the
download buttons follow it. `.github/workflows/download-links.yml` runs when
the release goes out, points each button at its file, commits `downloads.js`
to `main` and has Pages rebuild the site.

- It takes the release GitHub marks **Latest**, so a pre-release or a draft
  leaves the site alone. So does a release published with "Set as the latest
  release" unticked, for example a fix to an older version.
- Each link in `downloads.js` that names an `asset` takes the release file
  that matches it. `*` stands for any run of characters, and case does not
  matter, so `"*-setup.exe"` finds `Conjure_0.9.4_x64-setup.exe`. A file
  called `SHA256SUMS` becomes the checksums link.
- A link whose file is not in the release is emptied (a button reads "Coming
  soon", a small link disappears), so the page never mixes versions. Builds
  the page has no link for are listed in the run's summary.
- If the release has none of the files the page links to, the run fails and
  changes nothing. That usually means it was published before its files were
  uploaded.
- After adding a file to a release that is already out, or deleting one, run
  the workflow by hand from the Actions tab (Download links > Run workflow).

Release assets on the private app repository return 404 to anyone signed out,
which is why the builds go on a release here.

The workflow runs from the commit the release's tag points at, so tag releases
from `main` (the default when a release makes a new tag) and not from a commit
older than the workflow.

### By hand

Links with no `asset` (the App Store, Google Play, the Mac App Store, the
command line) are filled in by hand: paste a URL into `url`. A button with no
URL reads "Coming soon" and does nothing, so the page is safe to publish before
every platform has a build.

```js
windows: {
  primary: { label: "Download for Windows", asset: "*-setup.exe", url: "" },
  more: [{ label: "MSI installer", asset: "*.msi", url: "" }],
},
```

- `primary` is the big button on a platform's card.
- `more` holds the small links under it (the MSI, the Flatpak, the APK). Entries
  with no URL are left out.
- `asset` is the release file a link takes. Keep the link on one line: the
  workflow rewrites the `url` on the line its `asset` is on. Take `asset` out
  to fill a link in by hand.
- `cli.command` shows an install command with a copy button, for example
  `cargo install conjure-cli`.
- `version`, `releaseNotes` and `checksums` fill the line under the grid, and a
  release sets all three.

Every URL has to be one a visitor can open.

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

A push made by a workflow with its own `GITHUB_TOKEN` is the exception: Pages
does not build those, which is why the download-links workflow asks for a
build itself once it has pushed.

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
