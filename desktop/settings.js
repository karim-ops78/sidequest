// Tiny JSON settings store in Electron's userData dir.
const { app } = require("electron");
const fs = require("fs");
const path = require("path");

function file() {
  return path.join(app.getPath("userData"), "settings.json");
}

function read() {
  try {
    return JSON.parse(fs.readFileSync(file(), "utf8"));
  } catch {
    return {};
  }
}

function get(key, fallback) {
  const v = read()[key];
  return v === undefined ? fallback : v;
}

function set(key, value) {
  const s = read();
  s[key] = value;
  try {
    fs.writeFileSync(file(), JSON.stringify(s, null, 2));
  } catch {
    /* best effort */
  }
}

module.exports = { get, set };
