import type {
  ArchivedCardEntry,
  BoardTemplateId,
  Card,
  CardActivity,
  CardActivityType,
  CardCategory,
  CardPriority,
  Column,
  FilterState,
  SwimlaneGroupBy,
} from "../types";
import { normalizeDueDate, normalizeTags } from "../lib/kanbanUtils";

export interface CreateCardRequest {
  title: string;
  description?: string;
  category?: CardCategory;
  columnId?: string;
  assignee?: string;
  priority?: CardPriority;
  dueDate?: string;
  tags?: string[];
}

export interface UpdateCardRequest {
  title?: string;
  description?: string;
  category?: CardCategory;
  assignee?: string;
  priority?: CardPriority;
  dueDate?: string | null;
  tags?: string[];
}

export interface CreateColumnRequest {
  title: string;
  wipLimit?: number;
}

export interface UpdateColumnRequest {
  title?: string;
  order?: number;
  wipLimit?: number;
}

export interface BoardSnapshot {
  columns: Column[];
  cards: Card[];
  archivedEntries: ArchivedCardEntry[];
  swimlaneGroupBy: SwimlaneGroupBy | null;
  filter: FilterState;
}

export interface BoardTemplateCard {
  title: string;
  description?: string;
  category?: CardCategory;
  columnTitle: string;
  priority?: CardPriority;
  tags?: string[];
  dueOffsetDays?: number;
}

export interface BoardTemplate {
  id: BoardTemplateId;
  name: string;
  description: string;
  columns: CreateColumnRequest[];
  cards: BoardTemplateCard[];
}

export interface KanbanApiService {
  getBoardSnapshot: () => Promise<BoardSnapshot>;
  createCard: (payload: CreateCardRequest) => Promise<Card>;
  updateCard: (cardId: string, payload: UpdateCardRequest) => Promise<Card | null>;
  moveCard: (cardId: string, targetColumnId: string) => Promise<Card | null>;
  deleteCard: (cardId: string) => Promise<boolean>;
  archiveCard: (cardId: string) => Promise<ArchivedCardEntry | null>;
  restoreCard: (cardId: string, targetColumnId?: string) => Promise<Card | null>;
  createColumn: (payload: CreateColumnRequest) => Promise<Column>;
  updateColumn: (columnId: string, payload: UpdateColumnRequest) => Promise<Column | null>;
  deleteColumn: (columnId: string, fallbackColumnId?: string) => Promise<boolean>;
  reorderColumns: (orderedIds: string[]) => Promise<boolean>;
  applyBoardTemplate: (templateId: BoardTemplateId) => Promise<boolean>;
  updateFilter: (payload: Partial<FilterState>) => Promise<FilterState>;
  updateSwimlaneGroupBy: (groupBy: SwimlaneGroupBy | null) => Promise<SwimlaneGroupBy | null>;
}

const DEFAULT_FILTER: FilterState = {
  category: null,
  swimlaneValue: null,
  searchQuery: "",
  tag: null,
  dueStatus: "all",
  sortMode: "created",
};

const DEFAULT_COLUMNS: Column[] = [
  { id: "column-todo", title: "To Do", order: 0, wipLimit: 4 },
  { id: "column-in-progress", title: "In Progress", order: 1, wipLimit: 2 },
  { id: "column-done", title: "Done", order: 2 },
];

export const BOARD_TEMPLATES: BoardTemplate[] = [
  {
    id: "personal",
    name: "Personal Tasks",
    description: "Daily planning, errands, and habits.",
    columns: [
      { title: "Backlog", wipLimit: 8 },
      { title: "This Week", wipLimit: 5 },
      { title: "Today", wipLimit: 3 },
      { title: "Done" },
    ],
    cards: [
      { title: "Plan the week", columnTitle: "This Week", category: "feature", priority: "medium", tags: ["planning"], dueOffsetDays: 1 },
      { title: "Clear inbox", columnTitle: "Today", category: "docs", priority: "low", tags: ["admin"], dueOffsetDays: 0 },
      { title: "Review priorities", columnTitle: "Backlog", category: "feature", priority: "medium", tags: ["focus"] },
    ],
  },
  {
    id: "sprint",
    name: "Software Sprint",
    description: "Sprint flow for implementation, review, and release work.",
    columns: [
      { title: "Backlog", wipLimit: 10 },
      { title: "Ready", wipLimit: 5 },
      { title: "In Progress", wipLimit: 3 },
      { title: "Review", wipLimit: 3 },
      { title: "Done" },
    ],
    cards: [
      { title: "Define acceptance criteria", columnTitle: "Ready", category: "docs", priority: "medium", tags: ["planning"], dueOffsetDays: 1 },
      { title: "Implement feature slice", columnTitle: "Backlog", category: "feature", priority: "high", tags: ["frontend"] },
      { title: "Fix reported bug", columnTitle: "Backlog", category: "bug", priority: "high", tags: ["bugfix"] },
    ],
  },
  {
    id: "school",
    name: "School Assignment Tracker",
    description: "Track coursework from research through submission.",
    columns: [
      { title: "Assigned", wipLimit: 8 },
      { title: "Research", wipLimit: 4 },
      { title: "Drafting", wipLimit: 3 },
      { title: "Submitted" },
    ],
    cards: [
      { title: "Read assignment brief", columnTitle: "Assigned", category: "docs", priority: "high", tags: ["coursework"], dueOffsetDays: 0 },
      { title: "Collect references", columnTitle: "Research", category: "docs", priority: "medium", tags: ["research"], dueOffsetDays: 3 },
      { title: "Prepare final submission", columnTitle: "Drafting", category: "feature", priority: "high", tags: ["final"], dueOffsetDays: 7 },
    ],
  },
  {
    id: "jobs",
    name: "Job Applications",
    description: "Manage applications, interviews, and follow-ups.",
    columns: [
      { title: "Leads", wipLimit: 12 },
      { title: "Applied", wipLimit: 8 },
      { title: "Interviewing", wipLimit: 4 },
      { title: "Closed" },
    ],
    cards: [
      { title: "Update resume", columnTitle: "Leads", category: "docs", priority: "high", tags: ["resume"], dueOffsetDays: 1 },
      { title: "Apply to target company", columnTitle: "Applied", category: "feature", priority: "medium", tags: ["application"], dueOffsetDays: 2 },
      { title: "Send follow-up email", columnTitle: "Interviewing", category: "docs", priority: "medium", tags: ["follow-up"], dueOffsetDays: 4 },
    ],
  },
];

export function getBoardTemplate(templateId: BoardTemplateId): BoardTemplate | undefined {
  return BOARD_TEMPLATES.find((template) => template.id === templateId);
}

export function createEmptyBoardSnapshot(): BoardSnapshot {
  return {
    columns: DEFAULT_COLUMNS.map((column) => ({ ...column })),
    cards: [],
    archivedEntries: [],
    swimlaneGroupBy: null,
    filter: { ...DEFAULT_FILTER },
  };
}

let mockDb: BoardSnapshot = createEmptyBoardSnapshot();

export function resetKanbanApiMock(): void {
  mockDb = createEmptyBoardSnapshot();
}

function getOffsetDate(offsetDays: number | undefined): string | undefined {
  if (offsetDays === undefined) return undefined;
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function createActivity(type: CardActivityType, message: string): CardActivity {
  return {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    type,
    message,
  };
}

function appendActivity(card: Card, type: CardActivityType, message: string): void {
  card.activities = [...(card.activities ?? []), createActivity(type, message)];
}

function cloneCard(card: Card): Card {
  return {
    ...card,
    dueDate: card.dueDate,
    tags: [...(card.tags ?? [])],
    moves: (card.moves ?? []).map((move) => ({ ...move })),
    activities: (card.activities ?? []).map((activity) => ({ ...activity })),
  };
}

function cloneArchivedEntry(entry: ArchivedCardEntry): ArchivedCardEntry {
  return {
    card: cloneCard(entry.card),
    archivedAt: entry.archivedAt,
  };
}

function cloneSnapshot(snapshot: BoardSnapshot): BoardSnapshot {
  return {
    columns: snapshot.columns.map((column) => ({ ...column })),
    cards: snapshot.cards.map(cloneCard),
    archivedEntries: snapshot.archivedEntries.map(cloneArchivedEntry),
    swimlaneGroupBy: snapshot.swimlaneGroupBy,
    filter: {
      ...DEFAULT_FILTER,
      ...snapshot.filter,
    },
  };
}

function normalizeColumns(columns: Column[]): Column[] {
  return [...columns]
    .sort((left, right) => left.order - right.order)
    .map((column, index) => ({
      ...column,
      order: index,
    }));
}

async function createMockCard(payload: CreateCardRequest, activityType: CardActivityType = "created"): Promise<Card> {
  const createdAt = new Date().toISOString();
  const resolvedColumnId = payload.columnId ?? mockDb.columns[0]?.id ?? "column-todo";
  const card: Card = {
    id: crypto.randomUUID(),
    title: payload.title.trim(),
    description: payload.description ?? "",
    category: payload.category ?? "feature",
    columnId: resolvedColumnId,
    assignee: payload.assignee?.trim() || undefined,
    priority: payload.priority ?? "medium",
    dueDate: normalizeDueDate(payload.dueDate),
    tags: normalizeTags(payload.tags),
    createdAt,
    columnEnteredAt: createdAt,
    moves: [],
    activities: [createActivity(activityType, activityType === "template" ? "Created from template" : "Created card")],
  };

  mockDb.cards.push(card);

  return cloneCard(card);
}

export const kanbanApi: KanbanApiService = {
  async getBoardSnapshot() {
    return cloneSnapshot(mockDb);
  },

  async createCard(payload) {
    return createMockCard(payload);
  },

  async updateCard(cardId, payload) {
    const card = mockDb.cards.find((entry) => entry.id === cardId);

    if (!card) {
      return null;
    }

    if (payload.title !== undefined) {
      const title = payload.title.trim();

      if (title) {
        card.title = title;
      }
    }

    if (payload.description !== undefined) {
      card.description = payload.description;
    }

    if (payload.category !== undefined) {
      card.category = payload.category;
    }

    if (payload.assignee !== undefined) {
      card.assignee = payload.assignee.trim() || undefined;
    }

    if (payload.priority !== undefined) {
      card.priority = payload.priority;
    }

    if (Object.prototype.hasOwnProperty.call(payload, "dueDate")) {
      card.dueDate = normalizeDueDate(payload.dueDate);
    }

    if (payload.tags !== undefined) {
      card.tags = normalizeTags(payload.tags);
    }

    appendActivity(card, "edited", "Updated card");

    return cloneCard(card);
  },

  async moveCard(cardId, targetColumnId) {
    const targetColumn = mockDb.columns.find((column) => column.id === targetColumnId);

    if (!targetColumn) {
      return null;
    }

    const card = mockDb.cards.find((entry) => entry.id === cardId);

    if (!card || card.columnId === targetColumnId) {
      return card ? cloneCard(card) : null;
    }

    const movedAt = new Date().toISOString();

    card.moves.push({
      at: movedAt,
      fromColumnId: card.columnId,
      toColumnId: targetColumnId,
    });
    card.columnId = targetColumnId;
    card.columnEnteredAt = movedAt;
    appendActivity(card, "moved", `Moved to ${targetColumn.title}`);

    return cloneCard(card);
  },

  async deleteCard(cardId) {
    const previousLength = mockDb.cards.length;
    mockDb.cards = mockDb.cards.filter((card) => card.id !== cardId);

    return mockDb.cards.length < previousLength;
  },

  async archiveCard(cardId) {
    const card = mockDb.cards.find((entry) => entry.id === cardId);

    if (!card) {
      return null;
    }

    appendActivity(card, "archived", "Archived card");
    mockDb.cards = mockDb.cards.filter((entry) => entry.id !== cardId);

    const archivedEntry: ArchivedCardEntry = {
      card: cloneCard(card),
      archivedAt: new Date().toISOString(),
    };

    mockDb.archivedEntries.push(archivedEntry);

    return cloneArchivedEntry(archivedEntry);
  },

  async restoreCard(cardId, targetColumnId) {
    const archivedEntry = mockDb.archivedEntries.find((entry) => entry.card.id === cardId);

    if (!archivedEntry) {
      return null;
    }

    const resolvedTargetColumnId = targetColumnId ?? mockDb.columns[0]?.id;
    const targetExists = resolvedTargetColumnId
      ? mockDb.columns.some((column) => column.id === resolvedTargetColumnId)
      : false;

    if (!resolvedTargetColumnId || !targetExists) {
      return null;
    }

    const restoredAt = new Date().toISOString();
    const card: Card =
      archivedEntry.card.columnId === resolvedTargetColumnId
        ? {
            ...cloneCard(archivedEntry.card),
            columnEnteredAt: restoredAt,
          }
        : {
            ...cloneCard(archivedEntry.card),
            columnId: resolvedTargetColumnId,
            columnEnteredAt: restoredAt,
            moves: [
              ...archivedEntry.card.moves,
              {
                at: restoredAt,
                fromColumnId: archivedEntry.card.columnId,
                toColumnId: resolvedTargetColumnId,
              },
            ],
          };

    appendActivity(card, "restored", "Restored card");
    mockDb.cards.push(card);
    mockDb.archivedEntries = mockDb.archivedEntries.filter((entry) => entry.card.id !== cardId);

    return cloneCard(card);
  },

  async createColumn(payload) {
    const column: Column = {
      id: crypto.randomUUID(),
      title: payload.title.trim(),
      order: mockDb.columns.length,
      ...(payload.wipLimit !== undefined ? { wipLimit: payload.wipLimit } : {}),
    };

    mockDb.columns = normalizeColumns([...mockDb.columns, column]);

    return { ...column };
  },

  async updateColumn(columnId, payload) {
    const index = mockDb.columns.findIndex((column) => column.id === columnId);

    if (index === -1) {
      return null;
    }

    const current = mockDb.columns[index];
    const next: Column = {
      ...current,
      ...(payload.title !== undefined && payload.title.trim()
        ? { title: payload.title.trim() }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(payload, "wipLimit")
        ? { wipLimit: payload.wipLimit }
        : {}),
    };

    const updatedColumns = [...mockDb.columns];
    updatedColumns[index] = next;

    if (payload.order !== undefined) {
      const withoutTarget = updatedColumns.filter((column) => column.id !== columnId);
      const boundedOrder = Math.max(0, Math.min(payload.order, withoutTarget.length));
      withoutTarget.splice(boundedOrder, 0, next);
      mockDb.columns = normalizeColumns(withoutTarget);
    } else {
      mockDb.columns = normalizeColumns(updatedColumns);
    }

    return { ...next };
  },

  async deleteColumn(columnId, fallbackColumnId) {
    if (mockDb.columns.length <= 2) {
      return false;
    }

    const remainingColumns = normalizeColumns(
      mockDb.columns.filter((column) => column.id !== columnId)
    );

    if (remainingColumns.length === mockDb.columns.length) {
      return false;
    }

    const resolvedFallbackColumnId =
      (fallbackColumnId &&
        remainingColumns.find((column) => column.id === fallbackColumnId)?.id) ||
      remainingColumns[0]?.id;

    if (!resolvedFallbackColumnId) {
      return false;
    }

    const movedAt = new Date().toISOString();
    mockDb.columns = remainingColumns;
    mockDb.cards = mockDb.cards.map((card) => {
      if (card.columnId !== columnId) {
        return card;
      }

      const movedCard = {
        ...card,
        columnId: resolvedFallbackColumnId,
        columnEnteredAt: movedAt,
        moves: [
          ...card.moves,
          {
            at: movedAt,
            fromColumnId: columnId,
            toColumnId: resolvedFallbackColumnId,
          },
        ],
      };
      appendActivity(movedCard, "moved", "Moved after column deletion");
      return movedCard;
    });

    return true;
  },

  async reorderColumns(orderedIds) {
    orderedIds.forEach((id, i) => {
      const col = mockDb.columns.find((c) => c.id === id);
      if (col) col.order = i;
    });
    return true;
  },

  async applyBoardTemplate(templateId) {
    const template = getBoardTemplate(templateId);
    if (!template) {
      return false;
    }

    const preExistingCardIds = new Set(mockDb.cards.map((c) => c.id));
    const templateColumns = normalizeColumns(
      template.columns.map((columnInput, index) => ({
        id: crypto.randomUUID(),
        title: columnInput.title.trim(),
        order: index,
        ...(columnInput.wipLimit !== undefined ? { wipLimit: columnInput.wipLimit } : {}),
      }))
    );

    const firstColumnId = templateColumns[0]?.id;
    if (!firstColumnId) {
      return false;
    }

    mockDb.columns = templateColumns;

    if (firstColumnId && preExistingCardIds.size > 0) {
      const movedAt = new Date().toISOString();
      mockDb.cards = mockDb.cards.map((card) => {
        if (!preExistingCardIds.has(card.id)) return card;
        const movedCard = {
          ...card,
          columnId: firstColumnId,
          columnEnteredAt: movedAt,
          moves: [...card.moves, { at: movedAt, fromColumnId: card.columnId, toColumnId: firstColumnId }],
        };
        appendActivity(movedCard, "moved", `Moved to ${template.columns[0].title} by template`);
        return movedCard;
      });
    }

    const columnsByTitle = new Map(
      templateColumns.map((column) => [column.title.toLowerCase(), column.id])
    );

    for (const card of template.cards) {
      const columnId = columnsByTitle.get(card.columnTitle.toLowerCase()) ?? mockDb.columns[0]?.id;
      if (!columnId) {
        return false;
      }
      await createMockCard(
        {
          ...card,
          columnId,
          dueDate: getOffsetDate(card.dueOffsetDays),
        },
        "template"
      );
    }

    return true;
  },

  async updateFilter(payload) {
    mockDb.filter = {
      ...DEFAULT_FILTER,
      ...mockDb.filter,
      ...payload,
    };

    return { ...mockDb.filter };
  },

  async updateSwimlaneGroupBy(groupBy) {
    mockDb.swimlaneGroupBy = groupBy;

    return mockDb.swimlaneGroupBy;
  },
};
