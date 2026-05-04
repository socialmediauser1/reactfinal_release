export type CardCategory = string;
export type SwimlaneGroupBy = "category" | "assignee" | "priority";
export type CardPriority = "low" | "medium" | "high";
export type BoardType = "personal" | "team";
export type DueStatusFilter = "all" | "overdue" | "today" | "upcoming" | "none";
export type CardSortMode = "created" | "priority" | "dueDate" | "title";
export type CardActivityType = "created" | "edited" | "moved" | "archived" | "restored" | "template";
export type BoardTemplateId = "personal" | "sprint" | "school" | "jobs";

export interface Board {
  id: string;
  name: string;
  type: BoardType;
  ownerId: string;
  joinCode: string | null;
  memberCount: number;
  createdAt: string;
}

export interface Column {
  id: string;
  title: string;
  order: number;
  wipLimit?: number;
}

export interface CardMove {
  at: string;
  fromColumnId: string;
  toColumnId: string;
}

export interface CardActivity {
  id: string;
  at: string;
  type: CardActivityType;
  message: string;
}

export interface Card {
  id: string;
  title: string;
  description: string;
  category: CardCategory;
  columnId: string;
  assignee?: string;
  priority?: CardPriority;
  dueDate?: string;
  tags: string[];
  createdAt: string;
  columnEnteredAt: string;
  moves: CardMove[];
  activities: CardActivity[];
}

export interface ArchivedCardEntry {
  card: Card;
  archivedAt: string;
}

export interface FilterState {
  category: CardCategory | null;
  swimlaneValue: string | null;
  searchQuery: string;
  tag: string | null;
  dueStatus: DueStatusFilter;
  sortMode: CardSortMode;
}
