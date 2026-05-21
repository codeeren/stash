import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { QuickLaunch } from "./components/QuickLaunch";
import "./index.css";

// The quicklaunch window loads the same bundle with ?view=quicklaunch, so
// it renders the lightweight launcher bar instead of the full app.
const isQuickLaunch =
  new URLSearchParams(window.location.search).get("view") === "quicklaunch";

// The quicklaunch window is transparent; the launcher draws its own card,
// so the page itself must not paint an opaque background.
if (isQuickLaunch) {
  document.documentElement.style.background = "transparent";
  document.body.style.background = "transparent";
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {isQuickLaunch ? <QuickLaunch /> : <App />}
  </React.StrictMode>,
);
