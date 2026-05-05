import { useState, useRef, useEffect } from "react";
import { Outlet, NavLink } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useBoardsStore } from "../store/boardsStore";
import { useThemeStore } from "../store/themeStore";
import type { Board } from "../types";

const USE_SUPABASE = !!import.meta.env.VITE_SUPABASE_URL;

function formatBoardLabel(board: Board): string {
  if (board.type === "personal") return "Personal";
  return board.name.trim() || "Team Board";
}

export default function Layout() {
  const user    = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const theme   = useThemeStore((s) => s.theme);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const dark = theme === "dark";

  return (
    <div style={{ minHeight: "100vh", background: dark ? "#0b1120" : "linear-gradient(180deg, #f8fafc 0%, #eef2f7 48%, #f8fafc 100%)" }}>
      <nav
        style={{
          backgroundColor: dark ? "rgba(15,23,42,0.92)" : "rgba(255,255,255,0.92)",
          padding: "0 1.5rem",
          display: "flex",
          alignItems: "center",
          height: "64px",
          borderBottom: dark ? "1px solid rgba(51,65,85,0.9)" : "1px solid rgba(203,213,225,0.72)",
          boxShadow: dark ? "0 10px 30px rgba(0,0,0,0.3)" : "0 10px 30px rgba(15,23,42,0.06)",
          position: "sticky",
          top: 0,
          zIndex: 100,
          backdropFilter: "blur(16px)",
        }}
      >
        <span
          style={{
            fontWeight: 800,
            fontSize: "1.02rem",
            color: dark ? "#f8fafc" : "#0f172a",
            marginRight: "1.75rem",
            letterSpacing: 0,
            display: "flex",
            alignItems: "center",
            gap: "0.55rem",
            userSelect: "none",
          }}
        >
          <span style={{ width: "30px", height: "30px", borderRadius: "8px", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", background: "linear-gradient(135deg, #0f766e, #4f46e5)", boxShadow: "0 8px 18px rgba(79,70,229,0.24)", fontSize: "0.82rem", fontWeight: 900 }}>K</span>
          <span style={{ background: "linear-gradient(90deg, #818cf8, #c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Kanban
          </span>
        </span>

        {(["Board", "Archive", "Stats", "Settings"] as const).map((label) => {
          const to = label === "Board" ? "/" : `/${label.toLowerCase()}`;
          return (
            <NavLink
              key={label}
              to={to}
              end={label === "Board"}
              onMouseEnter={() => setHoveredLink(label)}
              onMouseLeave={() => setHoveredLink(null)}
              style={({ isActive }) => ({
                padding: "0.45rem 0.8rem",
                minHeight: "34px",
                display: "flex",
                alignItems: "center",
                fontSize: "0.84rem",
                fontWeight: isActive ? 700 : 600,
                color: isActive
                  ? (dark ? "#f8fafc" : "#0f172a")
                  : hoveredLink === label
                    ? (dark ? "#e2e8f0" : "#334155")
                    : (dark ? "#94a3b8" : "#64748b"),
                border: "1px solid",
                borderColor: isActive ? (dark ? "#475569" : "#c7d2fe") : "transparent",
                borderRadius: "999px",
                textDecoration: "none",
                transition: "color 0.15s, background-color 0.15s, border-color 0.15s",
                backgroundColor: isActive
                  ? (dark ? "#1e293b" : "#eef2ff")
                  : !isActive && hoveredLink === label
                    ? (dark ? "#111827" : "#f1f5f9")
                    : "transparent",
              })}
            >
              {label}
            </NavLink>
          );
        })}

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.65rem" }}>
          {USE_SUPABASE && user ? (
            <>
              <BoardSwitcher currentUserId={user.id} />
              <div
                style={{
                  width: "1px",
                  height: "20px",
                  backgroundColor: dark ? "#334155" : "#e2e8f0",
                }}
              />
              <span
                style={{
                  fontSize: "0.78rem",
                  color: dark ? "#94a3b8" : "#64748b",
                  maxWidth: "160px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {(user.user_metadata?.display_name as string | undefined) || user.email}
              </span>
              <button
                onClick={() => void signOut()}
                style={{
                  fontSize: "0.78rem",
                  padding: "0.3rem 0.75rem",
                  backgroundColor: dark ? "#111827" : "#f8fafc",
                  border: dark ? "1px solid #334155" : "1px solid #cbd5e1",
                  borderRadius: "6px",
                  cursor: "pointer",
                  color: dark ? "#e2e8f0" : "#334155",
                  fontWeight: 700,
                }}
              >
                Sign Out
              </button>
            </>
          ) : null}
        </div>
      </nav>

      <main style={{ padding: "2rem 1.5rem", maxWidth: "1440px", margin: "0 auto" }}>
        <Outlet />
      </main>
    </div>
  );
}

function BoardSwitcher({ currentUserId }: { currentUserId: string }) {
  const theme            = useThemeStore((s) => s.theme);
  const boards           = useBoardsStore((s) => s.boards);
  const activeBoardId    = useBoardsStore((s) => s.activeBoardId);
  const boardMembers     = useBoardsStore((s) => s.boardMembers);
  const loading          = useBoardsStore((s) => s.loading);
  const error            = useBoardsStore((s) => s.error);
  const setActiveBoard   = useBoardsStore((s) => s.setActiveBoard);
  const createTeamBoard  = useBoardsStore((s) => s.createTeamBoard);
  const joinByCode       = useBoardsStore((s) => s.joinByCode);
  const leaveBoard       = useBoardsStore((s) => s.leaveBoard);
  const deleteBoard      = useBoardsStore((s) => s.deleteBoard);
  const loadBoardMembers = useBoardsStore((s) => s.loadBoardMembers);

  const [open, setOpen]       = useState(false);
  const [view, setView]       = useState<"list" | "create" | "join">("list");
  const [inputVal, setInputVal] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Board | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const activeBoard = boards.find((b) => b.id === activeBoardId);
  const dark = theme === "dark";

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setView("list");
        setInputVal("");
        setConfirmDelete(null);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open && activeBoard?.type === "team" && activeBoardId) {
      void loadBoardMembers(activeBoardId);
    }
  }, [open, activeBoard?.type, activeBoardId, loadBoardMembers]);

  const handleAction = async () => {
    if (view === "create" && inputVal.trim()) {
      await createTeamBoard(inputVal.trim());
      setInputVal(""); setView("list"); setOpen(false);
    } else if (view === "join" && inputVal.trim()) {
      await joinByCode(inputVal.trim());
      setInputVal(""); setView("list"); setOpen(false);
    }
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => { setOpen((o) => !o); setView("list"); setConfirmDelete(null); }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          padding: "0.3rem 0.7rem",
          backgroundColor: open ? (dark ? "#1e293b" : "#eef2ff") : (dark ? "#111827" : "#f8fafc"),
          border: open ? (dark ? "1px solid #475569" : "1px solid #c7d2fe") : (dark ? "1px solid #334155" : "1px solid #cbd5e1"),
          borderRadius: "7px",
          cursor: "pointer",
          fontSize: "0.82rem",
          fontWeight: 500,
          color: dark ? "#e2e8f0" : "#334155",
          maxWidth: "200px",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {activeBoard ? formatBoardLabel(activeBoard) : "Select board"}
        </span>
        <span style={{ fontSize: "0.6rem", color: dark ? "#94a3b8" : "#64748b", flexShrink: 0 }}>▾</span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            backgroundColor: dark ? "#111827" : "#fff",
            border: dark ? "1px solid #334155" : "1px solid #e2e8f0",
            borderRadius: "12px",
            boxShadow: "0 18px 42px rgba(15,23,42,0.16)",
            minWidth: "260px",
            zIndex: 200,
            overflow: "hidden",
          }}
        >
          {error && (
            <div style={{ padding: "0.5rem 0.85rem", backgroundColor: "#fff5f5", borderBottom: "1px solid #fed7d7", fontSize: "0.78rem", color: "#c53030" }}>
              {error}
            </div>
          )}

          {confirmDelete && (
            <div style={{ padding: "1rem" }}>
              <p style={{ margin: "0 0 0.75rem", fontSize: "0.85rem", color: "#1a1a2e", fontWeight: 600 }}>
                Delete "{confirmDelete.name}"?
              </p>
              <p style={{ margin: "0 0 0.85rem", fontSize: "0.78rem", color: "#6b7280", lineHeight: 1.5 }}>
                This will permanently delete the board and all its cards. This cannot be undone.
              </p>
              <div style={{ display: "flex", gap: "0.4rem" }}>
                <button
                  onClick={async () => {
                    await deleteBoard(confirmDelete.id);
                    setConfirmDelete(null);
                    setOpen(false);
                  }}
                  disabled={loading}
                  style={{
                    flex: 1, padding: "0.4rem", backgroundColor: "#dc2626", color: "#fff",
                    border: "none", borderRadius: "7px", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600,
                  }}
                >
                  {loading ? "Deleting..." : "Yes, Delete"}
                </button>
                <button
                  onClick={() => setConfirmDelete(null)}
                  style={{
                    padding: "0.4rem 0.7rem", backgroundColor: "#f3f4f6", border: "1px solid #e0e0e0",
                    borderRadius: "7px", cursor: "pointer", fontSize: "0.82rem", color: "#374151",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {!confirmDelete && view === "list" && (
            <>
              <div style={{ padding: "0.55rem 0.85rem", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#94a3b8", borderBottom: "1px solid #f1f5f9" }}>
                Your Boards
              </div>
              {boards.map((board) => {
                const isOwner = board.ownerId === currentUserId;
                const isMember = board.type === "team" && !isOwner;
                return (
                  <BoardItem
                    key={board.id}
                    board={board}
                    isActive={board.id === activeBoardId}
                    loading={loading}
                    isOwner={isOwner}
                    members={board.id === activeBoardId ? boardMembers : []}
                    onSelect={() => { void setActiveBoard(board.id); setOpen(false); }}
                    onDelete={isOwner && board.type === "team" ? () => setConfirmDelete(board) : undefined}
                    onLeave={isMember ? () => void leaveBoard(board.id) : undefined}
                  />
                );
              })}
              <div style={{ borderTop: "1px solid #f1f5f9", padding: "0.35rem 0" }}>
                <PanelBtn onClick={() => { setView("create"); setInputVal(""); }} icon="+" label="New Team Board" />
                <PanelBtn onClick={() => { setView("join"); setInputVal(""); }} icon="->" label="Join Board by Code" />
              </div>
            </>
          )}

          {!confirmDelete && (view === "create" || view === "join") && (
            <div style={{ padding: "0.9rem" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1a1a2e", marginBottom: "0.65rem" }}>
                {view === "create" ? "Create Team Board" : "Join Board"}
              </div>
              <input
                autoFocus type="text"
                placeholder={view === "create" ? "Board name..." : "Enter join code..."}
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void handleAction()}
                style={{ width: "100%", padding: "0.45rem 0.65rem", border: "1px solid #d1d5db", borderRadius: "7px", fontSize: "0.85rem", boxSizing: "border-box", marginBottom: "0.55rem", outline: "none" }}
              />
              <div style={{ display: "flex", gap: "0.4rem" }}>
                <button
                  onClick={() => void handleAction()}
                  disabled={!inputVal.trim() || loading}
                  style={{ flex: 1, padding: "0.42rem", backgroundColor: !inputVal.trim() || loading ? "#a5b4fc" : "#4f46e5", color: "#fff", border: "none", borderRadius: "7px", cursor: !inputVal.trim() || loading ? "not-allowed" : "pointer", fontSize: "0.82rem", fontWeight: 600 }}
                >
                  {loading ? "..." : view === "create" ? "Create" : "Join"}
                </button>
                <button
                  onClick={() => { setView("list"); setInputVal(""); }}
                  style={{ padding: "0.42rem 0.7rem", backgroundColor: "#f3f4f6", border: "1px solid #e0e0e0", borderRadius: "7px", cursor: "pointer", fontSize: "0.82rem", color: "#374151" }}
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BoardItem({
  board, isActive, loading, isOwner, members, onSelect, onDelete, onLeave,
}: {
  board: Board; isActive: boolean; loading: boolean; isOwner: boolean;
  members: { userId: string; email: string; displayName?: string }[];
  onSelect: () => void; onDelete?: () => void; onLeave?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copyCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!board.joinCode) return;
    void navigator.clipboard.writeText(board.joinCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div
      style={{
        padding: "0.55rem 0.85rem",
        backgroundColor: isActive ? "#eef2ff" : "transparent",
        borderLeft: `3px solid ${isActive ? "#4f46e5" : "transparent"}`,
        transition: "background-color 0.1s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
        <span
          onClick={onSelect}
          style={{ flex: 1, fontSize: "0.875rem", fontWeight: isActive ? 600 : 400, color: "#1e293b", cursor: "pointer" }}
        >
          {formatBoardLabel(board)}
        </span>

        {isOwner && board.type === "team" && (
          <span style={{ fontSize: "0.6rem", padding: "0.1rem 0.3rem", borderRadius: "3px", backgroundColor: "#fef3c7", color: "#92400e", fontWeight: 700, textTransform: "uppercase" }}>
            Admin
          </span>
        )}

        <span style={{
          fontSize: "0.6rem", padding: "0.1rem 0.35rem", borderRadius: "4px",
          backgroundColor: board.type === "team" ? "#eef2ff" : "#f0fdf4",
          color: board.type === "team" ? "#4f46e5" : "#16a34a",
          fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em",
        }}>
          {board.type}
        </span>

        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            disabled={loading}
            title="Delete board"
            style={{ fontSize: "0.7rem", padding: "0.1rem 0.3rem", color: "#dc2626", backgroundColor: "#fff5f5", border: "1px solid #fca5a5", borderRadius: "4px", cursor: "pointer" }}
          >
            Delete
          </button>
        )}

        {onLeave && (
          <button
            onClick={(e) => { e.stopPropagation(); onLeave(); }}
            disabled={loading}
            title="Leave board"
            style={{ fontSize: "0.7rem", padding: "0.1rem 0.3rem", color: "#6b7280", backgroundColor: "#f3f4f6", border: "1px solid #e0e0e0", borderRadius: "4px", cursor: "pointer" }}
          >
            Leave
          </button>
        )}
      </div>

      {board.type === "team" && board.joinCode && isOwner && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginTop: "0.3rem", fontSize: "0.72rem", color: "#94a3b8" }}>
          <span>Invite code:</span>
          <code style={{ backgroundColor: "#f8fafc", padding: "0.05rem 0.35rem", borderRadius: "4px", fontFamily: "monospace", letterSpacing: "0.12em", color: "#475569", border: "1px solid #e2e8f0" }}>
            {board.joinCode}
          </code>
          <button
            onClick={copyCode}
            style={{ fontSize: "0.65rem", padding: "0.1rem 0.35rem", backgroundColor: copied ? "#d1fae5" : "#f1f5f9", border: "none", borderRadius: "4px", cursor: "pointer", color: copied ? "#065f46" : "#64748b", fontWeight: 500 }}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
          <span style={{ marginLeft: "auto" }}>{board.memberCount} member{board.memberCount !== 1 ? "s" : ""}</span>
        </div>
      )}

      {board.type === "team" && isActive && members.length > 0 && (
        <div style={{ marginTop: "0.4rem", paddingTop: "0.35rem", borderTop: "1px solid #f1f5f9" }}>
          <div style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8", marginBottom: "0.3rem" }}>
            Members
          </div>
          {members.map((m) => (
            <div key={m.userId} style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.2rem" }}>
              <MemberAvatar email={m.email} />
              <span style={{ fontSize: "0.75rem", color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {m.displayName || m.email.split("@")[0]}
              </span>
              {m.userId === board.ownerId && (
                <span style={{ fontSize: "0.58rem", padding: "0.05rem 0.25rem", borderRadius: "3px", backgroundColor: "#fef3c7", color: "#92400e", fontWeight: 700, flexShrink: 0 }}>
                  Admin
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MemberAvatar({ email }: { email: string }) {
  const hue = email.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <span style={{
      width: "18px", height: "18px", borderRadius: "50%", flexShrink: 0,
      backgroundColor: `hsl(${hue}, 55%, 55%)`,
      color: "#fff", fontSize: "0.6rem", fontWeight: 700,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
    }}>
      {email[0].toUpperCase()}
    </span>
  );
}

function PanelBtn({ onClick, icon, label }: { onClick: () => void; icon: string; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: "0.5rem",
        width: "100%", padding: "0.5rem 0.85rem",
        backgroundColor: "transparent", border: "none", cursor: "pointer",
        fontSize: "0.82rem", color: "#475569", textAlign: "left",
      }}
    >
      <span style={{ width: "20px", height: "20px", borderRadius: "50%", backgroundColor: "#eef2ff", color: "#4f46e5", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700, flexShrink: 0 }}>
        {icon}
      </span>
      {label}
    </button>
  );
}
