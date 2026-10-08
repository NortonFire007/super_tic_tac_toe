import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FREE_MOVE_SETUP, TOP_ROW_VICTORY, type MovePair } from "@/game/test-fixtures";
import { GameScreen } from "./game-screen";

const cell = (boardIndex: number, cellIndex: number) => screen.getByTestId(`cell-${boardIndex}-${cellIndex}`);
const allCells = () => screen.getAllByTestId(/^cell-/);
const enabledCells = () => allCells().filter((element) => !(element as HTMLButtonElement).disabled);

async function playMoves(moves: readonly MovePair[]) {
  const user = userEvent.setup();
  for (const [boardIndex, cellIndex] of moves) await user.click(cell(boardIndex, cellIndex));
}

describe("GameScreen", () => {
  it("renders 9 boards with 81 enabled cells and X to move", () => {
    render(<GameScreen />);
    expect(screen.getAllByTestId(/^board-\d$/)).toHaveLength(9);
    expect(allCells()).toHaveLength(81);
    expect(enabledCells()).toHaveLength(81);
    expect(screen.getByTestId("turn-indicator")).toHaveTextContent("Player X to move");
  });

  it("highlights the routed board and disables every cell outside it", async () => {
    render(<GameScreen />);
    await playMoves([[0, 4]]);

    expect(screen.getByTestId("board-4")).toHaveAttribute("data-board-state", "TARGET");
    expect(screen.getByTestId("board-0")).toHaveAttribute("data-board-state", "IDLE");
    expect(enabledCells()).toHaveLength(9);
    expect(cell(4, 0)).toBeEnabled();
    expect(cell(0, 1)).toBeDisabled();
    expect(cell(0, 4)).toHaveAccessibleName(/Board A.*: X$/);
    expect(screen.getByTestId("target-banner")).toHaveTextContent("Board E");
    expect(screen.getByTestId("turn-indicator")).toHaveTextContent("Player O to move");
  });

  it("shows the local win and the Free Move state when the target board is resolved", async () => {
    render(<GameScreen />);
    await playMoves(FREE_MOVE_SETUP);

    expect(screen.getByTestId("board-4")).toHaveAttribute("data-board-state", "X_WON");
    expect(screen.getByTestId("board-4-result")).toBeInTheDocument();
    expect(screen.getByTestId("score-X")).toHaveTextContent("1");
    expect(screen.getByTestId("target-banner")).toHaveTextContent("Free Move");
    expect(screen.getByTestId("board-3")).toHaveAttribute("data-board-state", "FREE");
    expect(cell(4, 5)).toBeDisabled();
    expect(cell(3, 3)).toBeEnabled();
  });

  it("announces a global victory, locks the board and restarts cleanly", async () => {
    const user = userEvent.setup();
    render(<GameScreen />);
    await playMoves(TOP_ROW_VICTORY);

    expect(screen.getByTestId("result-headline")).toHaveTextContent("X wins");
    expect(screen.getByTestId("global-win-line")).toBeInTheDocument();
    expect(enabledCells()).toHaveLength(0);

    await user.click(screen.getByRole("button", { name: "New game" }));
    const dialog = screen.getByRole("dialog", { name: "New game" });
    await user.click(within(dialog).getByRole("button", { name: "Start game" }));

    expect(enabledCells()).toHaveLength(81);
    expect(screen.getByTestId("turn-indicator")).toHaveTextContent("Player X to move");
    expect(screen.getByTestId("score-X")).toHaveTextContent("0");
    expect(screen.queryByTestId("global-win-line")).not.toBeInTheDocument();
    expect(screen.queryAllByLabelText(/: (X|O)$/)).toHaveLength(0);
  });

  it("opens the rules dialog", async () => {
    const user = userEvent.setup();
    render(<GameScreen />);
    await user.click(screen.getByRole("button", { name: "How to play" }));
    expect(screen.getByRole("dialog", { name: "How to play" })).toHaveTextContent("Free Move");
  });

  it("records finished games in a paginated history", async () => {
    const user = userEvent.setup();
    render(<GameScreen />);
    await user.click(screen.getByRole("button", { name: "History" }));
    expect(screen.getByTestId("history-empty")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close" }));

    for (let game = 0; game < 6; game++) {
      await playMoves(TOP_ROW_VICTORY);
      await user.click(screen.getByRole("button", { name: "Play again" }));
      await user.click(within(screen.getByRole("dialog", { name: "New game" })).getByRole("button", { name: "Start game" }));
    }

    await user.click(screen.getByRole("button", { name: "History" }));
    expect(screen.getAllByTestId("history-row")).toHaveLength(5);
    expect(screen.getByTestId("history-page")).toHaveTextContent("Page 1 of 2");
    await user.click(screen.getByRole("button", { name: /Next/ }));
    expect(screen.getAllByTestId("history-row")).toHaveLength(1);
    expect(screen.getByTestId("history-page")).toHaveTextContent("Page 2 of 2");
  }, 30_000);
});

// Only the clock is faked; animations and user-event keep real timers.
const useFakeClock = () => vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });

describe("GameScreen timed mode", () => {
  afterEach(() => vi.useRealTimers());

  async function startTimed(time: string) {
    const user = userEvent.setup();
    render(<GameScreen />);
    await user.click(screen.getByRole("button", { name: "New game" }));
    const dialog = screen.getByRole("dialog", { name: "New game" });
    await user.click(within(dialog).getByRole("button", { name: "Timed" }));
    const input = within(dialog).getByLabelText(/Time per player/);
    expect(input).toHaveValue("5:00");
    await user.clear(input);
    await user.type(input, time);
    await user.click(within(dialog).getByRole("button", { name: "Start game" }));
    return user;
  }

  it("shows no clocks in Classic mode", () => {
    render(<GameScreen />);
    expect(screen.queryByTestId("game-clock")).not.toBeInTheDocument();
  });

  it("rejects an invalid time", async () => {
    useFakeClock();
    const user = userEvent.setup();
    render(<GameScreen />);
    await user.click(screen.getByRole("button", { name: "New game" }));
    const dialog = screen.getByRole("dialog", { name: "New game" });
    await user.click(within(dialog).getByRole("button", { name: "Timed" }));
    await user.clear(within(dialog).getByLabelText(/Time per player/));
    await user.type(within(dialog).getByLabelText(/Time per player/), "0:00");
    expect(within(dialog).getByRole("alert")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Start game" })).toBeDisabled();
  });

  it("runs only the active player's clock and hands over on a move", async () => {
    useFakeClock();
    const user = await startTimed("2:30");
    expect(screen.getByTestId("clock-X-time")).toHaveTextContent("2:30");
    expect(screen.getByTestId("clock-O-time")).toHaveTextContent("2:30");

    act(() => vi.advanceTimersByTime(10_000));
    expect(screen.getByTestId("clock-X-time")).toHaveTextContent("2:20");
    expect(screen.getByTestId("clock-O-time")).toHaveTextContent("2:30");
    expect(screen.getByTestId("clock-X")).toHaveAttribute("data-active", "true");

    await user.click(cell(0, 4));
    act(() => vi.advanceTimersByTime(5_000));
    expect(screen.getByTestId("clock-X-time")).toHaveTextContent("2:20");
    expect(screen.getByTestId("clock-O-time")).toHaveTextContent("2:25");
    expect(screen.getByTestId("clock-O")).toHaveAttribute("data-active", "true");
  });

  it("flags low time, then ends the game with Time Out and blocks further moves", async () => {
    useFakeClock();
    await startTimed("0:40");
    expect(screen.getByTestId("clock-X")).toHaveAttribute("data-low", "false");

    act(() => vi.advanceTimersByTime(15_000));
    expect(screen.getByTestId("clock-X")).toHaveAttribute("data-low", "true");

    act(() => vi.advanceTimersByTime(30_000));
    expect(screen.getByTestId("result-headline")).toHaveTextContent("Time Out");
    expect(screen.getByTestId("game-status")).toHaveTextContent("O wins");
    expect(screen.getByTestId("clock-X-time")).toHaveTextContent("0:00");
    expect(enabledCells()).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();

    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.getByTestId("clock-X-time")).toHaveTextContent("0:00");
    expect(screen.getByTestId("clock-O-time")).toHaveTextContent("0:40");
  });

  it("stops the clocks when the game is won on the board", async () => {
    useFakeClock();
    const user = await startTimed("5:00");
    for (const [boardIndex, cellIndex] of TOP_ROW_VICTORY) {
      await user.click(cell(boardIndex, cellIndex));
    }
    expect(screen.getByTestId("result-headline")).toHaveTextContent("X wins");
    const before = screen.getByTestId("clock-X-time").textContent;
    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.getByTestId("clock-X-time")).toHaveTextContent(before!);
  });
});
