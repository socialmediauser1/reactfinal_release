import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Board from "./pages/Board";
import Archive from "./pages/Archive";
import Stats from "./pages/Stats";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import { useAuthStore } from "./store/authStore";
import { useBoardsStore } from "./store/boardsStore";
import { useKanbanStore } from "./store/kanbanStore";
import { useThemeStore } from "./store/themeStore";

const USE_SUPABASE = !!import.meta.env.VITE_SUPABASE_URL;

function App() {
  const initializeTheme = useThemeStore((s) => s.initialize);

  useEffect(() => {
    initializeTheme();
  }, [initializeTheme]);

  if (!USE_SUPABASE) {
    return <PlainApp />;
  }
  return <AuthenticatedApp />;
}

function PlainApp() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Board />} />
        <Route path="/archive" element={<Archive />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/about" element={<Navigate to="/settings" replace />} />
      </Route>
    </Routes>
  );
}

function AuthenticatedApp() {
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const initializeAuth = useAuthStore((s) => s.initialize);
  const initializeBoards = useBoardsStore((s) => s.initialize);
  const initializeKanban = useKanbanStore((s) => s.initialize);

  useEffect(() => {
    void initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    if (user) {
      void (async () => {
        await initializeBoards();
        await initializeKanban();
      })();
    }
  }, [user, initializeBoards, initializeKanban]);

  if (!initialized) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f5f7fa",
          color: "#888",
          fontSize: "0.95rem",
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />
      <Route element={user ? <Layout /> : <Navigate to="/login" replace />}>
        <Route path="/" element={<Board />} />
        <Route path="/archive" element={<Archive />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/about" element={<Navigate to="/settings" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
