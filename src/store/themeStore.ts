import { create } from "zustand";

export type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "personal-kanban:theme";

interface ThemeState {
  theme: ThemeMode;
}

interface ThemeActions {
  initialize: () => void;
  setTheme: (theme: ThemeMode) => void;
}

export type ThemeStore = ThemeState & ThemeActions;

function applyTheme(theme: ThemeMode): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

function readTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "dark" ? "dark" : "light";
}

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: "light",
  initialize: () => {
    const theme = readTheme();
    applyTheme(theme);
    set({ theme });
  },
  setTheme: (theme) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
    applyTheme(theme);
    set({ theme });
  },
}));
