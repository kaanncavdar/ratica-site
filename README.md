# ratica-site

The website of [Ratica](https://github.com/kaanncavdar/ratica), served by GitHub Pages at
https://ratica.kaancavdar.com.

Plain HTML and CSS: no build step, no frameworks, no trackers, no external fonts. Preview locally with
`python -m http.server` in this folder.

- `index.html`: the landing page. `download.html`: the thank-you page that starts the download.
- `app.js`: picks the visitor's system and reads the files and notes of the latest release from the GitHub API
  (falls back to the releases page). Package-manager commands go in `PACKAGES` at the top of `app.js`.
