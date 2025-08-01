import React from "react";
import ReactDOM from "react-dom/client";
import App from "./src/App";
import "./src/index.css";

const container = document.getElementById("root");

if (!container) {
  throw new Error("Root element not found");
}

const root = ReactDOM.createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
