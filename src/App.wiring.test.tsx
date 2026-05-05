import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { useKanbanStore } from "./store/kanbanStore";

function getColumnContainer(columnTitle: string): HTMLElement {
  const titleNode = screen
    .getAllByText(columnTitle)
    .find((node) => node.tagName.toLowerCase() !== "option");

  if (!titleNode) {
    throw new Error(`Column title not found: ${columnTitle}`);
  }

  const headerContainer = titleNode.closest("div");

  if (!headerContainer || !headerContainer.parentElement) {
    throw new Error(`Column container not found for title: ${columnTitle}`);
  }

  return headerContainer.parentElement as HTMLElement;
}

async function addCardViaModal(
  title: string,
  options: {
    description?: string;
    category?: "bug" | "feature" | "docs";
    priority?: "low" | "medium" | "high";
    column?: string;
    dueDate?: string;
    tags?: string;
  } = {}
) {
  // Click the first per-column "+ Add Card" button
  const addButtons = screen.getAllByRole("button", { name: "+ Add Card" });
  fireEvent.click(addButtons[0]);

  // Fill in the title in the modal
  const titleInput = await screen.findByRole("textbox", { name: /title/i });
  fireEvent.change(titleInput, { target: { value: title } });

  if (options.description !== undefined) {
    fireEvent.change(screen.getByRole("textbox", { name: /description/i }), {
      target: { value: options.description },
    });
  }

  if (options.category !== undefined) {
    fireEvent.change(within(screen.getByRole("dialog")).getByRole("combobox", { name: /category/i }), {
      target: { value: options.category },
    });
  }

  if (options.priority !== undefined) {
    fireEvent.change(screen.getByRole("combobox", { name: /priority/i }), {
      target: { value: options.priority },
    });
  }

  if (options.column !== undefined) {
    fireEvent.change(screen.getByRole("combobox", { name: /column/i }), {
      target: { value: options.column },
    });
  }

  if (options.dueDate !== undefined) {
    fireEvent.change(screen.getByLabelText(/due date/i), {
      target: { value: options.dueDate },
    });
  }

  if (options.tags !== undefined) {
    fireEvent.change(screen.getByRole("textbox", { name: /tags/i }), {
      target: { value: options.tags },
    });
  }

  // Submit
  fireEvent.click(screen.getByRole("button", { name: "Create" }));

  await waitFor(() => {
    expect(screen.queryByRole("button", { name: "Create" })).toBeNull();
  });
}

describe("Step 5 wiring verification", () => {
  beforeEach(() => {
    useKanbanStore.getState().resetState();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("adds and moves a card from the Board UI", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );

    await addCardViaModal("Task 1");

    await waitFor(() => {
      expect(screen.queryByText("Task 1")).not.toBeNull();
    });

    // Simulate drag-and-drop: dragstart on card, dragover + drop on In Progress column
    const card = screen.getByText("Task 1").closest("li")!;
    const inProgressColumn = getColumnContainer("In Progress");

    fireEvent.dragStart(card);
    fireEvent.dragOver(inProgressColumn);
    fireEvent.drop(inProgressColumn);

    const todoColumn = getColumnContainer("To Do");

    await waitFor(() => {
      expect(within(todoColumn).queryByText("Task 1")).toBeNull();
      expect(within(inProgressColumn).queryByText("Task 1")).not.toBeNull();
    });
  });

  it("creates a new column from the Board UI", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /create column/i }));

    const titleInput = await screen.findByRole("textbox", { name: /title/i });
    fireEvent.change(titleInput, { target: { value: "Blocked" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Column" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(screen.queryByText("Blocked")).not.toBeNull();
    });
  });

  it("adds and deletes a card from the Board UI", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );

    await addCardViaModal("Task 1");

    await waitFor(() => {
      expect(screen.queryByText("Task 1")).not.toBeNull();
    });

    // Action buttons are always in the DOM (CSS controls hover visibility)
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    // Confirm modal appears — click Delete inside it
    const confirmDialog = await screen.findByRole("dialog");
    fireEvent.click(within(confirmDialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(screen.queryByText("Task 1")).toBeNull();
    });
  });

  it("closes the card modal with Escape", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );

    fireEvent.click(screen.getAllByRole("button", { name: "+ Add Card" })[0]);
    expect(await screen.findByRole("dialog")).not.toBeNull();

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  it("edits a card from the Board UI", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );

    await addCardViaModal("Draft demo script");

    const card = await screen.findByText("Draft demo script");
    fireEvent.click(within(card.closest("li")!).getByRole("button", { name: "Edit" }));

    const titleInput = await screen.findByRole("textbox", { name: /title/i });
    fireEvent.change(titleInput, { target: { value: "Final demo script" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(screen.queryByText("Draft demo script")).toBeNull();
      expect(screen.queryByText("Final demo script")).not.toBeNull();
    });
  });

  it("archives and restores a card through the routed UI", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );

    await addCardViaModal("Archive release checklist");

    const card = await screen.findByText("Archive release checklist");
    fireEvent.click(within(card.closest("li")!).getByRole("button", { name: "Archive" }));

    await waitFor(() => {
      expect(screen.queryByText("Archive release checklist")).toBeNull();
    });

    fireEvent.click(screen.getByRole("link", { name: "Archive" }));
    expect(await screen.findByText("Archive release checklist")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Restore to Board" }));

    await waitFor(() => {
      expect(screen.queryByText("Archive release checklist")).toBeNull();
    });

    fireEvent.click(screen.getByRole("link", { name: "Board" }));
    expect(await screen.findByText("Archive release checklist")).not.toBeNull();
  });

  it("filters, searches, groups swimlanes, and shows WIP limit warnings", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );

    await addCardViaModal("Fix login error", {
      description: "Reviewer guest flow",
      category: "bug",
      priority: "high",
      column: "column-in-progress",
    });
    await addCardViaModal("Build report page", {
      category: "feature",
      priority: "low",
      column: "column-in-progress",
    });

    fireEvent.change(screen.getByPlaceholderText(/search cards/i), {
      target: { value: "login" },
    });

    await waitFor(() => {
      expect(screen.queryByText("Fix login error")).not.toBeNull();
      expect(screen.queryByText("Build report page")).toBeNull();
    });

    fireEvent.change(screen.getByRole("combobox", { name: /category filter/i }), {
      target: { value: "bug" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Priority" }));

    expect((await screen.findAllByText("High")).length).toBeGreaterThan(0);

    fireEvent.change(screen.getByPlaceholderText(/search cards/i), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("link", { name: "Stats" }));

    expect(await screen.findByText(/Limit reached/i)).not.toBeNull();
  });

  it("creates cards with due dates and tags, then filters and sorts them", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );

    await addCardViaModal("Overdue tagged task", {
      dueDate: "2000-01-01",
      tags: "Frontend, Review",
      priority: "high",
    });
    await addCardViaModal("Future backend task", {
      dueDate: "2099-01-01",
      tags: "backend",
      priority: "low",
    });

    await waitFor(() => {
      expect(screen.getAllByText("Overdue").length).toBeGreaterThan(0);
    });
    expect(screen.queryByText("#frontend")).not.toBeNull();

    fireEvent.change(screen.getByRole("combobox", { name: /due status/i }), {
      target: { value: "overdue" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: /tag filter/i }), {
      target: { value: "frontend" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: /sort cards/i }), {
      target: { value: "priority" },
    });

    await waitFor(() => {
      expect(screen.queryByText("Overdue tagged task")).not.toBeNull();
      expect(screen.queryByText("Future backend task")).toBeNull();
    });
  });

  it("applies a template and exposes export downloads from Settings", async () => {
    const createObjectURL = vi.fn(() => "blob:kanban");
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { value: createObjectURL, configurable: true });
    Object.defineProperty(URL, "revokeObjectURL", { value: revokeObjectURL, configurable: true });
    const anchorClick = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("link", { name: "Settings" }));
    fireEvent.change(await screen.findByRole("combobox", { name: /template/i }), {
      target: { value: "school" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply Template" }));

    await waitFor(() => {
      expect(screen.queryByText("Applied")).not.toBeNull();
    });

    fireEvent.click(screen.getByRole("button", { name: "Export JSON" }));
    fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));

    expect(createObjectURL).toHaveBeenCalledTimes(2);
    expect(revokeObjectURL).toHaveBeenCalledTimes(2);
    expect(anchorClick).toHaveBeenCalledTimes(2);

    vi.restoreAllMocks();
  });
});
