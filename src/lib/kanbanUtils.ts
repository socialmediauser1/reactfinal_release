import type { Card, CardPriority, CardSortMode, DueStatusFilter } from "../types";
import type {
  CreateCardRequest,
  CreateColumnRequest,
  UpdateCardRequest,
  UpdateColumnRequest,
} from "../services/api";

export const CARD_LIMITS = {
  title: 120,
  description: 1000,
  assignee: 120,
  tags: 8,
  tagLength: 24,
};

export const DUE_DATE_YEAR_LIMITS = {
  min: 2000,
  max: 2099,
};

export const COLUMN_LIMITS = {
  title: 40,
};

const PRIORITY_ORDER: Record<CardPriority, number> = { high: 0, medium: 1, low: 2 };

export interface ValidationResult<T> {
  value: T | null;
  error: string | null;
}

export function normalizeTags(tags: string[] | string | undefined): string[] {
  const rawTags = Array.isArray(tags) ? tags : tags ? tags.split(",") : [];
  const normalized = rawTags
    .map((tag) => tag.trim().toLowerCase().slice(0, CARD_LIMITS.tagLength))
    .filter(Boolean);
  return Array.from(new Set(normalized)).slice(0, CARD_LIMITS.tags);
}

export function normalizeDueDate(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  const isValidDate =
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day;
  return isValidDate ? value : undefined;
}

export function isDueDateYearInRange(value: string): boolean {
  const dueDate = normalizeDueDate(value);
  if (!dueDate) return false;
  const year = Number(dueDate.slice(0, 4));
  return year >= DUE_DATE_YEAR_LIMITS.min && year <= DUE_DATE_YEAR_LIMITS.max;
}

function validateDueDate(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!normalizeDueDate(value)) return "Due date must use YYYY-MM-DD format.";
  if (!isDueDateYearInRange(value)) {
    return `Due date year must be between ${DUE_DATE_YEAR_LIMITS.min} and ${DUE_DATE_YEAR_LIMITS.max}.`;
  }
  return null;
}

export function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDueStatus(card: Card): DueStatusFilter {
  if (!card.dueDate) return "none";
  const today = getLocalDateKey();
  if (card.dueDate < today) return "overdue";
  if (card.dueDate === today) return "today";
  return "upcoming";
}

export function getDueLabel(card: Card): string | null {
  const status = getDueStatus(card);
  if (status === "none") return null;
  if (status === "overdue") return "Overdue";
  if (status === "today") return "Today";
  return `Due ${card.dueDate}`;
}

export function sortCards(cards: Card[], sortMode: CardSortMode): Card[] {
  return [...cards].sort((left, right) => {
    if (sortMode === "priority") {
      return PRIORITY_ORDER[left.priority ?? "medium"] - PRIORITY_ORDER[right.priority ?? "medium"];
    }
    if (sortMode === "dueDate") {
      return (left.dueDate ?? "9999-12-31").localeCompare(right.dueDate ?? "9999-12-31");
    }
    if (sortMode === "title") {
      return left.title.localeCompare(right.title);
    }
    return Date.parse(right.createdAt) - Date.parse(left.createdAt);
  });
}

export function validateCreateCardInput(input: CreateCardRequest): ValidationResult<CreateCardRequest> {
  const title = input.title.trim();
  if (!title) return { value: null, error: "Card title cannot be empty." };
  if (title.length > CARD_LIMITS.title) {
    return { value: null, error: `Card title must be ${CARD_LIMITS.title} characters or fewer.` };
  }

  const description = input.description ?? "";
  if (description.length > CARD_LIMITS.description) {
    return { value: null, error: `Description must be ${CARD_LIMITS.description} characters or fewer.` };
  }

  const assignee = input.assignee?.trim() || undefined;
  if (assignee && assignee.length > CARD_LIMITS.assignee) {
    return { value: null, error: `Assignee must be ${CARD_LIMITS.assignee} characters or fewer.` };
  }

  const dueDateError = validateDueDate(input.dueDate);
  if (dueDateError) {
    return { value: null, error: dueDateError };
  }

  return {
    value: {
      ...input,
      title,
      description,
      assignee,
      dueDate: normalizeDueDate(input.dueDate),
      tags: normalizeTags(input.tags),
    },
    error: null,
  };
}

export function validateUpdateCardInput(input: UpdateCardRequest): ValidationResult<UpdateCardRequest> {
  const output: UpdateCardRequest = { ...input };

  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) return { value: null, error: "Card title cannot be empty." };
    if (title.length > CARD_LIMITS.title) {
      return { value: null, error: `Card title must be ${CARD_LIMITS.title} characters or fewer.` };
    }
    output.title = title;
  }

  if (input.description !== undefined && input.description.length > CARD_LIMITS.description) {
    return { value: null, error: `Description must be ${CARD_LIMITS.description} characters or fewer.` };
  }

  if (input.assignee !== undefined) {
    const assignee = input.assignee.trim();
    if (assignee && assignee.length > CARD_LIMITS.assignee) {
      return { value: null, error: `Assignee must be ${CARD_LIMITS.assignee} characters or fewer.` };
    }
    output.assignee = assignee;
  }

  if (Object.prototype.hasOwnProperty.call(input, "dueDate")) {
    const dueDateError = validateDueDate(input.dueDate);
    if (dueDateError) {
      return { value: null, error: dueDateError };
    }
    output.dueDate = normalizeDueDate(input.dueDate) ?? null;
  }

  if (input.tags !== undefined) {
    output.tags = normalizeTags(input.tags);
  }

  return { value: output, error: null };
}

export function validateCreateColumnInput(input: CreateColumnRequest): ValidationResult<CreateColumnRequest> {
  const title = input.title.trim();
  if (!title) return { value: null, error: "Column title cannot be empty." };
  if (title.length > COLUMN_LIMITS.title) {
    return { value: null, error: `Column title must be ${COLUMN_LIMITS.title} characters or fewer.` };
  }

  return {
    value: {
      ...input,
      title,
    },
    error: null,
  };
}

export function validateUpdateColumnInput(input: UpdateColumnRequest): ValidationResult<UpdateColumnRequest> {
  const output: UpdateColumnRequest = { ...input };

  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) return { value: null, error: "Column title cannot be empty." };
    if (title.length > COLUMN_LIMITS.title) {
      return { value: null, error: `Column title must be ${COLUMN_LIMITS.title} characters or fewer.` };
    }
    output.title = title;
  }

  return { value: output, error: null };
}
