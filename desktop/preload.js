const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("sidequest", {
  ask: (question) => ipcRenderer.invoke("ask", question),
  hide: () => ipcRenderer.send("hide-overlay"),
  focusOverlay: () => ipcRenderer.send("focus-overlay"),
  setCollapsed: (collapsed) => ipcRenderer.send("set-collapsed", collapsed),
  getGames: () => ipcRenderer.invoke("get-games"),
  setGame: (id) => ipcRenderer.invoke("set-game", id),
  onLoading: (cb) => ipcRenderer.on("loading", (_e, data) => cb(data)),
  onResult: (cb) => ipcRenderer.on("result", (_e, data) => cb(data)),
  onError: (cb) => ipcRenderer.on("error", (_e, msg) => cb(msg)),
  onFocusInput: (cb) => ipcRenderer.on("focus-input", () => cb()),
});
