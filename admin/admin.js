const API = "https://api.github.com/repos/mrmarmac/go/contents/target.json";
const STORAGE_KEY = "go-admin-token";

const $ = (id) => document.getElementById(id);

function say(text, kind) {
  const el = $("message");
  el.textContent = text;
  el.className = kind || "";
}

function readToken() {
  try { return localStorage.getItem(STORAGE_KEY) || ""; } catch { return ""; }
}

function writeToken(value) {
  try {
    if (value) localStorage.setItem(STORAGE_KEY, value);
    else localStorage.removeItem(STORAGE_KEY);
  } catch { /* storage unavailable: token is used for this page view only */ }
}

function validUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch { return false; }
}

function toBase64(text) {
  const bytes = new TextEncoder().encode(text);
  return btoa(String.fromCharCode(...bytes));
}

async function api(method, token, body) {
  return fetch(API, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: body && JSON.stringify(body),
  });
}

async function showLive() {
  try {
    const res = await fetch("../target.json?t=" + Date.now(), { cache: "no-store" });
    $("live").textContent = (await res.json()).url;
  } catch {
    $("live").textContent = "unavailable";
  }
}

async function save() {
  const url = $("url").value.trim();
  if (!validUrl(url)) return say("URL must start with http:// or https://", "error");

  const token = $("token").value.trim() || readToken();
  if (!token) return say("Enter your GitHub token first.", "error");

  $("save").disabled = true;
  say("Saving…");
  try {
    const current = await api("GET", token);
    if (current.status === 401 || current.status === 403) throw new Error("token");
    if (!current.ok) throw new Error("GitHub error " + current.status);
    const { sha } = await current.json();

    const put = await api("PUT", token, {
      message: "chore: update redirect target",
      content: toBase64(JSON.stringify({ url }) + "\n"),
      sha,
    });
    if (put.status === 401 || put.status === 403) throw new Error("token");
    if (put.status === 409 || put.status === 422) throw new Error("Conflict. Try again.");
    if (!put.ok) throw new Error("GitHub error " + put.status);

    writeToken(token);
    $("token").value = "";
    say("Saved. Live in about a minute.", "ok");
  } catch (e) {
    say(e.message === "token"
      ? "GitHub rejected the token. Check it has Contents: read and write on mrmarmac/go, and has not expired."
      : e.message || "Network error.", "error");
  } finally {
    $("save").disabled = false;
  }
}

$("save").addEventListener("click", save);
$("forget").addEventListener("click", () => {
  writeToken("");
  $("token").value = "";
  say("Token forgotten on this device.");
});
showLive();
