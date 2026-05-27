
  import { createRoot } from "react-dom/client";
  import App from "./App.tsx";
  import EmbedPlayer from "./EmbedPlayer.tsx";
  import "./index.css";

  const params = new URLSearchParams(window.location.search);
  const Root = params.has('embed') ? EmbedPlayer : App;

  createRoot(document.getElementById("root")!).render(<Root />);
  