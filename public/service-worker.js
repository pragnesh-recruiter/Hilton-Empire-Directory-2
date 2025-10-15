import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app";
import "./style.css";

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

// Register service worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((reg) => console.log("Service Worker registered", reg))
      .catch((err) => console.log("Service Worker failed", err));
  });
}
