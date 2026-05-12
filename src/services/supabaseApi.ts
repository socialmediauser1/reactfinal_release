/**
 * Supabase implementation of KanbanApiService (board-scoped).
 * See boardsApi.ts for the SQL schema and RLS policies to run first.
 *
 * Original single-board SQL (still required):
 *
 * create table public.columns (
 *   id uuid primary key default gen_random_uuid(),
 *   user_id uuid references auth.users(id) on delete cascade not null,
 *   title text not null,
 *   "order" integer not null default 0,
 *   wip_limit integer,
 *   board_id uuid references public.boards(id) on delete cascade
 * );
 *
 * create table public.cards (
 *   id uuid primary key default gen_random_uuid(),
 *   user_id uuid references auth.users(id) on delete cascade not null,
 *   column_id uuid references public.columns(id) on delete cascade not null,
 *   title text not null,
 *   description text not null default '',
 *   category text not null default 'feature',
 *   assignee text,
 *   priority text,
 *   due_date date,
 *   tags text[] not null default '{}',
 *   created_at timestamptz not null default now(),
 *   column_entered_at timestamptz not null default now(),
 *   moves jsonb not null default '[]'::jsonb,
 *   activities jsonb not null default '[]'::jsonb
 * );
 *
 * Migration for existing projects:
 * alter table public.cards add column if not exists due_date date;
 * alter table public.cards add column if not exists tags text[] not null default '{}';
 * alter table public.cards add column if not exists activities jsonb not null default '[]'::jsonb;
 * alter table public.cards add column if not exists comments jsonb not null default '[]'::jsonb;
 *
 * create table public.archived_cards (
 *   id uuid primary key,
 *   user_id uuid references auth.users(id) on delete cascade not null,
 *   card jsonb not null,
 *   archived_at timestamptz not null default now(),
 *   board_id uuid references public.boards(id) on delete cascade
 * );
 */

import { supabase } from "../lib/supabase";
import type {
  ArchivedCardEntry,
  BoardTemplateId,
  Card,
  CardActivity,
  CardActivityType,
  CardCategory,
  CardComment,
  CardMove,
  CardPriority,
  Column,
  FilterState,
  SwimlaneGroupBy,
} from "../types";
import type {
  BoardSnapshot,
  CreateCardRequest,
  CreateColumnRequest,
  KanbanApiService,
  UpdateCardRequest,
  UpdateColumnRequest,
} from "./api";
import { getBoardTemplate } from "./api";
import {
  normalizeDueDate,
  normalizeTags,
  validateCreateCardInput,
  validateCreateColumnInput,
  validateUpdateCardInput,
  validateUpdateColumnInput,
} from "../lib/kanbanUtils";

let currentBoardId: string | null = null;

export function setActiveBoardId(boardId: string): void {
  currentBoardId = boardId;
  localState.filter = {
    category: null,
    swimlaneValue: null,
    searchQuery: "",
    tag: null,
    dueStatus: "all",
    sortMode: "created",
  };
  localState.swimlaneGroupBy = null;
}

function requireBoardId(): string {
  if (!currentBoardId) throw new Error("No active board selected.");
  return currentBoardId;
}

const localState = {
  filter: {
    category: null,
    swimlaneValue: null,
    searchQuery: "",
    tag: null,
    dueStatus: "all",
    sortMode: "created",
  } as FilterState,
  swimlaneGroupBy: null as SwimlaneGroupBy | null,
};

const DEFAULT_COLUMNS = [
  { title: "To Do", order: 0, wip_limit: 4 },
  { title: "In Progress", order: 1, wip_limit: 2 },
  { title: "Done", order: 2, wip_limit: null },
];

async function getCurrentUserId(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) throw new Error("Not authenticated");
  return session.user.id;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToColumn(row: any): Column {
  return {
    id: row.id as string,
    title: row.title as string,
    order: row.order as number,
    ...(row.wip_limit != null ? { wipLimit: row.wip_limit as number } : {}),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToCard(row: any): Card {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) ?? "",
    category: row.category as CardCategory,
    columnId: row.column_id as string,
    assignee: row.assignee != null ? (row.assignee as string) : undefined,
    priority: row.priority != null ? (row.priority as CardPriority) : undefined,
    dueDate: row.due_date != null ? (row.due_date as string) : undefined,
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    createdAt: row.created_at as string,
    columnEnteredAt: row.column_entered_at as string,
    moves: (row.moves as CardMove[]) ?? [],
    activities: (row.activities as CardActivity[]) ?? [],
    comments: Array.isArray(row.comments) ? (row.comments as CardComment[]) : [],
  };
}

function normalizeStoredCard(card: Card): Card {
  return {
    ...card,
    dueDate: card.dueDate,
    tags: Array.isArray(card.tags) ? card.tags : [],
    moves: Array.isArray(card.moves) ? card.moves : [],
    activities: Array.isArray(card.activities) ? card.activities : [],
    comments: Array.isArray(card.comments) ? card.comments : [],
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToArchivedEntry(row: any): ArchivedCardEntry {
  return {
    card: normalizeStoredCard(row.card as Card),
    archivedAt: row.archived_at as string,
  };
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

function appendActivity(card: Card, type: CardActivityType, message: string): Card {
  return {
    ...card,
    activities: [...(card.activities ?? []), createActivity(type, message)],
  };
}

function cardToInsertRow(card: Card, userId: string): Record<string, unknown> {
  return {
    id: card.id,
    user_id: userId,
    column_id: card.columnId,
    title: card.title,
    description: card.description,
    category: card.category,
    assignee: card.assignee ?? null,
    priority: card.priority ?? null,
    due_date: card.dueDate ?? null,
    tags: card.tags ?? [],
    created_at: card.createdAt,
    column_entered_at: card.columnEnteredAt,
    moves: card.moves,
    activities: card.activities ?? [],
    comments: card.comments ?? [],
  };
}

function isMissingCommentsColumnError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const source = error as { code?: unknown; message?: unknown };
  const code = typeof source.code === "string" ? source.code : "";
  const message = typeof source.message === "string" ? source.message.toLowerCase() : "";
  return code === "42703" && message.includes("comments");
}

async function insertCardRow(row: Record<string, unknown>) {
  const { data, error } = await supabase.from("cards").insert(row).select().single();
  if (!error) return data;

  if (Object.prototype.hasOwnProperty.call(row, "comments") && isMissingCommentsColumnError(error)) {
    const legacyRow = { ...row };
    delete legacyRow.comments;

    const retry = await supabase.from("cards").insert(legacyRow).select().single();
    if (retry.error) throw retry.error;
    return retry.data;
  }

  throw error;
}

async function createSupabaseCard(payload: CreateCardRequest, activityType: CardActivityType = "created"): Promise<Card> {
  const validation = validateCreateCardInput(payload);
  if (!validation.value) {
    throw new Error(validation.error ?? "Invalid card.");
  }
  const validatedPayload = validation.value;
  const userId = await getCurrentUserId();
  const boardId = requireBoardId();

  const { data: columnRows } = await supabase
    .from("columns")
    .select("id")
    .eq("board_id", boardId)
    .order("order", { ascending: true })
    .limit(1);
  const defaultColumnId = columnRows?.[0]?.id as string | undefined;
  const resolvedColumnId = validatedPayload.columnId ?? defaultColumnId ?? "";
  const now = new Date().toISOString();

  const row = {
    user_id: userId,
    column_id: resolvedColumnId,
    title: validatedPayload.title,
    description: validatedPayload.description ?? "",
    category: validatedPayload.category ?? "feature",
    assignee: validatedPayload.assignee?.trim() || null,
    priority: validatedPayload.priority ?? "medium",
    due_date: normalizeDueDate(validatedPayload.dueDate) ?? null,
    tags: normalizeTags(validatedPayload.tags),
    created_at: now,
    column_entered_at: now,
    moves: [],
    activities: [
      createActivity(activityType, activityType === "template" ? "Created from template" : "Created card"),
    ],
    comments: [],
  };

  const data = await insertCardRow(row);
  return rowToCard(data);
}

export const supabaseKanbanApi: KanbanApiService = {
  async getBoardSnapshot(): Promise<BoardSnapshot> {
    const userId = await getCurrentUserId();
    const boardId = requireBoardId();

    const { data: columnRows, error: colErr } = await supabase
      .from("columns")
      .select("*")
      .eq("board_id", boardId)
      .order("order", { ascending: true });

    if (colErr) throw colErr;

    let columns: Column[];
    const existing = columnRows ?? [];

    if (existing.length === 0) {
      const toInsert = DEFAULT_COLUMNS.map((d, i) => ({
        user_id: userId,
        board_id: boardId,
        title: d.title,
        order: i,
        ...(d.wip_limit !== null ? { wip_limit: d.wip_limit } : {}),
      }));
      const { data: inserted, error: insertErr } = await supabase
        .from("columns")
        .insert(toInsert)
        .select();
      if (insertErr) throw insertErr;
      columns = (inserted ?? []).map(rowToColumn);
    } else {
      columns = existing.map(rowToColumn);
    }

    const columnIds = columns.map((c) => c.id);
    const { data: cardRows, error: cardErr } =
      columnIds.length > 0
        ? await supabase.from("cards").select("*").in("column_id", columnIds)
        : { data: [], error: null };
    if (cardErr) throw cardErr;

    const { data: archivedRows, error: archErr } = await supabase
      .from("archived_cards")
      .select("*")
      .eq("board_id", boardId)
      .order("archived_at", { ascending: false });
    if (archErr) throw archErr;

    return {
      columns,
      cards: (cardRows ?? []).map(rowToCard),
      archivedEntries: (archivedRows ?? []).map(rowToArchivedEntry),
      swimlaneGroupBy: localState.swimlaneGroupBy,
      filter: { ...localState.filter },
    };
  },

  async createCard(payload: CreateCardRequest): Promise<Card> {
    return createSupabaseCard(payload);
  },

  async updateCard(cardId: string, payload: UpdateCardRequest): Promise<Card | null> {
    const validation = validateUpdateCardInput(payload);
    if (!validation.value) {
      throw new Error(validation.error ?? "Invalid card.");
    }
    const validatedPayload = validation.value;
    const { data: existing } = await supabase.from("cards").select("*").eq("id", cardId).single();
    const currentActivities = existing ? rowToCard(existing).activities : [];
    const updates: Record<string, unknown> = {};
    if (validatedPayload.title !== undefined && validatedPayload.title.trim()) {
      updates.title = validatedPayload.title.trim();
    }
    if (validatedPayload.description !== undefined) updates.description = validatedPayload.description;
    if (validatedPayload.category !== undefined) updates.category = validatedPayload.category;
    if (validatedPayload.assignee !== undefined) updates.assignee = validatedPayload.assignee.trim() || null;
    if (validatedPayload.priority !== undefined) updates.priority = validatedPayload.priority;
    if (Object.prototype.hasOwnProperty.call(payload, "dueDate")) {
      updates.due_date = normalizeDueDate(validatedPayload.dueDate) ?? null;
    }
    if (validatedPayload.tags !== undefined) updates.tags = normalizeTags(validatedPayload.tags);
    updates.activities = [...currentActivities, createActivity("edited", "Updated card")];

    const { data, error } = await supabase
      .from("cards")
      .update(updates)
      .eq("id", cardId)
      .select()
      .single();

    if (error) return null;
    return rowToCard(data);
  },

  async moveCard(cardId: string, targetColumnId: string): Promise<Card | null> {
    const { data: existing, error: fetchErr } = await supabase
      .from("cards")
      .select("*")
      .eq("id", cardId)
      .single();

    if (fetchErr || !existing) return null;
    if (existing.column_id === targetColumnId) return rowToCard(existing);

    const movedAt = new Date().toISOString();
    const targetColumn = await supabase.from("columns").select("title").eq("id", targetColumnId).single();
    const currentCard = rowToCard(existing);
    const newMoves: CardMove[] = [
      ...((existing.moves as CardMove[]) ?? []),
      { at: movedAt, fromColumnId: existing.column_id as string, toColumnId: targetColumnId },
    ];
    const activities = [
      ...currentCard.activities,
      createActivity("moved", `Moved to ${(targetColumn.data?.title as string | undefined) ?? "another column"}`),
    ];

    const { data, error } = await supabase
      .from("cards")
      .update({ column_id: targetColumnId, column_entered_at: movedAt, moves: newMoves, activities })
      .eq("id", cardId)
      .select()
      .single();

    if (error) return null;
    return rowToCard(data);
  },

  async deleteCard(cardId: string): Promise<boolean> {
    const { error } = await supabase.from("cards").delete().eq("id", cardId);
    return !error;
  },

  async archiveCard(cardId: string): Promise<ArchivedCardEntry | null> {
    const userId = await getCurrentUserId();
    const boardId = requireBoardId();

    const { data: cardRow, error: fetchErr } = await supabase
      .from("cards")
      .select("*")
      .eq("id", cardId)
      .single();

    if (fetchErr || !cardRow) return null;

    const card = appendActivity(rowToCard(cardRow), "archived", "Archived card");
    const archivedAt = new Date().toISOString();

    const { error: delErr } = await supabase.from("cards").delete().eq("id", cardId);
    if (delErr) return null;

    const { error: insErr } = await supabase
      .from("archived_cards")
      .insert({ id: cardId, user_id: userId, board_id: boardId, card, archived_at: archivedAt });

    if (insErr) return null;
    return { card, archivedAt };
  },

  async restoreCard(cardId: string, targetColumnId?: string): Promise<Card | null> {
    const userId = await getCurrentUserId();

    const { data: archivedRow, error: fetchErr } = await supabase
      .from("archived_cards")
      .select("*")
      .eq("id", cardId)
      .single();

    if (fetchErr || !archivedRow) return null;

    const archivedCard = normalizeStoredCard(archivedRow.card as Card);
    const resolvedColumnId = targetColumnId ?? archivedCard.columnId;
    const restoredAt = new Date().toISOString();

    const cardWithoutActivity: Card =
      archivedCard.columnId === resolvedColumnId
        ? { ...archivedCard, columnEnteredAt: restoredAt }
        : {
            ...archivedCard,
            columnId: resolvedColumnId,
            columnEnteredAt: restoredAt,
            moves: [
              ...archivedCard.moves,
              {
                at: restoredAt,
                fromColumnId: archivedCard.columnId,
                toColumnId: resolvedColumnId,
              },
            ],
          };
    const card = appendActivity(cardWithoutActivity, "restored", "Restored card");

    const { error: delErr } = await supabase
      .from("archived_cards")
      .delete()
      .eq("id", cardId);
    if (delErr) return null;

    try {
      await insertCardRow(cardToInsertRow(card, userId));
    } catch {
      return null;
    }

    return card;
  },

  async addCardComment(cardId: string, payload: { body: string }): Promise<CardComment | null> {
    const body = payload.body.trim();
    if (!body) return null;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) throw new Error("Not authenticated");

    const { data: existing, error: fetchErr } = await supabase
      .from("cards")
      .select("*")
      .eq("id", cardId)
      .single();
    if (fetchErr || !existing) return null;

    const currentCard = rowToCard(existing);
    const comment: CardComment = {
      id: crypto.randomUUID(),
      cardId,
      authorId: user.id,
      authorName: user.email ?? "Board member",
      authorEmail: user.email ?? undefined,
      body,
      createdAt: new Date().toISOString(),
    };
    const comments = [...currentCard.comments, comment];
    const activities = [...currentCard.activities, createActivity("commented", "Added comment")];

    const { error } = await supabase
      .from("cards")
      .update({ comments, activities })
      .eq("id", cardId);

    if (error) return null;
    return comment;
  },

  async createColumn(payload: CreateColumnRequest): Promise<Column> {
    const validation = validateCreateColumnInput(payload);
    if (!validation.value) {
      throw new Error(validation.error ?? "Invalid column.");
    }
    const validatedPayload = validation.value;
    const userId = await getCurrentUserId();
    const boardId = requireBoardId();

    const { data: existing } = await supabase
      .from("columns")
      .select("order")
      .eq("board_id", boardId)
      .order("order", { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0 ? (existing[0].order as number) + 1 : 0;

    const row: Record<string, unknown> = {
      user_id: userId,
      board_id: boardId,
      title: validatedPayload.title,
      order: nextOrder,
    };
    if (validatedPayload.wipLimit !== undefined) row.wip_limit = validatedPayload.wipLimit;

    const { data, error } = await supabase.from("columns").insert(row).select().single();
    if (error) throw error;
    return rowToColumn(data);
  },

  async updateColumn(columnId: string, payload: UpdateColumnRequest): Promise<Column | null> {
    const validation = validateUpdateColumnInput(payload);
    if (!validation.value) {
      throw new Error(validation.error ?? "Invalid column.");
    }
    const validatedPayload = validation.value;
    const boardId = requireBoardId();
    const updates: Record<string, unknown> = {};
    if (validatedPayload.title?.trim()) updates.title = validatedPayload.title.trim();
    if ("wipLimit" in payload) updates.wip_limit = validatedPayload.wipLimit ?? null;

    if (validatedPayload.order !== undefined) {
      const { data: allCols } = await supabase
        .from("columns")
        .select("id, order")
        .eq("board_id", boardId)
        .order("order", { ascending: true });

      if (allCols) {
        const without = allCols.filter((c) => c.id !== columnId);
        const bounded = Math.max(0, Math.min(validatedPayload.order, without.length));
        without.splice(bounded, 0, { id: columnId, order: bounded });
        for (let i = 0; i < without.length; i++) {
          await supabase.from("columns").update({ order: i }).eq("id", without[i].id);
        }
      }
    }

    if (Object.keys(updates).length > 0) {
      const { data, error } = await supabase
        .from("columns")
        .update(updates)
        .eq("id", columnId)
        .select()
        .single();
      if (error) return null;
      return rowToColumn(data);
    }

    const { data, error } = await supabase
      .from("columns")
      .select("*")
      .eq("id", columnId)
      .single();
    if (error) return null;
    return rowToColumn(data);
  },

  async deleteColumn(columnId: string, fallbackColumnId?: string): Promise<boolean> {
    const boardId = requireBoardId();
    const { data: allCols } = await supabase
      .from("columns")
      .select("*")
      .eq("board_id", boardId);
    if (!allCols || allCols.length <= 2) return false;

    const remaining = allCols.filter((c) => c.id !== columnId);
    if (remaining.length === allCols.length) return false;

    const resolvedFallback =
      (fallbackColumnId && remaining.some((c) => c.id === fallbackColumnId)
        ? fallbackColumnId
        : null) ?? (remaining[0]?.id as string | undefined);

    if (!resolvedFallback) return false;

    const movedAt = new Date().toISOString();
    const { data: cardsToMove } = await supabase
      .from("cards")
      .select("id, moves, activities")
      .eq("column_id", columnId);

    for (const cardRow of cardsToMove ?? []) {
      const newMoves: CardMove[] = [
        ...((cardRow.moves as CardMove[]) ?? []),
        { at: movedAt, fromColumnId: columnId, toColumnId: resolvedFallback },
      ];
      const activities = [
        ...((cardRow.activities as CardActivity[]) ?? []),
        createActivity("moved", "Moved after column deletion"),
      ];
      await supabase
        .from("cards")
        .update({ column_id: resolvedFallback, column_entered_at: movedAt, moves: newMoves, activities })
        .eq("id", cardRow.id);
    }

    const { error } = await supabase.from("columns").delete().eq("id", columnId);
    if (error) return false;

    const sorted = remaining.sort((a, b) => (a.order as number) - (b.order as number));
    for (let i = 0; i < sorted.length; i++) {
      if ((sorted[i].order as number) !== i) {
        await supabase.from("columns").update({ order: i }).eq("id", sorted[i].id);
      }
    }

    return true;
  },

  async reorderColumns(orderedIds: string[]): Promise<boolean> {
    for (let i = 0; i < orderedIds.length; i++) {
      const { error } = await supabase.from("columns").update({ order: i }).eq("id", orderedIds[i]);
      if (error) return false;
    }
    return true;
  },

  async applyBoardTemplate(templateId: BoardTemplateId): Promise<boolean> {
    const template = getBoardTemplate(templateId);
    if (!template) return false;
    const userId = await getCurrentUserId();
    const boardId = requireBoardId();

    const { data: existingColumns, error: columnError } = await supabase
      .from("columns")
      .select("*")
      .eq("board_id", boardId)
      .order("order", { ascending: true });
    if (columnError) throw columnError;

    if (template.columns.length === 0) return false;

    const previousColumnIds = (existingColumns ?? []).map((column) => column.id as string);
    const { data: preExistingCards, error: preExistingCardsError } = previousColumnIds.length > 0
      ? await supabase
          .from("cards")
          .select("id, column_id, moves, activities")
          .in("column_id", previousColumnIds)
      : { data: [], error: null };
    if (preExistingCardsError) throw preExistingCardsError;

    const templateColumnRows = template.columns.map((columnInput, index) => ({
      user_id: userId,
      board_id: boardId,
      title: columnInput.title.trim(),
      order: index,
      wip_limit: columnInput.wipLimit ?? null,
    }));

    const { data: insertedColumns, error: insertColumnError } = await supabase
      .from("columns")
      .insert(templateColumnRows)
      .select("*");
    if (insertColumnError) throw insertColumnError;

    const columns = (insertedColumns ?? [])
      .map(rowToColumn)
      .sort((left, right) => left.order - right.order);

    const firstColumnId = columns[0]?.id;
    if (!firstColumnId) return false;

    if ((preExistingCards ?? []).length > 0) {
      const movedAt = new Date().toISOString();
      for (const cardRow of preExistingCards ?? []) {
        const newMoves: CardMove[] = [
          ...((cardRow.moves as CardMove[]) ?? []),
          { at: movedAt, fromColumnId: cardRow.column_id as string, toColumnId: firstColumnId },
        ];
        const activities = [
          ...((cardRow.activities as CardActivity[]) ?? []),
          createActivity("moved", `Moved to ${template.columns[0].title} by template`),
        ];
        const { error } = await supabase
          .from("cards")
          .update({ column_id: firstColumnId, column_entered_at: movedAt, moves: newMoves, activities })
          .eq("id", cardRow.id);
        if (error) return false;
      }
    }

    if (previousColumnIds.length > 0) {
      const { error } = await supabase.from("columns").delete().in("id", previousColumnIds);
      if (error) return false;
    }

    const columnsByTitle = new Map(columns.map((column) => [column.title.toLowerCase(), column.id]));
    for (const card of template.cards) {
      const columnId = columnsByTitle.get(card.columnTitle.toLowerCase()) ?? columns[0]?.id;
      if (!columnId) return false;
      await createSupabaseCard(
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

  async updateFilter(payload: Partial<FilterState>): Promise<FilterState> {
    localState.filter = { ...localState.filter, ...payload };
    return { ...localState.filter };
  },

  async updateSwimlaneGroupBy(groupBy: SwimlaneGroupBy | null): Promise<SwimlaneGroupBy | null> {
    localState.swimlaneGroupBy = groupBy;
    return localState.swimlaneGroupBy;
  },
};
