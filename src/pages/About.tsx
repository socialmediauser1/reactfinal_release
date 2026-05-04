export default function About() {
  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 700, color: "#111827", letterSpacing: "-0.02em" }}>
          About
        </h1>
        <p style={{ margin: "0.3rem 0 0", color: "#6b7280", fontSize: "0.875rem" }}>
          Project info and tech stack.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: "600px" }}>

        <InfoCard>
          <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.1rem", fontWeight: 700, color: "#111827" }}>
            Personal Kanban Board
          </h2>
          <p style={{ margin: 0, fontSize: "0.875rem", color: "#6b7280", lineHeight: 1.6 }}>
            A full-stack visual task management application. Organize work across configurable
            columns, assign priorities and categories, filter and group cards with swimlanes,
            and collaborate with teammates on shared team boards.
          </p>
        </InfoCard>

        <InfoCard title="Features">
          <ul style={{ margin: 0, paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
            {[
              "Create, edit, archive, and delete cards",
              "Drag-and-drop card movement between columns",
              "WIP limits per column with visual warnings",
              "Category labels: Bug, Feature, Docs",
              "Priority levels: High, Medium, Low",
              "Assignee avatars on team boards",
              "Swimlane grouping by category, priority, or assignee",
              "Search and category filter bar",
              "Card age and time-in-column tracking",
              "Personal boards + multi-user team boards (join by code)",
              "Archive history with restore",
              "Board statistics and metrics",
            ].map((f) => (
              <li key={f} style={{ fontSize: "0.875rem", color: "#374151" }}>{f}</li>
            ))}
          </ul>
        </InfoCard>

        <InfoCard title="Tech Stack">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.5rem",
            }}
          >
            {[
              ["Frontend",     "React 18 + TypeScript"],
              ["Build Tool",   "Vite"],
              ["Routing",      "React Router v6"],
              ["State",        "Zustand"],
              ["Backend",      "Supabase (PostgreSQL)"],
              ["Auth",         "Supabase Auth"],
              ["Persistence",  "Row Level Security (RLS)"],
              ["Styling",      "CSS-in-JS (inline styles)"],
            ].map(([k, v]) => (
              <div key={k} style={{ padding: "0.5rem 0.75rem", backgroundColor: "#f8f9fa", borderRadius: "7px" }}>
                <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>{k}</div>
                <div style={{ fontSize: "0.84rem", color: "#111827", marginTop: "0.15rem" }}>{v}</div>
              </div>
            ))}
          </div>
        </InfoCard>

        <InfoCard title="Version">
          <p style={{ margin: 0, fontSize: "0.875rem", color: "#6b7280" }}>
            <strong style={{ color: "#111827" }}>1.0.0</strong> - SDT210 Assignment 5
          </p>
        </InfoCard>

      </div>
    </div>
  );
}

function InfoCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        backgroundColor: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        overflow: "hidden",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      {title && (
        <div
          style={{
            padding: "0.7rem 1.25rem",
            backgroundColor: "#f8f9fa",
            borderBottom: "1px solid #e2e8f0",
            fontSize: "0.75rem",
            fontWeight: 700,
            color: "#6b7280",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {title}
        </div>
      )}
      <div style={{ padding: "1.1rem 1.25rem" }}>
        {children}
      </div>
    </div>
  );
}
