import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";
import { authService } from "../services/auth";
import { useAuthStore } from "./authStore";

vi.mock("../services/auth", () => ({
  authService: {
    getSession: vi.fn(),
    signIn: vi.fn(),
    signUp: vi.fn(),
    requestPasswordReset: vi.fn(),
    updatePassword: vi.fn(),
    signInAnonymously: vi.fn(),
    signOut: vi.fn(),
    updateDisplayName: vi.fn(),
    onAuthStateChange: vi.fn(() => () => undefined),
  },
}));

const mockAuth = vi.mocked(authService);

function resetAuthStore() {
  useAuthStore.setState({
    user: null,
    initialized: false,
    loading: false,
    error: null,
  });
}

describe("authStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetAuthStore();
  });

  it("starts guest access through Supabase anonymous auth", async () => {
    mockAuth.signInAnonymously.mockResolvedValue(undefined);

    await useAuthStore.getState().continueAsGuest();

    expect(mockAuth.signInAnonymously).toHaveBeenCalledOnce();
    expect(useAuthStore.getState().loading).toBe(false);
    expect(useAuthStore.getState().error).toBeNull();
  });

  it("surfaces guest access failures", async () => {
    mockAuth.signInAnonymously.mockRejectedValue(new Error("Anonymous sign-in disabled"));

    await useAuthStore.getState().continueAsGuest();

    expect(useAuthStore.getState().loading).toBe(false);
    expect(useAuthStore.getState().error).toBe("Anonymous sign-in disabled");
  });

  it("initializes the session and subscribes to auth changes", async () => {
    const user = { id: "user-1", email: "demo@example.com" } as User;
    mockAuth.getSession.mockResolvedValue(user);

    await useAuthStore.getState().initialize();

    expect(useAuthStore.getState().user).toBe(user);
    expect(useAuthStore.getState().initialized).toBe(true);
    expect(mockAuth.onAuthStateChange).toHaveBeenCalledOnce();
  });

  it("requests a password reset email", async () => {
    mockAuth.requestPasswordReset.mockResolvedValue(undefined);

    await useAuthStore.getState().requestPasswordReset("demo@example.com");

    expect(mockAuth.requestPasswordReset).toHaveBeenCalledWith("demo@example.com");
    expect(useAuthStore.getState().loading).toBe(false);
    expect(useAuthStore.getState().error).toBeNull();
  });

  it("updates the current user's password", async () => {
    const user = { id: "user-1", email: "demo@example.com" } as User;
    mockAuth.updatePassword.mockResolvedValue(user);

    await useAuthStore.getState().updatePassword("new-secret");

    expect(mockAuth.updatePassword).toHaveBeenCalledWith("new-secret");
    expect(useAuthStore.getState().user).toBe(user);
    expect(useAuthStore.getState().loading).toBe(false);
  });
});
