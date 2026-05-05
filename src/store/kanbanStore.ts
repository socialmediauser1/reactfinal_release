import { create } from "zustand";
import {
  createEmptyBoardSnapshot,
  kanbanApi as mockApi,
  resetKanbanApiMock,
  type BoardSnapshot,
  type CreateCardRequest,
  type UpdateCardRequest,
  type CreateColumnRequest,
  type UpdateColumnRequest,
} from "../services/api";
import { supabaseKanbanApi } from "../services/supabaseApi";
import { validateCreateCardInput, validateUpdateCardInput } from "../lib/kanbanUtils";
import type {
  ArchivedCardEntry,
  BoardTemplateId,
  Card,
  Column,
  FilterState,
  SwimlaneGroupBy,
} from "../types";

const USE_SUPABASE = !!import.meta.env.VITE_SUPABASE_URL;
const kanbanApi = USE_SUPABASE ? supabaseKanbanApi : mockApi;
const VIEW_PREFERENCES_KEY = "personal-kanban:view-preferences";
const CUSTOM_CATEGORIES_KEY = "personal-kanban:custom-categories";
const BUILT_IN_CATEGORIES = ["bug", "feature", "docs"];

export type CreateCardInput = CreateCardRequest;
export { BUILT_IN_CATEGORIES };

export interface KanbanState {
  columns: Column[];
  cards: Card[];
  archivedEntries: ArchivedCardEntry[];
  swimlaneGroupBy: SwimlaneGroupBy | null;
  filter: FilterState;
  loading: boolean;
  error: string | null;
  customCategories: string[];
}

interface KanbanActions {
  initialize: () => Promise<void>;
  addCard: (input: CreateCardInput) => Promise<void>;
  editCard: (cardId: string, payload: UpdateCardRequest) => Promise<void>;
  moveCard: (cardId: string, targetColumnId: string) => Promise<void>;
  deleteCard: (cardId: string) => Promise<void>;
  archiveCard: (cardId: string) => Promise<void>;
  restoreArchivedCard: (cardId: string, targetColumnId?: string) => Promise<void>;
  setFilter: (payload: Partial<FilterState>) => Promise<void>;
  setSwimlaneGroupBy: (groupBy: SwimlaneGroupBy | null) => Promise<void>;
  addColumn: (input: CreateColumnRequest) => Promise<void>;
  editColumn: (columnId: string, payload: UpdateColumnRequest) => Promise<void>;
  removeColumn: (columnId: string, fallbackColumnId?: string) => Promise<void>;
  reorderColumns: (orderedIds: string[]) => Promise<void>;
  applyTemplate: (templateId: BoardTemplateId) => Promise<void>;
  exportBoard: (format: "json" | "csv") => string;
  resetState: () => void;
  addCustomCategory: (name: string) => void;
  removeCustomCategory: (name: string) => void;
}

export type KanbanStore = KanbanState & KanbanActions;

function readCustomCategories(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(window.localStorage.getItem(CUSTOM_CATEGORIES_KEY) ?? "[]") as string[]; }
  catch { return []; }
}

function persistCustomCategories(cats: string[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(cats));
}

function toStoreState(snapshot: BoardSnapshot): Omit<KanbanState, "loading" | "error" | "customCategories"> {
  return mergeViewPreferences({
    columns: snapshot.columns,
    cards: snapshot.cards,
    archivedEntries: snapshot.archivedEntries,
    swimlaneGroupBy: snapshot.swimlaneGroupBy,
    filter: snapshot.filter,
  });
}

function buildInitialState(): KanbanState {
  const snapshot = USE_SUPABASE
    ? createEmptyBoardSnapshot()
    : createEmptyBoardSnapshot();
  if (USE_SUPABASE) {
    snapshot.columns = [];
    snapshot.cards = [];
    snapshot.archivedEntries = [];
  }
  return {
    ...toStoreState(snapshot),
    loading: USE_SUPABASE,
    error: null,
    customCategories: readCustomCategories(),
  };
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function readViewPreferences(): Pick<KanbanState, "filter" | "swimlaneGroupBy"> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(VIEW_PREFERENCES_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Pick<KanbanState, "filter" | "swimlaneGroupBy">;
  } catch {
    return null;
  }
}

function persistViewPreferences(filter: FilterState, swimlaneGroupBy: SwimlaneGroupBy | null): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    VIEW_PREFERENCES_KEY,
    JSON.stringify({ filter, swimlaneGroupBy })
  );
}

function clearViewPreferences(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(VIEW_PREFERENCES_KEY);
}

function mergeViewPreferences(
  state: Omit<KanbanState, "loading" | "error" | "customCategories">
): Omit<KanbanState, "loading" | "error" | "customCategories"> {
  const preferences = readViewPreferences();
  if (!preferences) return state;
  return {
    ...state,
    filter: {
      ...state.filter,
      ...preferences.filter,
    },
    swimlaneGroupBy: preferences.swimlaneGroupBy,
  };
}

function escapeCsv(value: unknown): string {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function buildCsvExport(state: KanbanStore): string {
  const columnsById = new Map(state.columns.map((column) => [column.id, column.title]));
  const rows = [
    [
      "status",
      "id",
      "title",
      "description",
      "column",
      "category",
      "priority",
      "assignee",
      "dueDate",
      "tags",
      "createdAt",
      "archivedAt",
      "moveCount",
    ],
    ...state.cards.map((card) => [
      "active",
      card.id,
      card.title,
      card.description,
      columnsById.get(card.columnId) ?? card.columnId,
      card.category,
      card.priority ?? "",
      card.assignee ?? "",
      card.dueDate ?? "",
      card.tags.join(";"),
      card.createdAt,
      "",
      card.moves.length,
    ]),
    ...state.archivedEntries.map((entry) => [
      "archived",
      entry.card.id,
      entry.card.title,
      entry.card.description,
      columnsById.get(entry.card.columnId) ?? entry.card.columnId,
      entry.card.category,
      entry.card.priority ?? "",
      entry.card.assignee ?? "",
      entry.card.dueDate ?? "",
      entry.card.tags.join(";"),
      entry.card.createdAt,
      entry.archivedAt,
      entry.card.moves.length,
    ]),
  ];

  return rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
}

function buildJsonExport(state: KanbanStore): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      columns: state.columns,
      cards: state.cards,
      archivedEntries: state.archivedEntries,
    },
    null,
    2
  );
}

function createMoveActivity(message: string) {
  return {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    type: "moved" as const,
    message,
  };
}

export const useKanbanStore = create<KanbanStore>((set, get) => {
  const syncBoard = async () => {
    const snapshot = await kanbanApi.getBoardSnapshot();
    set({
      ...toStoreState(snapshot),
      error: null,
    });
  };

  const runMutation = async (
    mutation: () => Promise<boolean>,
    failureMessage: string
  ) => {
    set({ loading: true, error: null });

    try {
      const success = await mutation();

      if (!success) {
        set({
          loading: false,
          error: failureMessage,
        });
        return;
      }

      await syncBoard();
      set({ loading: false });
    } catch (error) {
      set({
        loading: false,
        error: getErrorMessage(error, failureMessage),
      });
    }
  };

  return {
    ...buildInitialState(),
    initialize: async () => {
      set({ loading: true, error: null });
      try {
        await syncBoard();
        set({ loading: false });
      } catch (error) {
        set({ loading: false, error: getErrorMessage(error, "Failed to load board.") });
      }
    },
    addCard: async (input) => {
      const validation = validateCreateCardInput(input);

      if (!validation.value) {
        set({ error: validation.error ?? "Invalid card." });
        return;
      }
      const validatedInput = validation.value;

      await runMutation(async () => {
        await kanbanApi.createCard(validatedInput);

        return true;
      }, "Failed to create card.");
    },
    moveCard: async (cardId, targetColumnId) => {
      const state = get();
      const card = state.cards.find((entry) => entry.id === cardId);
      const targetColumn = state.columns.find((column) => column.id === targetColumnId);

      if (!card || !targetColumn) {
        set({ error: "Failed to move card." });
        return;
      }

      if (card.columnId === targetColumnId) {
        set({ error: null });
        return;
      }

      const previousCards = state.cards;
      const movedAt = new Date().toISOString();
      const optimisticCard: Card = {
        ...card,
        columnId: targetColumnId,
        columnEnteredAt: movedAt,
        moves: [
          ...card.moves,
          { at: movedAt, fromColumnId: card.columnId, toColumnId: targetColumnId },
        ],
        activities: [
          ...card.activities,
          createMoveActivity(`Moved to ${targetColumn.title}`),
        ],
      };

      set({
        cards: state.cards.map((entry) => entry.id === cardId ? optimisticCard : entry),
        error: null,
      });

      try {
        const updatedCard = await kanbanApi.moveCard(cardId, targetColumnId);
        if (!updatedCard) {
          set({ cards: previousCards, error: "Failed to move card." });
          return;
        }

        set({
          cards: get().cards.map((entry) => entry.id === cardId ? updatedCard : entry),
          error: null,
        });
      } catch (error) {
        set({
          cards: previousCards,
          error: getErrorMessage(error, "Failed to move card."),
        });
      }
    },
    deleteCard: async (cardId) => {
      await runMutation(async () => kanbanApi.deleteCard(cardId), "Failed to delete card.");
    },
    archiveCard: async (cardId) => {
      await runMutation(async () => {
        const archivedEntry = await kanbanApi.archiveCard(cardId);

        return archivedEntry !== null;
      }, "Failed to archive card.");
    },
    restoreArchivedCard: async (cardId, targetColumnId) => {
      await runMutation(async () => {
        const restoredCard = await kanbanApi.restoreCard(cardId, targetColumnId);

        return restoredCard !== null;
      }, "Failed to restore archived card.");
    },
    editCard: async (cardId, payload) => {
      const validation = validateUpdateCardInput(payload);
      if (!validation.value) {
        set({ error: validation.error ?? "Invalid card." });
        return;
      }
      const validatedPayload = validation.value;
      await runMutation(async () => {
        const result = await kanbanApi.updateCard(cardId, validatedPayload);
        return result !== null;
      }, "Failed to update card.");
    },
    setFilter: async (payload) => {
      const filter = {
        ...get().filter,
        ...payload,
      };
      set({ filter, error: null });
      persistViewPreferences(filter, get().swimlaneGroupBy);

      try {
        await kanbanApi.updateFilter(payload);
      } catch (error) {
        set({ error: getErrorMessage(error, "Failed to update filter.") });
      }
    },
    setSwimlaneGroupBy: async (groupBy) => {
      set({ swimlaneGroupBy: groupBy, error: null });
      persistViewPreferences(get().filter, groupBy);

      try {
        await kanbanApi.updateSwimlaneGroupBy(groupBy);
      } catch (error) {
        set({ error: getErrorMessage(error, "Failed to update swimlane grouping.") });
      }
    },
    addColumn: async (input) => {
      const title = input.title.trim();
      if (!title) {
        set({ error: "Column title cannot be empty." });
        return;
      }
      await runMutation(async () => {
        await kanbanApi.createColumn({ ...input, title });
        return true;
      }, "Failed to create column.");
    },
    editColumn: async (columnId, payload) => {
      await runMutation(async () => {
        const result = await kanbanApi.updateColumn(columnId, payload);
        return result !== null;
      }, "Failed to update column.");
    },
    removeColumn: async (columnId, fallbackColumnId) => {
      await runMutation(async () => {
        return kanbanApi.deleteColumn(columnId, fallbackColumnId);
      }, "Failed to delete column.");
    },
    reorderColumns: async (orderedIds) => {
      const state = get();
      const columnsById = new Map(state.columns.map((column) => [column.id, column]));
      const orderedColumns = orderedIds
        .map((id) => columnsById.get(id))
        .filter((column): column is Column => Boolean(column));

      if (orderedColumns.length !== state.columns.length) {
        set({ error: "Failed to reorder columns." });
        return;
      }

      const previousColumns = state.columns;
      const optimisticColumns = orderedColumns.map((column, index) => ({
        ...column,
        order: index,
      }));

      set({ columns: optimisticColumns, error: null });

      try {
        const success = await kanbanApi.reorderColumns(orderedIds);
        if (!success) {
          set({ columns: previousColumns, error: "Failed to reorder columns." });
        }
      } catch (error) {
        set({
          columns: previousColumns,
          error: getErrorMessage(error, "Failed to reorder columns."),
        });
      }
    },
    applyTemplate: async (templateId) => {
      await runMutation(async () => {
        return kanbanApi.applyBoardTemplate(templateId);
      }, "Failed to apply board template.");
    },
    exportBoard: (format): string => {
      const state = get();
      return format === "json" ? buildJsonExport(state) : buildCsvExport(state);
    },
    resetState: () => {
      if (!USE_SUPABASE) {
        resetKanbanApiMock();
      }
      clearViewPreferences();
      set(buildInitialState());
    },
    addCustomCategory: (name) => {
      const normalized = name.trim().toLowerCase();
      if (!normalized || BUILT_IN_CATEGORIES.includes(normalized)) return;
      const current = get().customCategories;
      if (current.includes(normalized)) return;
      const updated = [...current, normalized];
      persistCustomCategories(updated);
      set({ customCategories: updated });
    },
    removeCustomCategory: (name) => {
      const updated = get().customCategories.filter((c) => c !== name);
      persistCustomCategories(updated);
      set({ customCategories: updated });
    },
  };
});
