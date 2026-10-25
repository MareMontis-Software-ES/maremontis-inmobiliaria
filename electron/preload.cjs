// Pont mínim entre l'app d'escriptori i la pantalla: només el diàleg de triar carpeta.
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("desktop", {
  pickFolder: (start) => ipcRenderer.invoke("pick-folder", start || ""),
});
