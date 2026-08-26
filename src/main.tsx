
  import { createRoot } from "react-dom/client";
  import App from "./App.tsx";
  import EmbedPlayer from "./EmbedPlayer.tsx";
  import TemplateStudio from "./components/TemplateStudio.tsx";
  import "./index.css";

  // Root fork: ?embed= → standalone widget; ?use=<templateId> → the closed,
  // template-only fan space (remix links); otherwise the full app.
  const params = new URLSearchParams(window.location.search);
  const Root = params.has('embed') ? EmbedPlayer : params.has('use') ? TemplateStudio : App;

  createRoot(document.getElementById("root")!).render(<Root />);
  