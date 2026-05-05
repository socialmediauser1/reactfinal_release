import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

type LoginMode = "signin" | "signup" | "reset" | "updatePassword";

export default function Login() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [mode, setMode] = useState<LoginMode>(
    searchParams.get("mode") === "update-password" ? "updatePassword" : "signin"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signupDone, setSignupDone] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);

  const loading = useAuthStore((s) => s.loading);
  const error = useAuthStore((s) => s.error);
  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);
  const requestPasswordReset = useAuthStore((s) => s.requestPasswordReset);
  const updatePassword = useAuthStore((s) => s.updatePassword);
  const continueAsGuest = useAuthStore((s) => s.continueAsGuest);

  useEffect(() => {
    if (searchParams.get("mode") === "update-password") {
      setMode("updatePassword");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signin") {
      await signIn(email, password);
    } else if (mode === "signup") {
      await signUp(email, password);
      if (!useAuthStore.getState().error) {
        setSignupDone(true);
      }
    } else if (mode === "reset") {
      await requestPasswordReset(email);
      if (!useAuthStore.getState().error) {
        setResetSent(true);
      }
    } else {
      await updatePassword(password);
      if (!useAuthStore.getState().error) {
        setPasswordUpdated(true);
      }
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr)",
        placeItems: "center",
        padding: "1.5rem",
        background: "linear-gradient(135deg, #f8fafc 0%, #e5e7eb 100%)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "920px",
          display: "grid",
          gridTemplateColumns: "minmax(280px, 0.95fr) minmax(320px, 1fr)",
          backgroundColor: "#fff",
          border: "1px solid #dbe3ef",
          borderRadius: "18px",
          overflow: "hidden",
          boxShadow: "0 24px 70px rgba(15,23,42,0.16)",
        }}
        className="login-shell"
      >
        <aside
          style={{
            minHeight: "520px",
            padding: "2rem",
            background:
              "linear-gradient(160deg, #0f172a 0%, #1f2937 58%, #115e59 100%)",
            color: "#fff",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "10px",
                display: "grid",
                placeItems: "center",
                backgroundColor: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.18)",
                fontWeight: 800,
                fontSize: "1.1rem",
              }}
            >
              K
            </div>
            <h1
              style={{
                margin: "1.5rem 0 0.75rem",
                fontSize: "2rem",
                lineHeight: 1.05,
                letterSpacing: 0,
              }}
            >
              Personal Kanban
            </h1>
            <p
              style={{
                margin: 0,
                maxWidth: "28rem",
                color: "rgba(255,255,255,0.76)",
                fontSize: "0.98rem",
                lineHeight: 1.6,
              }}
            >
              Track work across columns, priorities, teams, archive history, and
              board metrics from one focused workspace.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.75rem",
              marginTop: "2rem",
            }}
          >
            <Metric label="Flow stages" value="3+" />
            <Metric label="Demo access" value="Guest" />
            <Metric label="State" value="Zustand" />
            <Metric label="Backend" value="Supabase" />
          </div>
        </aside>

        <section
          style={{
            padding: "2rem",
            display: "flex",
            alignItems: "center",
          }}
        >
          <div style={{ width: "100%" }}>
            <div style={{ marginBottom: "1.35rem" }}>
              <h2
                style={{
                  margin: "0 0 0.35rem",
                  fontSize: "1.35rem",
                  fontWeight: 800,
                  color: "#111827",
                  letterSpacing: 0,
                }}
              >
                {mode === "signin"
                  ? "Sign in"
                  : mode === "signup"
                    ? "Create account"
                    : mode === "reset"
                      ? "Reset password"
                      : "Set new password"}
              </h2>
              <p style={{ margin: 0, color: "#64748b", fontSize: "0.9rem" }}>
                {mode === "signin"
                  ? "Use your account or open a guest board for review."
                  : mode === "signup"
                    ? "Create an account to keep your own board history."
                    : mode === "reset"
                      ? "Enter your account email and we will send a password reset link."
                      : "Choose a new password for your account."}
              </p>
            </div>

            {mode !== "updatePassword" && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.35rem",
                  padding: "0.3rem",
                  backgroundColor: "#f1f5f9",
                  borderRadius: "10px",
                  marginBottom: "1rem",
                }}
              >
                {(["signin", "signup"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setMode(m);
                      setSignupDone(false);
                      setResetSent(false);
                      setPasswordUpdated(false);
                    }}
                    style={{
                      padding: "0.55rem",
                      fontSize: "0.875rem",
                      fontWeight: 700,
                      backgroundColor: mode === m ? "#fff" : "transparent",
                      color: mode === m ? "#111827" : "#64748b",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      boxShadow: mode === m ? "0 1px 4px rgba(15,23,42,0.10)" : "none",
                    }}
                  >
                    {m === "signin" ? "Sign In" : "Sign Up"}
                  </button>
                ))}
              </div>
            )}

            {signupDone && mode === "signup" ? (
              <Notice
                tone="success"
                title="Account created"
                message="Check your email to confirm the account, then sign in."
              />
            ) : resetSent && mode === "reset" ? (
              <Notice
                tone="success"
                title="Reset email sent"
                message="Check your email for a link to restore access to your account."
              />
            ) : passwordUpdated && mode === "updatePassword" ? (
              <Notice
                tone="success"
                title="Password updated"
                message="Your new password has been saved."
              />
            ) : (
              <form onSubmit={(e) => void handleSubmit(e)}>
                {mode !== "updatePassword" && (
                  <AuthField label="Email">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                      style={inputStyle}
                    />
                  </AuthField>
                )}

                {mode !== "reset" && (
                  <AuthField label={mode === "updatePassword" ? "New password" : "Password"}>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      autoFocus={mode === "updatePassword"}
                      style={inputStyle}
                    />
                  </AuthField>
                )}

                {error ? (
                  <Notice tone="error" title="Authentication error" message={error} />
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  style={primaryButtonStyle(loading)}
                >
                  {loading
                    ? "Working..."
                    : mode === "signin"
                      ? "Sign In"
                      : mode === "signup"
                        ? "Sign Up"
                        : mode === "reset"
                          ? "Send Reset Link"
                          : "Update Password"}
                </button>
              </form>
            )}

            <button
              type="button"
              onClick={() => {
                if (mode === "updatePassword" && passwordUpdated) {
                  navigate("/");
                  return;
                }
                setMode(mode === "reset" ? "signin" : "reset");
                setSignupDone(false);
                setResetSent(false);
                setPasswordUpdated(false);
              }}
              style={{
                marginTop: "0.75rem",
                width: "100%",
                border: "none",
                backgroundColor: "transparent",
                color: "#4f46e5",
                cursor: "pointer",
                fontSize: "0.84rem",
                fontWeight: 700,
              }}
            >
              {mode === "updatePassword" && passwordUpdated
                ? "Go to board"
                : mode === "reset"
                  ? "Back to sign in"
                  : mode === "updatePassword"
                    ? "Request a new reset email"
                    : "Forgot password?"}
            </button>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                margin: "1rem 0",
                color: "#94a3b8",
                fontSize: "0.75rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              <span style={{ flex: 1, height: "1px", backgroundColor: "#e2e8f0" }} />
              Reviewer
              <span style={{ flex: 1, height: "1px", backgroundColor: "#e2e8f0" }} />
            </div>

            <button
              type="button"
              onClick={() => void continueAsGuest()}
              disabled={loading}
              style={{
                width: "100%",
                padding: "0.68rem",
                fontSize: "0.92rem",
                backgroundColor: "#ecfdf5",
                color: "#047857",
                border: "1px solid #a7f3d0",
                borderRadius: "9px",
                cursor: loading ? "not-allowed" : "pointer",
                fontWeight: 800,
                opacity: loading ? 0.65 : 1,
              }}
            >
              Continue as guest
            </button>

            <p
              style={{
                margin: "0.75rem 0 0",
                color: "#64748b",
                fontSize: "0.78rem",
                lineHeight: 1.5,
              }}
            >
              Guest mode creates a Supabase anonymous session and a personal demo board.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: "0.75rem",
        borderRadius: "10px",
        backgroundColor: "rgba(255,255,255,0.10)",
        border: "1px solid rgba(255,255,255,0.14)",
      }}
    >
      <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.62)" }}>{label}</div>
      <div style={{ marginTop: "0.18rem", fontSize: "0.94rem", fontWeight: 800 }}>{value}</div>
    </div>
  );
}

function AuthField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: "0.85rem" }}>
      <span
        style={{
          display: "block",
          marginBottom: "0.3rem",
          fontSize: "0.82rem",
          color: "#334155",
          fontWeight: 700,
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function Notice({
  tone,
  title,
  message,
}: {
  tone: "success" | "error";
  title: string;
  message: string;
}) {
  const success = tone === "success";
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      style={{
        padding: "0.75rem",
        marginBottom: success ? 0 : "0.85rem",
        backgroundColor: success ? "#f0fdf4" : "#fff1f2",
        border: `1px solid ${success ? "#bbf7d0" : "#fecdd3"}`,
        borderRadius: "9px",
        color: success ? "#166534" : "#be123c",
      }}
    >
      <div style={{ fontSize: "0.83rem", fontWeight: 800 }}>{title}</div>
      <div style={{ marginTop: "0.18rem", fontSize: "0.82rem", lineHeight: 1.45 }}>{message}</div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.62rem 0.7rem",
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  fontSize: "0.95rem",
  boxSizing: "border-box",
  outline: "none",
  color: "#0f172a",
  backgroundColor: "#fff",
};

const primaryButtonStyle = (disabled: boolean): React.CSSProperties => ({
  width: "100%",
  padding: "0.68rem",
  fontSize: "0.95rem",
  backgroundColor: disabled ? "#94a3b8" : "#0f172a",
  color: "#fff",
  border: "none",
  borderRadius: "9px",
  cursor: disabled ? "not-allowed" : "pointer",
  fontWeight: 800,
  boxShadow: disabled ? "none" : "0 10px 22px rgba(15,23,42,0.22)",
});
