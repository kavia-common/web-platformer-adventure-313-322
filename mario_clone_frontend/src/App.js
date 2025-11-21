import React, { useState, useEffect } from "react";
import Game from "./components/Game";
import "./App.css";

// PUBLIC_INTERFACE
function App() {
  const [theme, setTheme] = useState("light");

  // Toggle light/dark (still accessible for user preference)
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // PUBLIC_INTERFACE
  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  return (
    <div className="App" style={{ minHeight: "100vh", background: "var(--bg-secondary)", color: "var(--text-primary)" }}>
      <header className="App-header" style={{ background: "none", minHeight: 0, alignItems: "flex-start", justifyContent: "flex-start", position: "relative" }}>
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
          {theme === "light" ? "🌙 Dark" : "☀️ Light"}
        </button>
      </header>
      {/* Main fullscreen Game */}
      <Game />
    </div>
  );
}

export default App;
