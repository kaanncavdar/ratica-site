// Ratica site: pick the visitor's system, read the latest release from GitHub, before/after slider.
"use strict";

const REPO = "kaanncavdar/ratica";
const RELEASES = `https://github.com/${REPO}/releases/latest`;

// Package-manager installs. Fill in a command to show it under "Other systems"; null hides it.
// Example: brew: "brew install --cask ratica", winget: "winget install Ratica.Ratica"
const PACKAGES = { brew: null, winget: null };

const OS = {
  mac: { name: "macOS", file: /macOS.*\.dmg$/i, note: "Apple Silicon · signed & notarized" },
  win: { name: "Windows", file: /Windows.*\.exe$/i, note: "Windows 10/11 · installer" },
  linux: { name: "Linux", file: /Linux.*\.tar\.gz$/i, note: "x64 · .tar.gz" },
};

function detectOS() {
  const ua = navigator.userAgent || "";
  const platform = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || "";
  if (/android|iphone|ipad|ipod/i.test(ua) || (/mac/i.test(platform) && navigator.maxTouchPoints > 1)) return "mobile";
  if (/win/i.test(platform) || /windows/i.test(ua)) return "win";
  if (/mac/i.test(platform) || /mac os/i.test(ua)) return "mac";
  if (/linux|x11|cros/i.test(platform + ua)) return "linux";
  return null;
}

async function latestRelease() {
  try {
    const cached = sessionStorage.getItem("ratica-release");
    if (cached) return JSON.parse(cached);
  } catch (e) { /* storage may be blocked */ }
  const r = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { Accept: "application/vnd.github+json" } });
  if (!r.ok) throw new Error(`GitHub ${r.status}`);
  const j = await r.json();
  const release = {
    tag: j.tag_name, name: j.name, date: j.published_at, url: j.html_url, body: j.body || "",
    assets: (j.assets || []).map(a => ({ name: a.name, url: a.browser_download_url, size: a.size })),
  };
  try { sessionStorage.setItem("ratica-release", JSON.stringify(release)); } catch (e) { /* ignore */ }
  return release;
}

function assetFor(release, os) {
  return release && OS[os] ? release.assets.find(a => OS[os].file.test(a.name)) : undefined;
}

const mb = n => `${Math.round(n / 1e6)} MB`;
const esc = s => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// A small, safe Markdown subset for release notes: headings, bullets, bold, italics, code, links.
function inline(md) {
  return esc(md)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/\*([^*]+)\*/g, "<i>$1</i>")
    .replace(/\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>');
}

function whatsNew(body) {
  const lines = body.replace(/\r/g, "").split("\n");
  const start = lines.findIndex(l => /^##\s+What's new/i.test(l));
  if (start < 0) return null;
  let html = "", inList = false, item = "";
  const flush = () => { if (item) { html += `<li>${inline(item.trim())}</li>`; item = ""; } };
  for (const line of lines.slice(start + 1)) {
    if (/^##\s/.test(line)) break;
    if (/^\s*[-*]\s+/.test(line)) { flush(); if (!inList) { html += "<ul>"; inList = true; } item = line.replace(/^\s*[-*]\s+/, ""); }
    else if (inList && /^\s{2,}\S/.test(line)) item += " " + line.trim();
    else if (line.trim()) { flush(); if (inList) { html += "</ul>"; inList = false; } html += `<p>${inline(line.trim())}</p>`; }
  }
  flush();
  if (inList) html += "</ul>";
  return html;
}

function setupHome() {
  const os = detectOS();
  const main = document.getElementById("dl-main");
  const label = document.getElementById("dl-main-label");
  const meta = document.getElementById("dl-main-meta");
  const other = document.getElementById("other-os");
  const ver = document.getElementById("ver");

  if (OS[os]) {
    main.href = `download.html?os=${os}`;
    label.textContent = `Download for ${OS[os].name}`;
    meta.textContent = `Free · ${OS[os].note}`;
    const mine = document.querySelector(`.os-list a[data-os="${os}"]`);
    if (mine) mine.classList.add("current");
    document.getElementById("other-label").textContent = "Other systems and install options";
  } else {
    main.href = "#download";
    label.textContent = os === "mobile" ? "Ratica is a desktop app" : "Download Ratica";
    meta.textContent = os === "mobile" ? "Open this page on your computer, or pick a system below" : "Choose your system below";
    other.open = true;
    main.addEventListener("click", e => { e.preventDefault(); other.open = true; other.querySelector("a").focus(); });
  }

  const pkg = document.getElementById("pkg");
  const cmds = [["Homebrew (macOS)", PACKAGES.brew], ["winget (Windows)", PACKAGES.winget]].filter(([, c]) => c);
  if (cmds.length) {
    pkg.innerHTML = cmds.map(([t, c]) => `<h3>${esc(t)}</h3><pre><code>${esc(c)}</code></pre>`).join("");
    pkg.hidden = false;
  }

  latestRelease().then(rel => {
    const a = assetFor(rel, os);
    ver.textContent = `Latest: ${rel.tag}` + (a ? ` · ${mb(a.size)}` : "") +
      ` · ${new Date(rel.date).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}`;
    for (const [key, info] of Object.entries(OS)) {
      const link = document.querySelector(`.os-list a[data-os="${key}"] span`);
      const asset = assetFor(rel, key);
      if (link && asset) link.textContent = `${info.note} · ${mb(asset.size)}`;
    }
    document.getElementById("new-version").textContent = `Ratica ${rel.tag}`;
    document.getElementById("new-date").textContent = `Released ${new Date(rel.date).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}`;
    document.getElementById("new-link").href = rel.url;
    const notes = whatsNew(rel.body);
    if (notes) document.getElementById("new-body").innerHTML = notes;
  }).catch(() => { ver.innerHTML = `<a href="${RELEASES}">See the latest release on GitHub</a>`; });

  // before / after slider
  const compare = document.getElementById("compare");
  const range = document.getElementById("c-range");
  if (compare && range) {
    const set = () => compare.style.setProperty("--pos", `${range.value}%`);
    range.addEventListener("input", set);
    set();
    const img = document.getElementById("c-after-img");
    const tag = document.getElementById("c-tag");
    document.querySelectorAll(".lang").forEach(btn => btn.addEventListener("click", () => {
      document.querySelectorAll(".lang").forEach(b => { b.classList.toggle("on", b === btn); b.setAttribute("aria-pressed", String(b === btn)); });
      img.src = `assets/page-${btn.dataset.lang}.webp`;
      tag.textContent = btn.textContent;
    }));
  }
}

function setupDownload() {
  const params = new URLSearchParams(location.search);
  let os = params.get("os");
  if (!OS[os]) os = detectOS();
  const title = document.getElementById("t-title");
  const manual = document.getElementById("manual");
  const status = document.getElementById("status");
  const steps = document.querySelectorAll("[data-steps]");
  steps.forEach(s => { s.hidden = s.dataset.steps !== os; });
  if (!OS[os]) {
    title.textContent = "Choose your system";
    document.getElementById("didnt").hidden = true;
    document.getElementById("first-steps").hidden = true;
    status.innerHTML = `Ratica runs on Windows, macOS and Linux. <a href="${RELEASES}">Pick a file on GitHub</a>.`;
    manual.href = RELEASES;
    return;
  }
  title.textContent = `Thanks for downloading Ratica for ${OS[os].name}!`;
  manual.href = RELEASES;
  latestRelease().then(rel => {
    const a = assetFor(rel, os);
    if (!a) throw new Error("no asset");
    manual.href = a.url;
    document.getElementById("manual-label").textContent = `Download ${a.name}`;
    status.textContent = `Your download of Ratica ${rel.tag} (${mb(a.size)}) should start in a moment.`;
    setTimeout(() => { location.href = a.url; }, 900);
  }).catch(() => {
    status.innerHTML = `The download did not start automatically. Use the button below or <a href="${RELEASES}">the release page</a>.`;
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.body.dataset.page === "download") setupDownload(); else setupHome();
});
