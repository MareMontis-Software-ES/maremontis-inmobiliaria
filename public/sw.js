// Service worker mínim: només fa que el navegador permeti «Instal·lar l'aplicació».
// No guarda res a la memòria cau, així sempre es carrega la darrera versió publicada.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
