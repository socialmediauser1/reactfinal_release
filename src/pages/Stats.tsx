import type { Column } from "../types";
import { useKanbanStore } from "../store/kanbanStore";

function getThroughput(dates: string[]): number {
  const cutoff = Date.now() - 7 * 24 * 3_600_000;
  return dates.filter((d) => !Number.isNaN(Date.parse(d)) && Date.parse(d) >= cutoff).length;
}

function getTodayKey(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

function formatHours(hours: number): string {
  if (hours < 1) return "<1h";
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}

export default function Stats() {
  const columns         = useKanbanStore((s) => s.columns);
  const cards           = useKanbanStore((s) => s.cards);
  const archivedEntries = useKanbanStore((s) => s.archivedEntries);
  const swimlaneGroupBy = useKanbanStore((s) => s.swimlaneGroupBy);

  const sortedColumns = [...columns].sort((a, b) => a.order - b.order);
  const countsByColumn = columns.reduce<Record<string, number>>((acc, col) => {
    acc[col.id] = 0;
    return acc;
  }, {});
  for (const card of cards) {
    countsByColumn[card.columnId] = (countsByColumn[card.columnId] ?? 0) + 1;
  }

  const today = getTodayKey();
  const throughput = getThroughput(archivedEntries.map((e) => e.archivedAt));
  const bugCount = cards.filter((c) => c.category === "bug").length;
  const featureCount = cards.filter((c) => c.category === "feature").length;
  const docsCount = cards.filter((c) => c.category === "docs").length;
  const highPri = cards.filter((c) => c.priority === "high").length;
  const mediumPri = cards.filter((c) => c.priority === "medium").length;
  const lowPri = cards.filter((c) => c.priority === "low").length;
  const overdue = cards.filter((c) => c.dueDate && c.dueDate < today).length;
  const dueToday = cards.filter((c) => c.dueDate === today).length;
  const avgColumnHours = cards.length
    ? cards.reduce((sum, card) => sum + Math.max(0, Date.now() - Date.parse(card.columnEnteredAt)) / 3_600_000, 0) / cards.length
    : 0;
  const tagCounts = cards.reduce<Record<string, number>>((acc, card) => {
    for (const tag of card.tags) {
      acc[tag] = (acc[tag] ?? 0) + 1;
    }
    return acc;
  }, {});
  const topTags = Object.entries(tagCounts)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 8);

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "#1a1a2e" }}>Stats</h1>
        <p style={{ margin: "0.3rem 0 0", color: "#6b7280", fontSize: "0.875rem" }}>
          Metrics derived from the current board state.
        </p>
      </div>

      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={sectionTitleStyle}>Column Load</h2>
        <div style={tileGridStyle}>
          {sortedColumns.map((col) => (
            <StatCard
              key={col.id}
              title={col.title}
              count={countsByColumn[col.id] ?? 0}
              wipLimit={col.wipLimit}
            />
          ))}
        </div>
      </section>

      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={sectionTitleStyle}>Board Summary</h2>
        <div style={tileGridStyle}>
          <SummaryTile label="Total active" value={cards.length} accent="#4f46e5" />
          <SummaryTile label="Archived (7d)" value={throughput} accent="#16a34a" />
          <SummaryTile label="Overdue" value={overdue} accent="#dc2626" />
          <SummaryTile label="Due today" value={dueToday} accent="#d97706" />
          <SummaryTile label="Avg time in column" value={formatHours(avgColumnHours)} accent="#0891b2" />
          <SummaryTile label="High priority" value={highPri} accent="#b91c1c" />
          <SummaryTile label="Medium priority" value={mediumPri} accent="#b45309" />
          <SummaryTile label="Low priority" value={lowPri} accent="#15803d" />
          <SummaryTile label="Bugs" value={bugCount} accent="#dc2626" />
          <SummaryTile label="Features" value={featureCount} accent="#1d4ed8" />
          <SummaryTile label="Docs" value={docsCount} accent="#15803d" />
        </div>
      </section>

      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={sectionTitleStyle}>Tags</h2>
        <div style={panelStyle}>
          {topTags.length === 0 ? (
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#94a3b8" }}>No tagged cards yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {topTags.map(([tag, count]) => (
                <BarRow key={tag} label={`#${tag}`} value={count} max={topTags[0][1]} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section>
        <div style={panelStyle}>
          <h2 style={{ margin: "0 0 0.6rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>
            View Settings
          </h2>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#6b7280" }}>
            Swimlane grouping: <strong style={{ color: "#1a1a2e" }}>{swimlaneGroupBy ?? "none"}</strong>
          </p>
        </div>
      </section>
    </div>
  );
}

function StatCard({ title, count, wipLimit }: { title: Column["title"]; count: number; wipLimit?: number }) {
  const reached = wipLimit !== undefined && count >= wipLimit;
  const pct = wipLimit ? Math.min(100, Math.round((count / wipLimit) * 100)) : null;

  return (
    <div style={{ ...cardStyle, backgroundColor: reached ? "#fef2f2" : "#fff", border: reached ? "1px solid #fca5a5" : "1px solid #e8eaed" }}>
      <div style={{ fontSize: "1.75rem", fontWeight: 800, color: reached ? "#b91c1c" : "#1a1a2e", lineHeight: 1 }}>
        {count}
      </div>
      <div style={{ fontSize: "0.82rem", color: "#6b7280", marginTop: "0.25rem", fontWeight: 500 }}>{title}</div>
      {wipLimit !== undefined && (
        <>
          <div style={{ marginTop: "0.5rem", height: "4px", borderRadius: "2px", backgroundColor: "#f0f0f0", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct ?? 0}%`, backgroundColor: reached ? "#ef4444" : "#4f46e5", borderRadius: "2px" }} />
          </div>
          <div style={{ fontSize: "0.7rem", color: reached ? "#b91c1c" : "#9ca3af", marginTop: "0.3rem" }}>
            WIP {count}/{wipLimit}{reached ? " - Limit reached" : ""}
          </div>
        </>
      )}
    </div>
  );
}

function SummaryTile({ label, value, accent }: { label: string; value: number | string; accent: string }) {
  return (
    <div style={{ ...cardStyle, borderLeft: `4px solid ${accent}` }}>
      <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#1a1a2e", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: "0.78rem", color: "#6b7280", marginTop: "0.2rem" }}>{label}</div>
    </div>
  );
}

function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  const width = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#475569", marginBottom: "0.25rem" }}>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div style={{ height: "6px", backgroundColor: "#f1f5f9", borderRadius: "999px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${width}%`, backgroundColor: "#4f46e5" }} />
      </div>
    </div>
  );
}

const sectionTitleStyle: React.CSSProperties = {
  margin: "0 0 0.75rem",
  fontSize: "0.95rem",
  fontWeight: 700,
  color: "#374151",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const tileGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
  gap: "0.75rem",
};

const cardStyle: React.CSSProperties = {
  backgroundColor: "#fff",
  border: "1px solid #e8eaed",
  borderRadius: "10px",
  padding: "0.85rem 1rem",
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
};

const panelStyle: React.CSSProperties = {
  backgroundColor: "#fff",
  border: "1px solid #e8eaed",
  borderRadius: "10px",
  padding: "1rem 1.25rem",
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
};
