import { beforeEach, describe, expect, it } from "vitest";
import { useKanbanStore } from "./kanbanStore";

describe("kanbanStore", () => {
  beforeEach(() => {
    useKanbanStore.getState().resetState();
  });

  it("starts with async-ready loading and error fields", () => {
    const state = useKanbanStore.getState();

    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it("adds and deletes a card", async () => {
    await useKanbanStore.getState().addCard({
      title: "Create store operation",
      description: "Step 2 wiring",
      category: "feature",
    });

    const createdCard = useKanbanStore.getState().cards[0];

    expect(useKanbanStore.getState().cards).toHaveLength(1);
    expect(createdCard.columnId).toBe("column-todo");

    await useKanbanStore.getState().deleteCard(createdCard.id);

    expect(useKanbanStore.getState().cards).toHaveLength(0);
  });

  it("moves a card and appends move history", async () => {
    await useKanbanStore.getState().addCard({
      title: "Move this task",
    });

    const createdCard = useKanbanStore.getState().cards[0];

    await useKanbanStore.getState().moveCard(createdCard.id, "column-in-progress");

    const movedCard = useKanbanStore.getState().cards[0];

    expect(movedCard.columnId).toBe("column-in-progress");
    expect(movedCard.moves).toHaveLength(1);
    expect(movedCard.moves[0].fromColumnId).toBe("column-todo");
    expect(movedCard.moves[0].toColumnId).toBe("column-in-progress");
  });

  it("rejects an empty card title with a visible error", async () => {
    await useKanbanStore.getState().addCard({ title: "   " });

    expect(useKanbanStore.getState().cards).toHaveLength(0);
    expect(useKanbanStore.getState().error).toBe("Card title cannot be empty.");
  });

  it("rejects card input beyond production limits", async () => {
    await useKanbanStore.getState().addCard({ title: "x".repeat(121) });

    expect(useKanbanStore.getState().cards).toHaveLength(0);
    expect(useKanbanStore.getState().error).toBe("Card title must be 120 characters or fewer.");
  });

  it("archives and restores a card", async () => {
    await useKanbanStore.getState().addCard({ title: "Ship demo polish" });
    const card = useKanbanStore.getState().cards[0];

    await useKanbanStore.getState().archiveCard(card.id);

    expect(useKanbanStore.getState().cards).toHaveLength(0);
    expect(useKanbanStore.getState().archivedEntries).toHaveLength(1);

    await useKanbanStore.getState().restoreArchivedCard(card.id, "column-todo");

    expect(useKanbanStore.getState().cards).toHaveLength(1);
    expect(useKanbanStore.getState().archivedEntries).toHaveLength(0);
  });

  it("updates filters and swimlane grouping", async () => {
    await useKanbanStore.getState().setFilter({
      category: "bug",
      searchQuery: "login",
      tag: "frontend",
      dueStatus: "overdue",
      sortMode: "priority",
    });
    await useKanbanStore.getState().setSwimlaneGroupBy("priority");

    const state = useKanbanStore.getState();

    expect(state.filter.category).toBe("bug");
    expect(state.filter.searchQuery).toBe("login");
    expect(state.filter.tag).toBe("frontend");
    expect(state.filter.dueStatus).toBe("overdue");
    expect(state.filter.sortMode).toBe("priority");
    expect(state.swimlaneGroupBy).toBe("priority");
  });

  it("creates and edits a card with due date, normalized tags, and activity", async () => {
    await useKanbanStore.getState().addCard({
      title: "Ship tagged work",
      dueDate: "2026-05-10",
      tags: ["Frontend", " review ", "frontend"],
    });

    const created = useKanbanStore.getState().cards[0];
    expect(created.dueDate).toBe("2026-05-10");
    expect(created.tags).toEqual(["frontend", "review"]);
    expect(created.activities.map((activity) => activity.type)).toEqual(["created"]);

    await useKanbanStore.getState().editCard(created.id, {
      dueDate: null,
      tags: ["QA", "Blocked"],
    });

    const edited = useKanbanStore.getState().cards[0];
    expect(edited.dueDate).toBeUndefined();
    expect(edited.tags).toEqual(["qa", "blocked"]);
    expect(edited.activities.map((activity) => activity.type)).toContain("edited");
  });

  it("caps and normalizes tags before persistence", async () => {
    await useKanbanStore.getState().addCard({
      title: "Many tags",
      tags: ["One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"],
    });

    expect(useKanbanStore.getState().cards[0].tags).toEqual([
      "one",
      "two",
      "three",
      "four",
      "five",
      "six",
      "seven",
      "eight",
    ]);
  });

  it("appends activity entries for move, archive, and restore", async () => {
    await useKanbanStore.getState().addCard({ title: "Track activity" });
    const card = useKanbanStore.getState().cards[0];

    await useKanbanStore.getState().moveCard(card.id, "column-in-progress");
    await useKanbanStore.getState().archiveCard(card.id);

    const archived = useKanbanStore.getState().archivedEntries[0].card;
    expect(archived.activities.map((activity) => activity.type)).toEqual([
      "created",
      "moved",
      "archived",
    ]);

    await useKanbanStore.getState().restoreArchivedCard(card.id, "column-todo");

    expect(useKanbanStore.getState().cards[0].activities.map((activity) => activity.type)).toEqual([
      "created",
      "moved",
      "archived",
      "restored",
    ]);
  });

  it("applies a board template and exports board data", async () => {
    await useKanbanStore.getState().applyTemplate("sprint");

    const state = useKanbanStore.getState();
    expect(state.columns.some((column) => column.title === "Review")).toBe(true);
    expect(state.cards.some((card) => card.activities[0]?.type === "template")).toBe(true);

    const json = state.exportBoard("json");
    const csv = state.exportBoard("csv");

    expect(json).toContain("Implement feature slice");
    expect(csv).toContain("status,id,title");
    expect(csv).toContain("active");
  });

  it("replaces old columns when applying a board template", async () => {
    await useKanbanStore.getState().addCard({ title: "Preserve active work" });

    await useKanbanStore.getState().applyTemplate("school");

    const state = useKanbanStore.getState();
    const assignedColumn = state.columns.find((column) => column.title === "Assigned");
    const preservedCard = state.cards.find((card) => card.title === "Preserve active work");

    expect(state.columns.map((column) => column.title)).toEqual([
      "Assigned",
      "Research",
      "Drafting",
      "Submitted",
    ]);
    expect(state.columns.map((column) => column.id)).not.toContain("column-todo");
    expect(state.columns.map((column) => column.id)).not.toContain("column-in-progress");
    expect(state.columns.map((column) => column.id)).not.toContain("column-done");
    expect(preservedCard?.columnId).toBe(assignedColumn?.id);
    const lastMove = preservedCard?.moves[preservedCard.moves.length - 1];
    expect(lastMove?.fromColumnId).toBe("column-todo");
    expect(lastMove?.toColumnId).toBe(assignedColumn?.id);
  });
});
