import { create } from "zustand";
import type { User } from "@supabase/supabase-js";
import { authService } from "../services/auth";
import { useKanbanStore } from "./kanbanStore";
import { useBoardsStore } from "./boardsStore";

interface AuthState {
  user: User | null;
  initialized: boolean;
  loading: boolean;
  error: string | null;
}

interface AuthActions {
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  continueAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
}

export type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  initialized: false,
  loading: false,
  error: null,

  initialize: async () => {
    const user = await authService.getSession();
    set({ user, initialized: true });
    authService.onAuthStateChange((updatedUser) => {
      set({ user: updatedUser });
    });
  },

  signIn: async (email, password) => {
    set({ loading: true, error: null });
    try {
      await authService.signIn(email, password);
      set({ loading: false, error: null });
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : "Sign in failed." });
    }
  },

  signUp: async (email, password) => {
    set({ loading: true, error: null });
    try {
      await authService.signUp(email, password);
      set({ loading: false, error: null });
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : "Sign up failed." });
    }
  },

  continueAsGuest: async () => {
    set({ loading: true, error: null });
    try {
      await authService.signInAnonymously();
      set({ loading: false, error: null });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : "Guest access failed.",
      });
    }
  },

  signOut: async () => {
    await authService.signOut();
    set({ user: null });
    useBoardsStore.getState().resetState();
    useKanbanStore.getState().resetState();
  },

  updateDisplayName: async (name) => {
    set({ loading: true, error: null });
    try {
      const updatedUser = await authService.updateDisplayName(name);
      set({ user: updatedUser, loading: false });
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : "Failed to update display name." });
    }
  },
}));
