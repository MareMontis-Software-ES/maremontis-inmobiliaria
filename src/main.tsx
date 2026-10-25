import React from "react";import{createRoot}from"react-dom/client";import App from "./ui/App";import "./ui/styles.css";import "./ui/modules.css";createRoot(document.getElementById("root")!).render(<React.StrictMode><App/></React.StrictMode>);
// Permet instal·lar el programa des del navegador (icona a l'escriptori). Només a la web publicada.
if(import.meta.env.PROD&&location.protocol==="https:"&&"serviceWorker" in navigator)window.addEventListener("load",()=>{navigator.serviceWorker.register("/sw.js").catch(()=>{})});
