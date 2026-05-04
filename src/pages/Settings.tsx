import { useState } from "react";
import { useAuthStore } from "../store/authStore";
import { useBoardsStore } from "../store/boardsStore";
import { useKanbanStore } from "../store/kanbanStore";
import { useThemeStore, type ThemeMode } from "../store/themeStore";
import { BOARD_TEMPLATES } from "../services/api";
import type { BoardTemplateId } from "../types";

const USE_SUPABASE = !!import.meta.env.VITE_SUPABASE_URL;

export default function Settings() {
  const user              = useAuthStore((s) => s.user);
  const loading           = useAuthStore((s) => s.loading);
  const error             = useAuthStore((s) => s.error);
  const updateDisplayName = useAuthStore((s) => s.updateDisplayName);
  const boards            = useBoardsStore((s) => s.boards);
  const activeBoardId     = useBoardsStore((s) => s.activeBoardId);
  const activeBoard       = boards.find((b) => b.id === activeBoardId);
  const columns           = useKanbanStore((s) => s.columns);
  const cards             = useKanbanStore((s) => s.cards);
  const archivedEntries   = useKanbanStore((s) => s.archivedEntries);
  const kanbanLoading     = useKanbanStore((s) => s.loading);
  const kanbanError       = useKanbanStore((s) => s.error);
  const applyTemplate        = useKanbanStore((s) => s.applyTemplate);
  const exportBoard          = useKanbanStore((s) => s.exportBoard);
  const customCategories     = useKanbanStore((s) => s.customCategories);
  const addCustomCategory    = useKanbanStore((s) => s.addCustomCategory);
  const removeCustomCategory = useKanbanStore((s) => s.removeCustomCategory);
  const theme                = useThemeStore((s) => s.theme);
  const setTheme          = useThemeStore((s) => s.setTheme);

  const dark = theme === "dark";
  const currentName = (user?.user_metadata?.display_name as string | undefined) ?? "";
  const [nameInput, setNameInput] = useState(currentName);
  const [newCatInput, setNewCatInput] = useState("");
  const [saved, setSaved] = useState(false);
  const [templateId, setTemplateId] = useState<BoardTemplateId>("personal");
  const [templateApplied, setTemplateApplied] = useState(false);
  const [pendingTemplateId, setPendingTemplateId] = useState<BoardTemplateId | null>(null);

  const isDirty = nameInput.trim() !== currentName;
  const canSave = isDirty && nameInput.trim().length > 0 && !loading;

  const palette = getPalette(dark);

  const handleSave = async () => {
    await updateDisplayName(nameInput.trim());
    if (!useAuthStore.getState().error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleExport = (format: "json" | "csv") => {
    const content = exportBoard(format);
    const mime = format === "json" ? "application/json" : "text/csv";
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `kanban-board.${format}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const applySelectedTemplate = async (id: BoardTemplateId) => {
    await applyTemplate(id);
    if (!useKanbanStore.getState().error) {
      setTemplateApplied(true);
      setTimeout(() => setTemplateApplied(false), 2000);
    }
  };

  const handleApplyTemplate = async () => {
    if (cards.length > 0) {
      setPendingTemplateId(templateId);
      return;
    }
    await applySelectedTemplate(templateId);
  };

  return (
    <div style={{ color: palette.text }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-end", marginBottom: "1rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800, color: palette.heading }}>
            Settings
          </h1>
          <p style={{ margin: "0.25rem 0 0", color: palette.muted, fontSize: "0.86rem" }}>
            Account, board, appearance, and export controls.
          </p>
        </div>
        <span style={{ fontSize: "0.78rem", color: palette.muted }}>
          {cards.length} active / {archivedEntries.length} archived
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "0.9rem",
          alignItems: "start",
        }}
      >
        {USE_SUPABASE && user && (
          <Section title="Account" palette={palette}>
            <label style={{ display: "block", marginBottom: "0.6rem" }}>
              <span style={fieldLabelStyle(palette)}>Display name</span>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => { setNameInput(e.target.value); setSaved(false); }}
                  onKeyDown={(e) => e.key === "Enter" && canSave && void handleSave()}
                  placeholder="Enter your name..."
                  style={inputStyle(palette)}
                />
                <button onClick={() => void handleSave()} disabled={!canSave} style={primaryButtonStyle(canSave)}>
                  {loading ? "Saving..." : saved ? "Saved" : "Save"}
                </button>
              </div>
            </label>
            {error && <InlineMessage tone="error" text={error} />}
            <CompactRow label="Email" value={user.email ?? "-"} palette={palette} />
            <CompactRow label="User ID" value={user.id} palette={palette} mono />
          </Section>
        )}

        <Section title="Active Board" palette={palette}>
          {activeBoard ? (
            <>
              <CompactRow label="Name" value={activeBoard.name} palette={palette} />
              <CompactRow label="Type" value={activeBoard.type} palette={palette} />
              {activeBoard.type === "team" && activeBoard.joinCode && (
                <CompactRow label="Join code" value={activeBoard.joinCode} palette={palette} mono />
              )}
              <CompactRow label="Members" value={String(activeBoard.memberCount)} palette={palette} />
            </>
          ) : (
            <p style={{ margin: 0, color: palette.muted, fontSize: "0.84rem" }}>No active board.</p>
          )}
        </Section>

        <Section title="Appearance" palette={palette}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.45rem" }}>
            {(["light", "dark"] as ThemeMode[]).map((option) => (
              <button
                key={option}
                onClick={() => setTheme(option)}
                style={{
                  padding: "0.55rem",
                  borderRadius: "8px",
                  border: theme === option ? "1px solid #818cf8" : `1px solid ${palette.border}`,
                  backgroundColor: theme === option ? (dark ? "#312e81" : "#eef2ff") : palette.soft,
                  color: theme === option ? (dark ? "#fff" : "#312e81") : palette.text,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {option === "light" ? "Light" : "Dark"}
              </button>
            ))}
          </div>
          <p style={{ margin: "0.6rem 0 0", color: palette.muted, fontSize: "0.8rem", lineHeight: 1.45 }}>
            Theme is saved on this device.
          </p>
        </Section>

        <Section title="Board Templates" palette={palette}>
          <select
            value={templateId}
            onChange={(e) => { setTemplateId(e.target.value as BoardTemplateId); setTemplateApplied(false); }}
            style={inputStyle(palette)}
            aria-label="Template"
          >
            {BOARD_TEMPLATES.map((template) => (
              <option key={template.id} value={template.id}>{template.name}</option>
            ))}
          </select>
          <p style={{ margin: "0.55rem 0", fontSize: "0.82rem", color: palette.muted, lineHeight: 1.45 }}>
            {BOARD_TEMPLATES.find((template) => template.id === templateId)?.description}
          </p>
          <button onClick={() => void handleApplyTemplate()} disabled={kanbanLoading} style={primaryButtonStyle(!kanbanLoading)}>
            {kanbanLoading ? "Applying..." : templateApplied ? "Applied" : "Apply Template"}
          </button>
          {kanbanError && <InlineMessage tone="error" text={kanbanError} />}
          {pendingTemplateId && (
            <div style={{ marginTop: "0.65rem", padding: "0.65rem", borderRadius: "8px", backgroundColor: dark ? "#422006" : "#fffbeb", border: dark ? "1px solid #854d0e" : "1px solid #fcd34d" }}>
              <p style={{ margin: "0 0 0.55rem", fontSize: "0.8rem", color: dark ? "#fde68a" : "#92400e" }}>
                Your current columns will be replaced. Existing cards will move to the first template column, and new template cards will be added.
              </p>
              <div style={{ display: "flex", gap: "0.45rem" }}>
                <button
                  onClick={() => {
                    const id = pendingTemplateId;
                    setPendingTemplateId(null);
                    void applySelectedTemplate(id);
                  }}
                  style={primaryButtonStyle(true)}
                >
                  Apply Anyway
                </button>
                <button onClick={() => setPendingTemplateId(null)} style={secondaryButtonStyle(palette)}>Cancel</button>
              </div>
            </div>
          )}
        </Section>

        <Section title="Categories" palette={palette}>
          <p style={{ margin: "0 0 0.55rem", fontSize: "0.82rem", color: palette.muted }}>
            Built-in: feature, bug, docs. Add your own below.
          </p>
          {customCategories.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.65rem" }}>
              {customCategories.map((cat) => (
                <span
                  key={cat}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "0.3rem",
                    padding: "0.2rem 0.55rem",
                    borderRadius: "20px",
                    fontSize: "0.78rem", fontWeight: 600,
                    backgroundColor: palette.soft,
                    border: `1px solid ${palette.border}`,
                    color: palette.text,
                  }}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  <button
                    onClick={() => removeCustomCategory(cat)}
                    title={`Remove ${cat}`}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      color: palette.muted, fontSize: "0.8rem", lineHeight: 1,
                      padding: "0 0.1rem",
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: "0.45rem" }}>
            <input
              type="text"
              value={newCatInput}
              onChange={(e) => setNewCatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newCatInput.trim()) {
                  addCustomCategory(newCatInput.trim());
                  setNewCatInput("");
                }
              }}
              placeholder="New category name…"
              style={{ ...inputStyle(palette), flex: 1 }}
            />
            <button
              onClick={() => { if (newCatInput.trim()) { addCustomCategory(newCatInput.trim()); setNewCatInput(""); } }}
              disabled={!newCatInput.trim()}
              style={primaryButtonStyle(!!newCatInput.trim())}
            >
              Add
            </button>
          </div>
        </Section>

        <Section title="Export" palette={palette}>
          <p style={{ margin: "0 0 0.65rem", fontSize: "0.84rem", color: palette.muted }}>
            Export {cards.length} active card{cards.length !== 1 ? "s" : ""}, {archivedEntries.length} archived card{archivedEntries.length !== 1 ? "s" : ""}, and {columns.length} column{columns.length !== 1 ? "s" : ""}.
          </p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button onClick={() => handleExport("json")} style={secondaryButtonStyle(palette)}>Export JSON</button>
            <button onClick={() => handleExport("csv")} style={secondaryButtonStyle(palette)}>Export CSV</button>
          </div>
        </Section>

        <Section title="Project" palette={palette}>
          <CompactRow label="Mode" value={USE_SUPABASE ? "Supabase cloud" : "In-memory demo"} palette={palette} />
          <CompactRow label="Version" value="1.0.0" palette={palette} />
          <CompactRow label="Stack" value="React, TypeScript, Zustand, Vite" palette={palette} />
          <p style={{ margin: "0.55rem 0 0", color: palette.muted, fontSize: "0.8rem", lineHeight: 1.45 }}>
            Personal Kanban board with configurable columns, archive history, stats, templates, due dates, tags, and team boards.
          </p>
        </Section>
      </div>
    </div>
  );
}

interface Palette {
  card: string;
  soft: string;
  border: string;
  heading: string;
  text: string;
  muted: string;
}

function getPalette(dark: boolean): Palette {
  return dark
    ? {
        card: "#111827",
        soft: "#0f172a",
        border: "#334155",
        heading: "#f8fafc",
        text: "#e2e8f0",
        muted: "#94a3b8",
      }
    : {
        card: "#fff",
        soft: "#f8fafc",
        border: "#e2e8f0",
        heading: "#0f172a",
        text: "#334155",
        muted: "#64748b",
      };
}

function Section({ title, palette, children }: { title: string; palette: Palette; children: React.ReactNode }) {
  return (
    <section
      style={{
        backgroundColor: palette.card,
        border: `1px solid ${palette.border}`,
        borderRadius: "12px",
        boxShadow: "0 12px 28px rgba(15,23,42,0.06)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "0.65rem 0.9rem",
          backgroundColor: palette.soft,
          borderBottom: `1px solid ${palette.border}`,
          color: palette.muted,
          fontSize: "0.72rem",
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {title}
      </div>
      <div style={{ padding: "0.9rem" }}>{children}</div>
    </section>
  );
}

function CompactRow({ label, value, palette, mono }: { label: string; value: string; palette: Palette; mono?: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "92px minmax(0, 1fr)", gap: "0.65rem", padding: "0.28rem 0", alignItems: "center" }}>
      <span style={{ color: palette.text, fontSize: "0.82rem", fontWeight: 700 }}>{label}</span>
      <span style={{ color: palette.muted, fontSize: "0.82rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: mono ? "monospace" : "inherit" }}>
        {value}
      </span>
    </div>
  );
}

function InlineMessage({ tone, text }: { tone: "error" | "success"; text: string }) {
  return (
    <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", color: tone === "error" ? "#ef4444" : "#16a34a" }}>
      {text}
    </p>
  );
}

function fieldLabelStyle(palette: Palette): React.CSSProperties {
  return {
    display: "block",
    marginBottom: "0.28rem",
    color: palette.text,
    fontSize: "0.8rem",
    fontWeight: 700,
  };
}

function inputStyle(palette: Palette): React.CSSProperties {
  return {
    width: "100%",
    padding: "0.5rem 0.65rem",
    border: `1px solid ${palette.border}`,
    borderRadius: "8px",
    backgroundColor: palette.soft,
    color: palette.text,
    fontSize: "0.88rem",
    outline: "none",
  };
}

function primaryButtonStyle(enabled: boolean): React.CSSProperties {
  return {
    padding: "0.5rem 0.8rem",
    border: "none",
    borderRadius: "8px",
    background: enabled ? "linear-gradient(135deg, #0f766e, #4f46e5)" : undefined,
    backgroundColor: enabled ? undefined : "#cbd5e1",
    color: "#fff",
    fontSize: "0.84rem",
    fontWeight: 800,
    cursor: enabled ? "pointer" : "not-allowed",
  };
}

function secondaryButtonStyle(palette: Palette): React.CSSProperties {
  return {
    padding: "0.5rem 0.8rem",
    border: `1px solid ${palette.border}`,
    borderRadius: "8px",
    backgroundColor: palette.soft,
    color: palette.text,
    fontSize: "0.84rem",
    fontWeight: 800,
    cursor: "pointer",
  };
}
