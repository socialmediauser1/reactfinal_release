import { useKanbanStore } from "../store/kanbanStore";
import type { CardCategory } from "../types";

const CATEGORY_CHIP: Record<CardCategory, { bg: string; text: string }> = {
  bug:     { bg: "#fef2f2", text: "#b91c1c" },
  feature: { bg: "#eff6ff", text: "#1d4ed8" },
  docs:    { bg: "#f0fdf4", text: "#15803d" },
};

function formatTimestamp(isoDate: string): string {
  const parsed = Date.parse(isoDate);
  if (Number.isNaN(parsed)) return "Unknown time";
  return new Date(parsed).toLocaleString();
}

export default function Archive() {
  const columns             = useKanbanStore((s) => s.columns);
  const archivedEntries     = useKanbanStore((s) => s.archivedEntries);
  const loading             = useKanbanStore((s) => s.loading);
  const error               = useKanbanStore((s) => s.error);
  const restoreArchivedCard = useKanbanStore((s) => s.restoreArchivedCard);

  const defaultColumnId = [...columns].sort((a, b) => a.order - b.order)[0]?.id;

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "#1a1a2e" }}>
          Archive
          <span style={{ marginLeft: "0.5rem", fontSize: "1rem", fontWeight: 500, color: "#888" }}>
            ({archivedEntries.length} card{archivedEntries.length !== 1 ? "s" : ""})
          </span>
        </h1>
        <p style={{ margin: "0.3rem 0 0", color: "#6b7280", fontSize: "0.875rem" }}>
          Archived cards preserve their full history and can be restored at any time.
        </p>
        {error && (
          <p style={{ margin: "0.5rem 0 0", color: "#b91c1c", fontSize: "0.85rem" }}>{error}</p>
        )}
      </div>

      {archivedEntries.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "3rem 1rem",
            backgroundColor: "#fff",
            borderRadius: "12px",
            border: "1px solid #e8eaed",
            color: "#9ca3af",
          }}
        >
          <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>📦</div>
          <p style={{ margin: 0, fontSize: "0.9rem" }}>No archived cards yet.</p>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem" }}>
            Archive a card from the Board page to see it here.
          </p>
        </div>
      ) : (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "1rem",
          }}
        >
          {archivedEntries.map((entry) => (
            <li
              key={entry.card.id}
              style={{
                backgroundColor: "#fff",
                borderRadius: "10px",
                border: "1px solid #e8eaed",
                borderLeft: `3px solid ${CATEGORY_CHIP[entry.card.category].text}`,
                padding: "1rem",
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                display: "flex",
                flexDirection: "column",
                gap: "0.4rem",
              }}
            >
              <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "#1a1a2e" }}>
                {entry.card.title}
              </div>

              {entry.card.description && (
                <div style={{ fontSize: "0.8rem", color: "#6b7280", lineHeight: 1.4 }}>
                  {entry.card.description}
                </div>
              )}

              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                <Chip label={entry.card.category} category={entry.card.category} />
                {entry.card.priority && <Chip label={entry.card.priority} dim />}
                {entry.card.dueDate && <Chip label={`due ${entry.card.dueDate}`} dim />}
                {entry.card.tags.map((tag) => (
                  <Chip key={tag} label={`#${tag}`} dim />
                ))}
                {entry.card.assignee && (
                  <Chip label={`👤 ${entry.card.assignee}`} dim />
                )}
              </div>

              <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.1rem" }}>
                Archived: {formatTimestamp(entry.archivedAt)}
                {entry.card.moves.length > 0 && ` · ${entry.card.moves.length} move${entry.card.moves.length !== 1 ? "s" : ""}`}
              </div>

              {defaultColumnId && (
                <button
                  onClick={() => void restoreArchivedCard(entry.card.id, defaultColumnId)}
                  disabled={loading}
                  style={{
                    marginTop: "0.35rem",
                    padding: "0.4rem 0.75rem",
                    backgroundColor: loading ? "#a5b4fc" : "#4f46e5",
                    color: "#fff",
                    border: "none",
                    borderRadius: "7px",
                    cursor: loading ? "not-allowed" : "pointer",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    alignSelf: "flex-start",
                  }}
                >
                  {loading ? "Restoring..." : "Restore to Board"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Chip({ label, dim, category }: { label: string; dim?: boolean; category?: CardCategory }) {
  const colors = category ? CATEGORY_CHIP[category] : null;
  return (
    <span
      style={{
        fontSize: "0.68rem",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        padding: "0.1rem 0.4rem",
        borderRadius: "4px",
        backgroundColor: dim ? "#f3f4f6" : colors ? colors.bg : "#eef2ff",
        color: dim ? "#6b7280" : colors ? colors.text : "#4f46e5",
      }}
    >
      {label}
    </span>
  );
}
