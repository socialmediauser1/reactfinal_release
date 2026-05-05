import { useEffect, useState } from "react";
import { useKanbanStore, BUILT_IN_CATEGORIES } from "../store/kanbanStore";
import { useBoardsStore } from "../store/boardsStore";
import { useThemeStore } from "../store/themeStore";
import type {
  Card,
  CardPriority,
  CardSortMode,
  Column,
  DueStatusFilter,
  SwimlaneGroupBy,
} from "../types";
import type { UpdateCardRequest } from "../services/api";
import { getDueLabel, getDueStatus, normalizeTags, sortCards } from "../lib/kanbanUtils";

const BUILT_IN_CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  bug:     { bg: "#fef2f2", text: "#b91c1c", border: "#fca5a5" },
  feature: { bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd" },
  docs:    { bg: "#f0fdf4", text: "#15803d", border: "#86efac" },
};

function getCategoryColor(cat: string): { bg: string; text: string; border: string } {
  if (BUILT_IN_CATEGORY_COLORS[cat]) return BUILT_IN_CATEGORY_COLORS[cat];
  const hue = [...cat].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return { bg: `hsl(${hue},65%,95%)`, text: `hsl(${hue},55%,28%)`, border: `hsl(${hue},45%,75%)` };
}

const PRIORITY_CONFIG: Record<CardPriority, { bg: string; text: string; border: string; icon: string; label: string }> = {
  high:   { bg: "#fef2f2", text: "#b91c1c", border: "#fca5a5", icon: "H", label: "High"   },
  medium: { bg: "#fffbeb", text: "#b45309", border: "#fcd34d", icon: "M", label: "Medium" },
  low:    { bg: "#f0fdf4", text: "#15803d", border: "#86efac", icon: "L", label: "Low"    },
};

const COLUMN_ACCENTS = ["#4f46e5", "#0891b2", "#16a34a", "#d97706", "#9333ea"];

function formatAge(isoDate: string): string {
  const hours = Math.max(0, Math.floor((Date.now() - Date.parse(isoDate)) / 3_600_000));
  if (Number.isNaN(hours)) return "?";
  if (hours < 1) return "<1h";
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function formatTimestampShort(isoDate: string): string {
  const parsed = Date.parse(isoDate);
  if (Number.isNaN(parsed)) return "Unknown time";
  return new Date(parsed).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type SwimlaneGroup = { key: string; label: string; cards: Card[] };

function groupCards(cards: Card[], groupBy: SwimlaneGroupBy | null): SwimlaneGroup[] {
  if (!groupBy) return [{ key: "_all", label: "", cards }];
  const buckets = new Map<string, Card[]>();
  for (const card of cards) {
    const key =
      groupBy === "category"
        ? card.category
        : groupBy === "priority"
          ? (card.priority ?? "none")
          : (card.assignee ?? "Unassigned");
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(card);
  }
  return Array.from(buckets.entries()).map(([key, grouped]) => ({
    key,
    label: key.charAt(0).toUpperCase() + key.slice(1),
    cards: grouped,
  }));
}

export default function Board() {
  const columns          = useKanbanStore((s) => s.columns);
  const cards            = useKanbanStore((s) => s.cards);
  const filter           = useKanbanStore((s) => s.filter);
  const swimlaneGroupBy  = useKanbanStore((s) => s.swimlaneGroupBy);
  const loading          = useKanbanStore((s) => s.loading);
  const error            = useKanbanStore((s) => s.error);
  const addCard          = useKanbanStore((s) => s.addCard);
  const editCard         = useKanbanStore((s) => s.editCard);
  const moveCard         = useKanbanStore((s) => s.moveCard);
  const archiveCard      = useKanbanStore((s) => s.archiveCard);
  const deleteCard       = useKanbanStore((s) => s.deleteCard);
  const setFilter        = useKanbanStore((s) => s.setFilter);
  const setSwimlaneGroupBy = useKanbanStore((s) => s.setSwimlaneGroupBy);
  const addColumn           = useKanbanStore((s) => s.addColumn);
  const editColumn          = useKanbanStore((s) => s.editColumn);
  const removeColumn        = useKanbanStore((s) => s.removeColumn);
  const reorderColumns      = useKanbanStore((s) => s.reorderColumns);
  const customCategories    = useKanbanStore((s) => s.customCategories);
  const addCustomCategory   = useKanbanStore((s) => s.addCustomCategory);
  const theme               = useThemeStore((s) => s.theme);

  const boards          = useBoardsStore((s) => s.boards);
  const activeBoardId   = useBoardsStore((s) => s.activeBoardId);
  const boardMembers    = useBoardsStore((s) => s.boardMembers);
  const activeBoard     = boards.find((b) => b.id === activeBoardId);
  const isTeamBoard     = activeBoard?.type === "team";
  const members         = boardMembers;
  const dark            = theme === "dark";
  const boardTitle      = activeBoard
    ? activeBoard.type === "personal"
      ? "Personal"
      : activeBoard.name
    : "Board";

  const [createModalColumnId, setCreateModalColumnId] = useState<string | null>(null);
  const [editingCard, setEditingCard]                 = useState<Card | null>(null);
  const [creatingColumn, setCreatingColumn]           = useState(false);
  const [columnModalTarget, setColumnModalTarget]     = useState<string | null>(null);

  const [draggingCardId, setDraggingCardId]     = useState<string | null>(null);
  const [draggingColumnId, setDraggingColumnId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);

  type PendingDelete =
    | { type: "card";   id: string; title: string }
    | { type: "column"; id: string; title: string };
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  const sortedColumns = [...columns].sort((a, b) => a.order - b.order);

  const filteredCards = cards.filter((card) => {
    if (filter.category && card.category !== filter.category) return false;
    if (filter.tag && !card.tags.includes(filter.tag)) return false;
    if (filter.dueStatus !== "all" && getDueStatus(card) !== filter.dueStatus) return false;
    if (filter.searchQuery) {
      const q = filter.searchQuery.toLowerCase();
      if (
        !card.title.toLowerCase().includes(q) &&
        !card.description.toLowerCase().includes(q) &&
        !card.tags.some((tag) => tag.includes(q))
      )
        return false;
    }
    return true;
  });

  const handleCreateCardSubmit = async (values: {
    title: string; description: string; category: string;
    priority: CardPriority; assignee: string; columnId: string; dueDate: string; tags: string;
  }) => {
    addCustomCategory(values.category);
    await addCard({
      ...values,
      assignee: values.assignee || undefined,
      dueDate: values.dueDate || undefined,
      tags: normalizeTags(values.tags),
    });
    if (!useKanbanStore.getState().error) setCreateModalColumnId(null);
  };

  const handleEditCardSubmit = async (cardId: string, payload: UpdateCardRequest) => {
    if (payload.category) addCustomCategory(payload.category);
    await editCard(cardId, payload);
    if (!useKanbanStore.getState().error) setEditingCard(null);
  };

  const handleDeleteColumn = (columnId: string) => {
    const col = columns.find((c) => c.id === columnId);
    setPendingDelete({ type: "column", id: columnId, title: col?.title ?? "this column" });
  };

  const editingColumn = columnModalTarget
    ? columns.find((c) => c.id === columnModalTarget) ?? null
    : null;

  const cardCategories = Array.from(new Set(cards.map((c) => c.category)));
  const allCategories = [
    ...BUILT_IN_CATEGORIES,
    ...customCategories.filter((c) => !BUILT_IN_CATEGORIES.includes(c)),
    ...cardCategories.filter((c) => !BUILT_IN_CATEGORIES.includes(c) && !customCategories.includes(c)),
  ];
  const categoryOptions: Array<{ value: string | null; label: string }> = [
    { value: null, label: "All" },
    ...allCategories.map((c) => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) })),
  ];

  const dueOptions: Array<{ value: DueStatusFilter; label: string }> = [
    { value: "all", label: "All due" },
    { value: "overdue", label: "Overdue" },
    { value: "today", label: "Today" },
    { value: "upcoming", label: "Upcoming" },
    { value: "none", label: "No due date" },
  ];

  const sortOptions: Array<{ value: CardSortMode; label: string }> = [
    { value: "created", label: "Newest" },
    { value: "priority", label: "Priority" },
    { value: "dueDate", label: "Due date" },
    { value: "title", label: "Title" },
  ];

  const tagOptions = Array.from(new Set(cards.flatMap((card) => card.tags))).sort();

  const swimlaneOptions: Array<{ value: SwimlaneGroupBy | null; label: string }> = [
    { value: null,       label: "None" },
    { value: "category", label: "Category" },
    { value: "assignee", label: "Assignee" },
    { value: "priority", label: "Priority" },
  ];

  return (
    <div style={{ color: dark ? "#e2e8f0" : "#111827" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "1rem",
          flexWrap: "wrap",
          marginBottom: "1.25rem",
          padding: "1.1rem 1.2rem",
          backgroundColor: dark ? "#111827" : "rgba(255,255,255,0.78)",
          border: dark ? "1px solid #334155" : "1px solid #e2e8f0",
          borderRadius: "14px",
          boxShadow: "0 12px 30px rgba(15,23,42,0.06)",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 700, color: dark ? "#f8fafc" : "#111827", letterSpacing: 0 }}>
            {boardTitle}
            <span style={{ marginLeft: "0.5rem", fontSize: "0.9rem", fontWeight: 400, color: dark ? "#94a3b8" : "#9ca3af" }}>
              {cards.length} card{cards.length !== 1 ? "s" : ""}
            </span>
          </h1>
          {error ? (
            <p style={{ margin: "0.4rem 0 0", color: "#b91c1c", fontSize: "0.85rem" }}>{error}</p>
          ) : null}
          {loading ? (
            <p style={{ margin: "0.4rem 0 0", color: "#64748b", fontSize: "0.82rem" }}>
              Syncing board data...
            </p>
          ) : null}
        </div>
        <div style={{ display: "flex", gap: "0.55rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button
            onClick={() => setCreatingColumn(true)}
            disabled={loading}
            aria-label="Create column or swimlane"
            style={{
              padding: "0.5rem 0.95rem",
              backgroundColor: dark ? "#0f172a" : "#fff",
              color: dark ? "#e2e8f0" : "#334155",
              border: dark ? "1px solid #475569" : "1px solid #cbd5e1",
              borderRadius: "8px",
              fontWeight: 700,
              fontSize: "0.875rem",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            + Column
          </button>
          <button
            onClick={() => setCreateModalColumnId(sortedColumns[0]?.id ?? "")}
            disabled={loading || sortedColumns.length === 0}
          style={{
            padding: "0.5rem 1.1rem",
            background: "linear-gradient(135deg, #0f766e, #4f46e5)",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            fontWeight: 600,
            fontSize: "0.875rem",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
            boxShadow: "0 10px 22px rgba(79,70,229,0.22)",
            letterSpacing: "0.01em",
          }}
          >
            + New Card
          </button>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5rem",
          alignItems: "center",
          padding: "0.6rem 1rem",
          backgroundColor: dark ? "#111827" : "rgba(255,255,255,0.86)",
          borderRadius: "14px",
          border: dark ? "1px solid #334155" : "1px solid #e2e8f0",
          marginBottom: "1.5rem",
          boxShadow: "0 10px 26px rgba(15,23,42,0.05)",
        }}
      >
        <input
          type="text"
          placeholder="Search cards..."
          value={filter.searchQuery}
          onChange={(e) => void setFilter({ searchQuery: e.target.value })}
          style={{
            padding: "0.35rem 0.75rem",
            border: "1px solid #e0e0e0",
            borderRadius: "6px",
            fontSize: "0.84rem",
            minWidth: "180px",
            outline: "none",
            backgroundColor: dark ? "#0f172a" : "#fff",
            color: dark ? "#e2e8f0" : "#374151",
            borderColor: dark ? "#334155" : "#e0e0e0",
          }}
        />

        <Divider />
        <Label text="Category" />
        <select
          aria-label="Category filter"
          value={filter.category ?? ""}
          onChange={(e) => void setFilter({ category: e.target.value || null })}
          style={toolbarSelectStyle}
        >
          {categoryOptions.map(({ value, label }) => (
            <option key={String(value)} value={value ?? ""}>{label}</option>
          ))}
        </select>

        <Divider />
        <Label text="Due" />
        <select
          aria-label="Due status"
          value={filter.dueStatus}
          onChange={(e) => void setFilter({ dueStatus: e.target.value as DueStatusFilter })}
          style={toolbarSelectStyle}
        >
          {dueOptions.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        <Label text="Tag" />
        <select
          aria-label="Tag filter"
          value={filter.tag ?? ""}
          onChange={(e) => void setFilter({ tag: e.target.value || null })}
          style={toolbarSelectStyle}
        >
          <option value="">All tags</option>
          {tagOptions.map((tag) => (
            <option key={tag} value={tag}>{tag}</option>
          ))}
        </select>

        <Divider />
        <Label text="Sort" />
        <select
          aria-label="Sort cards"
          value={filter.sortMode}
          onChange={(e) => void setFilter({ sortMode: e.target.value as CardSortMode })}
          style={toolbarSelectStyle}
        >
          {sortOptions.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        <Divider />
        <Label text="Group" />
        {swimlaneOptions.map(({ value, label }) => (
          <FilterChip
            key={String(value)}
            label={label}
            active={swimlaneGroupBy === value}
            onClick={() => void setSwimlaneGroupBy(value)}
          />
        ))}
      </div>

      <div style={{ overflowX: "auto", paddingBottom: "0.5rem" }}>
        <section
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${sortedColumns.length}, minmax(260px, 1fr))`,
            gap: "1.25rem",
            alignItems: "start",
            minWidth: sortedColumns.length > 1 ? `${sortedColumns.length * 280}px` : "260px",
          }}
        >
          {sortedColumns.map((column, colIdx) => {
            const cardsInColumn = sortCards(
              filteredCards.filter((c) => c.columnId === column.id),
              filter.sortMode
            );
            const accentColor = COLUMN_ACCENTS[colIdx % COLUMN_ACCENTS.length];
            return (
              <BoardColumn
                key={column.id}
                column={column}
                cards={cardsInColumn}
                members={members}
                accentColor={accentColor}
                swimlaneGroupBy={swimlaneGroupBy}
                loading={loading}
                dark={dark}
                draggingCardId={draggingCardId}
                isDragOver={dragOverColumnId === column.id}
                canDeleteColumn={sortedColumns.length > 2}
                onArchiveCard={(id) => void archiveCard(id)}
                onDeleteCard={(id) => {
                  const card = cards.find((c) => c.id === id);
                  setPendingDelete({ type: "card", id, title: card?.title ?? "this card" });
                }}
                onEditCard={(card) => setEditingCard(card)}
                onAddCard={() => setCreateModalColumnId(column.id)}
                onEditColumn={() => setColumnModalTarget(column.id)}
                onDeleteColumn={() => handleDeleteColumn(column.id)}
                isDraggingColumn={draggingColumnId === column.id}
                onColumnHeaderDragStart={() => setDraggingColumnId(column.id)}
                onColumnHeaderDragEnd={() => { setDraggingColumnId(null); setDragOverColumnId(null); }}
                onCardDragStart={(id) => setDraggingCardId(id)}
                onCardDragEnd={() => { setDraggingCardId(null); setDragOverColumnId(null); }}
                onColumnDragOver={() => setDragOverColumnId(column.id)}
                onColumnDragLeave={() => setDragOverColumnId(null)}
                onColumnDrop={() => {
                  if (draggingColumnId && draggingColumnId !== column.id) {
                    const fromIdx = sortedColumns.findIndex((c) => c.id === draggingColumnId);
                    const toIdx   = sortedColumns.findIndex((c) => c.id === column.id);
                    if (fromIdx !== -1 && toIdx !== -1) {
                      const newOrder = [...sortedColumns];
                      const [moved] = newOrder.splice(fromIdx, 1);
                      newOrder.splice(toIdx, 0, moved);
                      void reorderColumns(newOrder.map((c) => c.id));
                    }
                    setDraggingColumnId(null);
                  } else if (draggingCardId) {
                    void moveCard(draggingCardId, column.id);
                    setDraggingCardId(null);
                  }
                  setDragOverColumnId(null);
                }}
              />
            );
          })}
        </section>
      </div>

      {createModalColumnId !== null && (
        <CardFormModal
          mode="create"
          columns={sortedColumns}
          defaultColumnId={createModalColumnId || sortedColumns[0]?.id}
          isTeamBoard={isTeamBoard}
          members={members}
          customCategories={customCategories}
          storeError={error}
          onSubmit={(v) => void handleCreateCardSubmit(v)}
          onCancel={() => setCreateModalColumnId(null)}
        />
      )}
      {editingCard !== null && (
        <CardFormModal
          mode="edit"
          initialValues={{
            title: editingCard.title,
            description: editingCard.description,
            category: editingCard.category,
            priority: editingCard.priority ?? "medium",
            assignee: editingCard.assignee ?? "",
            columnId: editingCard.columnId,
            dueDate: editingCard.dueDate ?? "",
            tags: editingCard.tags.join(", "),
          }}
          activityCard={editingCard}
          columns={sortedColumns}
          isTeamBoard={isTeamBoard}
          members={members}
          customCategories={customCategories}
          storeError={error}
          onSubmit={(v) =>
            void handleEditCardSubmit(editingCard.id, {
              title: v.title, description: v.description,
              category: v.category,
              priority: v.priority,
              assignee: v.assignee,
              dueDate: v.dueDate || null,
              tags: normalizeTags(v.tags),
            })
          }
          onCancel={() => setEditingCard(null)}
        />
      )}
      {creatingColumn && (
        <ColumnFormModal
          mode="create"
          onSubmit={(title, wipLimit) => {
            void addColumn({ title, wipLimit });
            setCreatingColumn(false);
          }}
          onCancel={() => setCreatingColumn(false)}
        />
      )}
      {columnModalTarget !== null && editingColumn && (
        <ColumnFormModal
          mode="edit"
          initialValues={{
            title: editingColumn.title,
            wipLimit: editingColumn.wipLimit !== undefined ? String(editingColumn.wipLimit) : "",
          }}
          onSubmit={(title, wipLimit) => {
            void editColumn(columnModalTarget, { title, wipLimit });
            setColumnModalTarget(null);
          }}
          onCancel={() => setColumnModalTarget(null)}
        />
      )}
      {pendingDelete !== null && (
        <ConfirmModal
          title={pendingDelete.type === "card" ? "Delete card?" : "Delete column?"}
          message={
            pendingDelete.type === "card"
              ? `"${pendingDelete.title}" will be permanently removed.`
              : `Column "${pendingDelete.title}" will be deleted and its cards moved to the next column.`
          }
          onConfirm={() => {
            if (pendingDelete.type === "card") {
              void deleteCard(pendingDelete.id);
            } else {
              const fallback = sortedColumns.find((c) => c.id !== pendingDelete.id)?.id;
              void removeColumn(pendingDelete.id, fallback);
            }
            setPendingDelete(null);
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}

function Divider() {
  return <div style={{ width: "1px", height: "18px", backgroundColor: "#e5e7eb", margin: "0 0.1rem" }} />;
}
function Label({ text }: { text: string }) {
  return <span style={{ fontSize: "0.72rem", color: "#9ca3af", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>{text}</span>;
}
function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "0.25rem 0.65rem",
        fontSize: "0.78rem",
        fontWeight: active ? 600 : 400,
        backgroundColor: active ? "#4f46e5" : hovered ? "#e8eaed" : "#f3f4f6",
        color: active ? "#fff" : "#555",
        border: "1px solid",
        borderColor: active ? "#4f46e5" : hovered ? "#c9cbd0" : "#e0e0e0",
        borderRadius: "20px",
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );
}

function AddCardButton({ onClick, disabled, accentColor, dark }: { onClick: () => void; disabled: boolean; accentColor: string; dark: boolean }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{ padding: "0 0.75rem 0.75rem" }}>
      <button
        onClick={onClick}
        disabled={disabled}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: "100%",
          padding: "0.4rem",
          fontSize: "0.8rem",
          backgroundColor: hovered && !disabled ? `${accentColor}18` : "transparent",
          border: `1.5px dashed ${hovered && !disabled ? accentColor : "#d1d5db"}`,
          borderRadius: "7px",
          cursor: disabled ? "not-allowed" : "pointer",
          color: hovered && !disabled ? accentColor : dark ? "#64748b" : "#9ca3af",
          fontWeight: hovered && !disabled ? 600 : 400,
          transition: "all 0.2s",
        }}
      >
        + Add Card
      </button>
    </div>
  );
}

function BoardColumn({
  column, cards, members, swimlaneGroupBy, loading, draggingCardId, isDragOver,
  isDraggingColumn,
  dark,
  canDeleteColumn, accentColor, onArchiveCard, onDeleteCard, onEditCard, onAddCard,
  onEditColumn, onDeleteColumn, onCardDragStart, onCardDragEnd,
  onColumnDragOver, onColumnDragLeave, onColumnDrop,
  onColumnHeaderDragStart, onColumnHeaderDragEnd,
}: {
  column: Column; cards: Card[]; members: { email: string; displayName?: string }[];
  swimlaneGroupBy: SwimlaneGroupBy | null;
  loading: boolean; draggingCardId: string | null; isDragOver: boolean;
  isDraggingColumn: boolean;
  dark: boolean;
  canDeleteColumn: boolean; accentColor: string;
  onArchiveCard: (id: string) => void; onDeleteCard: (id: string) => void;
  onEditCard: (card: Card) => void; onAddCard: () => void;
  onEditColumn: () => void; onDeleteColumn: () => void;
  onCardDragStart: (id: string) => void; onCardDragEnd: () => void;
  onColumnDragOver: () => void; onColumnDragLeave: () => void;
  onColumnDrop: () => void;
  onColumnHeaderDragStart: () => void; onColumnHeaderDragEnd: () => void;
}) {
  const count = cards.length;
  const wipReached = column.wipLimit !== undefined && count >= column.wipLimit;
  const groups = groupCards(cards, swimlaneGroupBy);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); onColumnDragOver(); }}
      onDragLeave={onColumnDragLeave}
      onDrop={(e) => { e.preventDefault(); onColumnDrop(); }}
      style={{
        backgroundColor: isDragOver ? (dark ? "#1e1b4b" : "#f5f3ff") : (dark ? "#0f172a" : "#f8fafc"),
        borderRadius: "14px",
        border: isDragOver
          ? `2px dashed ${accentColor}`
          : wipReached
            ? "1px solid #fca5a5"
            : dark ? "1px solid #334155" : "1px solid #dbe3ef",
        boxShadow: isDragOver ? `0 14px 34px ${accentColor}22` : "0 14px 30px rgba(15,23,42,0.07)",
        display: "flex",
        flexDirection: "column",
        minHeight: "300px",
        transition: "background-color 0.15s, border-color 0.15s, box-shadow 0.15s, opacity 0.15s",
        overflow: "hidden",
        opacity: isDraggingColumn ? 0.45 : 1,
      }}
    >
      <div
        style={{
          padding: "0.85rem 0.95rem 0.7rem",
          borderBottom: dark ? "1px solid #334155" : "1px solid #eaecef",
          borderTop: `3px solid ${accentColor}`,
          backgroundColor: dark ? "#111827" : "rgba(255,255,255,0.96)",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        <span
          draggable
          onDragStart={(e) => { e.stopPropagation(); onColumnHeaderDragStart(); }}
          onDragEnd={onColumnHeaderDragEnd}
          title="Drag to reorder column"
          style={{
            cursor: "grab",
            color: dark ? "#475569" : "#d1d5db",
            fontSize: "1rem",
            lineHeight: 1,
            userSelect: "none",
            flexShrink: 0,
          }}
        >
          ⠿
        </span>
        <strong style={{ flex: 1, fontSize: "0.875rem", color: dark ? "#f8fafc" : "#111827", letterSpacing: 0 }}>
          {column.title}
        </strong>
        <span
          style={{
            fontSize: "0.7rem",
            fontWeight: 700,
            padding: "0.15rem 0.5rem",
            borderRadius: "20px",
            backgroundColor: wipReached ? "#fef2f2" : `${accentColor}18`,
            color: wipReached ? "#b91c1c" : accentColor,
          }}
        >
          {column.wipLimit !== undefined ? `${count}/${column.wipLimit}` : count}
        </span>
        <button
          onClick={onEditColumn}
          disabled={loading}
          title="Edit column"
          style={{
            fontSize: "0.7rem",
            padding: "0.15rem 0.4rem",
            backgroundColor: "transparent",
            border: "1px solid #e5e7eb",
            borderRadius: "5px",
            cursor: "pointer",
            color: "#6b7280",
          }}
        >
          Edit
        </button>
        {canDeleteColumn && (
          <button
            onClick={onDeleteColumn}
            disabled={loading}
            title="Delete column"
            style={{
              fontSize: "0.7rem",
              padding: "0.15rem 0.4rem",
              backgroundColor: "transparent",
              border: "1px solid #fca5a5",
              borderRadius: "5px",
              cursor: "pointer",
              color: "#ef4444",
            }}
          >
            Del
          </button>
        )}
      </div>

      <div style={{ flex: 1, padding: "0.6rem" }}>
        {cards.length === 0 ? (
          <div style={{ padding: "2rem 1rem", textAlign: "center", color: dark ? "#475569" : "#d1d5db" }}>
            <p style={{ margin: 0, fontSize: "0.8rem" }}>No cards</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {groups.map((group) => (
              <div key={group.key}>
                {swimlaneGroupBy !== null && (
                  <div
                    style={{
                      fontSize: "0.67rem",
                      fontWeight: 700,
                      color: "#9ca3af",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      padding: "0.15rem 0",
                      borderBottom: "1px solid #eaecef",
                      marginBottom: "0.4rem",
                    }}
                  >
                    {group.label}
                  </div>
                )}
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                  {group.cards.map((card) => (
                    <KanbanCard
                      key={card.id}
                      card={card}
                      members={members}
                      loading={loading}
                      isDragging={draggingCardId === card.id}
                      dark={dark}
                      onEdit={() => onEditCard(card)}
                      onArchive={() => onArchiveCard(card.id)}
                      onDelete={() => onDeleteCard(card.id)}
                      onDragStart={() => onCardDragStart(card.id)}
                      onDragEnd={onCardDragEnd}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddCardButton onClick={onAddCard} disabled={loading} accentColor={accentColor} dark={dark} />
    </div>
  );
}

function KanbanCard({
  card, members, loading, isDragging, dark, onEdit, onArchive, onDelete, onDragStart, onDragEnd,
}: {
  card: Card; members: { email: string; displayName?: string }[];
  loading: boolean; isDragging: boolean; dark: boolean;
  onEdit: () => void; onArchive: () => void; onDelete: () => void;
  onDragStart: () => void; onDragEnd: () => void;
}) {
  const cat  = getCategoryColor(card.category);
  const pcfg = card.priority ? PRIORITY_CONFIG[card.priority] : null;
  const assigneeMember = card.assignee ? members.find((m) => m.email === card.assignee) : undefined;

  return (
    <li
      className="kanban-card"
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      style={{
        backgroundColor: dark ? "#111827" : "#fff",
        border: dark ? "1px solid #334155" : "1px solid #dbe3ef",
        borderLeft: `3px solid ${cat.border}`,
        borderRight: pcfg && card.priority === "high" ? `3px solid ${pcfg.border}` : "1px solid #e2e8f0",
        borderRadius: "8px",
        padding: "0.65rem 0.75rem",
            boxShadow: isDragging ? "0 18px 38px rgba(15,23,42,0.18)" : "0 6px 18px rgba(15,23,42,0.06)",
        opacity: isDragging ? 0.45 : 1,
        cursor: isDragging ? "grabbing" : "grab",
        transition: "box-shadow 0.15s, opacity 0.15s",
      }}
    >
      <div className="card-actions">
        <HoverAction onClick={onEdit}    disabled={loading} title="Edit"    label="Edit"    color="#4f46e5" />
        <HoverAction onClick={onArchive} disabled={loading} title="Archive" label="Archive" color="#d97706" />
        <HoverAction onClick={onDelete}  disabled={loading} title="Delete"  label="Delete"  color="#ef4444" />
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.4rem" }}>
        <div style={{ flex: 1, fontWeight: 600, fontSize: "0.875rem", color: dark ? "#f8fafc" : "#111827", lineHeight: 1.35 }}>
          {card.title}
        </div>
        {pcfg && card.priority && <PriorityPill priority={card.priority} />}
      </div>

      {card.description && (
        <p
          style={{
            margin: "0.3rem 0 0",
            fontSize: "0.78rem",
            color: dark ? "#94a3b8" : "#6b7280",
            lineHeight: 1.45,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {card.description}
        </p>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginTop: "0.55rem", flexWrap: "wrap" }}>
        <Badge bg={cat.bg} text={cat.text} label={card.category} />
        {getDueLabel(card) && <DueBadge card={card} />}
        {card.tags.map((tag) => (
          <TagBadge key={tag} label={tag} />
        ))}
        <span style={{ marginLeft: "auto", fontSize: "0.68rem", color: dark ? "#64748b" : "#9ca3af", whiteSpace: "nowrap" }}>
          {formatAge(card.createdAt)} · col {formatAge(card.columnEnteredAt)}
        </span>
        {card.assignee && (
          <AssigneeAvatar
            email={card.assignee}
            displayName={assigneeMember?.displayName}
          />
        )}
      </div>
    </li>
  );
}

function HoverAction({ onClick, disabled, title, label, color }: {
  onClick: () => void; disabled: boolean; title: string; label: string; color: string;
}) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      disabled={disabled}
      title={title}
      style={{
        fontSize: "0.68rem",
        fontWeight: 600,
        padding: "0.1rem 0.3rem",
        background: "none",
        border: "none",
        borderRadius: "3px",
        cursor: disabled ? "not-allowed" : "pointer",
        color,
        opacity: disabled ? 0.4 : 1,
        lineHeight: 1,
      }}
    >
      {label}
    </button>
  );
}

function PriorityPill({ priority }: { priority: CardPriority }) {
  const cfg = PRIORITY_CONFIG[priority];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.2rem",
        fontSize: "0.67rem",
        fontWeight: 700,
        padding: "0.15rem 0.45rem",
        borderRadius: "4px",
        backgroundColor: cfg.bg,
        color: cfg.text,
        border: `1px solid ${cfg.border}`,
        flexShrink: 0,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        lineHeight: 1,
      }}
    >
      {cfg.label}
    </span>
  );
}

function DueBadge({ card }: { card: Card }) {
  const status = getDueStatus(card);
  const label = getDueLabel(card);
  if (!label) return null;
  const colors =
    status === "overdue"
      ? { bg: "#fef2f2", text: "#b91c1c" }
      : status === "today"
        ? { bg: "#fffbeb", text: "#b45309" }
        : { bg: "#eff6ff", text: "#1d4ed8" };
  return <Badge bg={colors.bg} text={colors.text} label={label} />;
}

function TagBadge({ label }: { label: string }) {
  return (
    <span
      style={{
        fontSize: "0.63rem",
        fontWeight: 700,
        padding: "0.1rem 0.35rem",
        borderRadius: "4px",
        backgroundColor: "#f1f5f9",
        color: "#475569",
        flexShrink: 0,
      }}
    >
      #{label}
    </span>
  );
}

function Badge({ bg, text, label }: { bg: string; text: string; label: string }) {
  return (
    <span
      style={{
        fontSize: "0.63rem",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        padding: "0.1rem 0.35rem",
        borderRadius: "4px",
        backgroundColor: bg,
        color: text,
        flexShrink: 0,
      }}
    >
      {label}
    </span>
  );
}

function AssigneeAvatar({ email, displayName }: { email: string; displayName?: string }) {
  const name = displayName || email.split("@")[0];
  const initial = name.charAt(0).toUpperCase();
  const hue = email.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <span
      title={displayName ? `${displayName} (${email})` : email}
      style={{
        width: "20px",
        height: "20px",
        borderRadius: "50%",
        backgroundColor: `hsl(${hue},55%,52%)`,
        color: "#fff",
        fontSize: "0.62rem",
        fontWeight: 700,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        cursor: "default",
      }}
    >
      {initial}
    </span>
  );
}

interface CardFormValues {
  title: string; description: string; category: string;
  priority: CardPriority; assignee: string; columnId: string; dueDate: string; tags: string;
}

function CardFormModal({
  mode, initialValues, activityCard, columns, defaultColumnId, isTeamBoard, members,
  customCategories, storeError, onSubmit, onCancel,
}: {
  mode: "create" | "edit"; initialValues?: CardFormValues; columns: Column[];
  activityCard?: Card;
  defaultColumnId?: string; isTeamBoard: boolean;
  members: { email: string; displayName?: string }[];
  customCategories: string[];
  storeError: string | null;
  onSubmit: (values: CardFormValues) => void; onCancel: () => void;
}) {
  const loading = useKanbanStore((s) => s.loading);
  const [title,       setTitle]       = useState(initialValues?.title ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [category,    setCategory]    = useState(initialValues?.category ?? "feature");
  const [newCatInput, setNewCatInput] = useState("");
  const [addingCat,   setAddingCat]   = useState(false);
  const [priority,    setPriority]    = useState<CardPriority>(initialValues?.priority ?? "medium");
  const [assignee,    setAssignee]    = useState(initialValues?.assignee ?? "");
  const [dueDate,     setDueDate]     = useState(initialValues?.dueDate ?? "");
  const [tags,        setTags]        = useState(initialValues?.tags ?? "");
  const [columnId,    setColumnId]    = useState(
    initialValues?.columnId ?? defaultColumnId ?? columns[0]?.id ?? ""
  );
  const resolvedCategory = addingCat
    ? (newCatInput.trim().toLowerCase() || "feature")
    : category;

  const memberEmails = members.map((m) => m.email);
  const assigneeEmails = new Set([...memberEmails, ...(initialValues?.assignee ? [initialValues.assignee] : [])]);
  const assigneeOptions: { email: string; displayName?: string }[] = [
    { email: "" },
    ...[...assigneeEmails].map((email) => ({
      email,
      displayName: members.find((m) => m.email === email)?.displayName,
    })),
  ];

  return (
    <Overlay onClose={onCancel}>
      <h2 style={{ margin: "0 0 1rem", fontSize: "1.05rem", fontWeight: 700, color: "#111827" }}>
        {mode === "create" ? "New Card" : "Edit Card"}
      </h2>
      {storeError && (
        <p style={{ margin: "0 0 0.75rem", color: "#b91c1c", fontSize: "0.84rem", backgroundColor: "#fef2f2", padding: "0.5rem 0.75rem", borderRadius: "6px" }}>
          {storeError}
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          onSubmit({ title: title.trim(), description, category: resolvedCategory, priority, assignee, columnId, dueDate, tags });
        }}
      >
        <Field label="Title *">
          <input
            type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            autoFocus style={inputStyle}
          />
        </Field>
        <Field label="Description">
          <textarea
            value={description} onChange={(e) => setDescription(e.target.value)}
            rows={3} style={{ ...inputStyle, resize: "vertical" }}
          />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <Field label="Category">
            <select
              value={addingCat ? "__new__" : category}
              onChange={(e) => {
                if (e.target.value === "__new__") { setAddingCat(true); setNewCatInput(""); }
                else { setCategory(e.target.value); setAddingCat(false); }
              }}
              style={inputStyle}
            >
              <option value="feature">Feature</option>
              <option value="bug">Bug</option>
              <option value="docs">Docs</option>
              {customCategories.map((cat) => (
                <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
              ))}
              <option value="__new__">+ Add new category…</option>
            </select>
            {addingCat && (
              <input
                type="text"
                value={newCatInput}
                onChange={(e) => setNewCatInput(e.target.value)}
                placeholder="e.g. design, research…"
                autoFocus
                style={{ ...inputStyle, marginTop: "0.4rem" }}
              />
            )}
          </Field>
          <Field label="Priority">
            <select value={priority} onChange={(e) => setPriority(e.target.value as CardPriority)} style={inputStyle}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </Field>
        </div>

        <Field label="Due date">
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={inputStyle} />
        </Field>

        <Field label="Tags">
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="frontend, review, blocked"
            style={inputStyle}
          />
        </Field>

        {isTeamBoard && (
          <Field label="Assignee">
            <select value={assignee} onChange={(e) => setAssignee(e.target.value)} style={inputStyle}>
              {assigneeOptions.map(({ email, displayName }) => (
                <option key={email} value={email}>
                  {email === "" ? "- Unassigned -" : (displayName || email.split("@")[0])}
                </option>
              ))}
            </select>
          </Field>
        )}

        {mode === "create" && (
          <Field label="Column">
            <select value={columnId} onChange={(e) => setColumnId(e.target.value)} style={inputStyle}>
              {columns.map((col) => (
                <option key={col.id} value={col.id}>{col.title}</option>
              ))}
            </select>
          </Field>
        )}
        {mode === "edit" && activityCard && activityCard.activities.length > 0 && (
          <div style={{ marginTop: "0.5rem", padding: "0.75rem", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#374151", marginBottom: "0.45rem" }}>
              Activity
            </div>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.35rem", maxHeight: "120px", overflowY: "auto" }}>
              {[...activityCard.activities].reverse().slice(0, 8).map((activity) => (
                <li key={activity.id} style={{ fontSize: "0.75rem", color: "#64748b", lineHeight: 1.35 }}>
                  <strong style={{ color: "#475569" }}>{activity.message}</strong>
                  <span> - {formatTimestampShort(activity.at)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.75rem" }}>
          <button type="button" onClick={onCancel} disabled={loading} style={cancelBtnStyle}>
            Cancel
          </button>
          <button type="submit" disabled={!title.trim() || loading} style={primaryBtnStyle(!title.trim() || loading)}>
            {loading ? "Saving..." : mode === "create" ? "Create" : "Save"}
          </button>
        </div>
      </form>
    </Overlay>
  );
}

function ColumnFormModal({
  mode, initialValues, onSubmit, onCancel,
}: {
  mode: "create" | "edit";
  initialValues?: { title: string; wipLimit: string };
  onSubmit: (title: string, wipLimit: number | undefined) => void;
  onCancel: () => void;
}) {
  const loading = useKanbanStore((s) => s.loading);
  const [title,    setTitle]    = useState(initialValues?.title ?? "");
  const [wipLimit, setWipLimit] = useState(initialValues?.wipLimit ?? "");

  return (
    <Overlay onClose={onCancel}>
      <h2 style={{ margin: "0 0 1rem", fontSize: "1.05rem", fontWeight: 700, color: "#111827" }}>
        {mode === "create" ? "New Column" : "Edit Column"}
      </h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          const parsed = parseInt(wipLimit, 10);
          onSubmit(title.trim(), Number.isNaN(parsed) || parsed <= 0 ? undefined : parsed);
        }}
      >
        <Field label="Title *">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus style={inputStyle} />
        </Field>
        <Field label="WIP Limit (blank = no limit)">
          <input type="text" value={wipLimit} onChange={(e) => setWipLimit(e.target.value)} placeholder="e.g. 3" style={inputStyle} />
        </Field>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.75rem" }}>
          <button type="button" onClick={onCancel} disabled={loading} style={cancelBtnStyle}>Cancel</button>
          <button type="submit" disabled={!title.trim() || loading} style={primaryBtnStyle(!title.trim() || loading)}>
            {loading ? "Saving..." : mode === "create" ? "Create Column" : "Save"}
          </button>
        </div>
      </form>
    </Overlay>
  );
}

function ConfirmModal({ title, message, onConfirm, onCancel }: {
  title: string; message: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <Overlay onClose={onCancel}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: "48px", height: "48px", borderRadius: "50%",
          background: "linear-gradient(135deg, #fef2f2, #fee2e2)",
          border: "2px solid #fca5a5",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          marginBottom: "0.9rem",
        }}>
          <span style={{ color: "#ef4444", fontSize: "1.3rem", fontWeight: 700, lineHeight: 1 }}>!</span>
        </div>
        <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.05rem", fontWeight: 700, color: "#111827" }}>
          {title}
        </h2>
        <p style={{ margin: "0 0 1.5rem", fontSize: "0.875rem", color: "#6b7280", lineHeight: 1.5 }}>
          {message}
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem" }}>
          <button type="button" onClick={onCancel} style={cancelBtnStyle}>Cancel</button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              padding: "0.45rem 1.35rem",
              background: "linear-gradient(135deg, #ef4444, #dc2626)",
              border: "none",
              borderRadius: "7px",
              cursor: "pointer",
              fontSize: "0.875rem",
              color: "#fff",
              fontWeight: 600,
              boxShadow: "0 2px 8px rgba(239,68,68,0.35)",
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </Overlay>
  );
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      role="presentation"
      style={{
        position: "fixed", inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 100,
        backdropFilter: "blur(2px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{
          backgroundColor: "#fff",
          borderRadius: "14px",
          padding: "1.75rem",
          width: "100%",
          maxWidth: "440px",
          maxHeight: "calc(100vh - 2rem)",
          overflowY: "auto",
          boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: "0.75rem" }}>
      <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#374151", display: "block", marginBottom: "0.3rem", letterSpacing: "0.01em" }}>
        {label}
      </span>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.45rem 0.65rem",
  border: "1px solid #d1d5db",
  borderRadius: "7px",
  fontSize: "0.875rem",
  boxSizing: "border-box",
  backgroundColor: "#fafafa",
  outline: "none",
  color: "#111827",
};

const toolbarSelectStyle: React.CSSProperties = {
  padding: "0.32rem 0.55rem",
  border: "1px solid #e0e0e0",
  borderRadius: "6px",
  fontSize: "0.8rem",
  backgroundColor: "#fff",
  color: "#374151",
  outline: "none",
};

const cancelBtnStyle: React.CSSProperties = {
  padding: "0.45rem 1rem",
  backgroundColor: "#f3f4f6",
  border: "1px solid #d1d5db",
  borderRadius: "7px",
  cursor: "pointer",
  fontSize: "0.875rem",
  color: "#374151",
  fontWeight: 500,
};

const primaryBtnStyle = (disabled: boolean): React.CSSProperties => ({
  padding: "0.45rem 1.25rem",
  background: disabled ? undefined : "linear-gradient(135deg, #4f46e5, #7c3aed)",
  backgroundColor: disabled ? "#a5b4fc" : undefined,
  border: "none",
  borderRadius: "7px",
  cursor: disabled ? "not-allowed" : "pointer",
  fontSize: "0.875rem",
  color: "#fff",
  fontWeight: 600,
  boxShadow: disabled ? "none" : "0 2px 6px rgba(79,70,229,0.3)",
});
