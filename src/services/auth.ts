/**
 * Authentication service.
 *
 * All auth operations go through this module so that stores and
 * components never import Supabase directly.
 */
import { supabase } from "../lib/supabase";
import type { User } from "@supabase/supabase-js";

export const authService = {
  /** Returns the current user from the active session, or null. */
  async getSession(): Promise<User | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user ?? null;
  },

  /** Sign in with email + password. Throws on failure. */
  async signIn(email: string, password: string): Promise<void> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },

  /** Register a new user. Throws on failure. */
  async signUp(email: string, password: string): Promise<void> {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  },

  /** Send a password reset email. Throws on failure. */
  async requestPasswordReset(email: string): Promise<void> {
    const redirectTo = typeof window !== "undefined"
      ? `${window.location.origin}/login?mode=update-password`
      : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      ...(redirectTo ? { redirectTo } : {}),
    });
    if (error) throw error;
  },

  /** Update the current user's password after a password recovery link. */
  async updatePassword(password: string): Promise<User> {
    const { data, error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    return data.user;
  },

  /** Create a reviewer-friendly anonymous session. Throws on failure. */
  async signInAnonymously(): Promise<void> {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
  },

  /** Sign out the current user. Throws on failure. */
  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /**
   * Update the current user's display name (stored in user_metadata).
   * Throws on failure.
   */
  async updateDisplayName(name: string): Promise<User> {
    const { data, error } = await supabase.auth.updateUser({
      data: { display_name: name.trim() },
    });
    if (error) throw error;
    return data.user;
  },

  /**
   * Subscribe to auth state changes. Returns an unsubscribe function.
   * The callback fires with the new User (or null on sign-out).
   */
  onAuthStateChange(callback: (user: User | null) => void): () => void {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => callback(session?.user ?? null),
    );
    return () => subscription.unsubscribe();
  },
};
