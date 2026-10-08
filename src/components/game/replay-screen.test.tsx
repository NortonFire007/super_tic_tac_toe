import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TOP_ROW_VICTORY, type MovePair } from "@/game/test-fixtures";
import { GameScreen } from "./game-screen";

const cell = (boardIndex: number, cellIndex: number) => screen.getByTestId(`cell-${boardIndex}-${cellIndex}`);
const enabledCells = () => screen.getAllByTestId(/^cell-/).filter((element) => !(element as HTMLButtonElement).disabled);
const moveRow = (moveNumber: number) => screen.getByTestId(`move-${moveNumber}`);
const button = (name: string) => screen.getByRole("button", { name });
const position = () => screen.getByTestId("replay-position");

async function playMoves(moves: readonly MovePair[]) {
  const user = userEvent.setup();
  for (const [boardIndex, cellIndex] of moves) await user.click(cell(boardIndex, cellIndex));
}

async function finishGameAndOpenReplay() {
  const user = userEvent.setup();
  render(<GameScreen />);
  await playMoves(TOP_ROW_VICTORY);
  await user.click(button("History"));
  await user.click(button("Replay"));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  return user;
}

function storeHistory(replay: unknown) {
  window.localStorage.setItem(
    "utt:history",
    JSON.stringify([
      { id: "stored", finishedAt: 1, mode: "LOCAL", winner: "X", reason: "GLOBAL_LINE", boards: { X: 3, O: 1 }, moves: 2, replay },
    ]),
  );
}

describe("live move list", () => {
  it("lists moves with human-readable names and marks the latest", async () => {
    render(<GameScreen />);
    expect(screen.getByTestId("move-list")).toHaveTextContent("No moves yet");
    await playMoves([[0, 0], [0, 4]]);

    expect(moveRow(1)).toHaveAccessibleName("Move 1: X, Board A, Top Left");
    expect(moveRow(2)).toHaveAccessibleName("Move 2: O, Board A, Center");
    expect(moveRow(2)).toHaveAttribute("aria-current", "step");
    expect(moveRow(1)).not.toHaveAttribute("aria-current");
    // The latest move is only outlined while replaying.
    expect(cell(0, 4)).not.toHaveTextContent("2");
  });

  it("connects the move list and the board on hover", async () => {
    const user = userEvent.setup();
    render(<GameScreen />);
    await playMoves([[0, 0], [0, 4]]);

    await user.hover(moveRow(1));
    expect(cell(0, 0)).toHaveAttribute("data-highlighted", "true");
    expect(cell(0, 4)).toHaveAttribute("data-highlighted", "false");
    expect(screen.getByTestId("board-0")).toHaveAttribute("data-previewed", "true");
    await user.unhover(moveRow(1));
    expect(cell(0, 0)).toHaveAttribute("data-highlighted", "false");

    await user.hover(cell(0, 4));
    expect(moveRow(2)).toHaveAttribute("data-highlighted", "true");
    expect(moveRow(1)).toHaveAttribute("data-highlighted", "false");
  });

  it("does not change the game when a move is previewed", async () => {
    const user = userEvent.setup();
    render(<GameScreen />);
    await playMoves([[0, 0]]);
    await user.hover(moveRow(1));
    expect(screen.getByTestId("turn-indicator")).toHaveTextContent("Player O to move");
    expect(enabledCells()).toHaveLength(8);
  });
});

describe("replay", () => {
  it("opens a finished game from history as a read-only replay starting at move 0", async () => {
    const user = await finishGameAndOpenReplay();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByTestId("replay-details")).toHaveTextContent("17 moves");
    expect(position()).toHaveTextContent("Move 0 of 17");
    expect(screen.queryAllByLabelText(/occupied by/)).toHaveLength(0);
    await user.click(button("Last"));
    expect(screen.getByTestId("result-headline")).toHaveTextContent("X wins");
    expect(screen.getByTestId("global-win-line")).toBeInTheDocument();
    expect(enabledCells()).toHaveLength(0);
    expect(screen.queryByRole("button", { name: "New game" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Play again" })).not.toBeInTheDocument();
  });

  it("navigates with the controls and shows the exact state at every position", async () => {
    const user = await finishGameAndOpenReplay();

    expect(button("First")).toBeDisabled();
    await user.click(button("Last"));
    expect(button("Next")).toBeDisabled();
    expect(button("Last")).toBeDisabled();

    await user.click(button("First"));
    expect(position()).toHaveTextContent("Move 0 of 17");
    expect(button("First")).toBeDisabled();
    expect(button("Previous")).toBeDisabled();
    expect(screen.queryAllByLabelText(/occupied by/)).toHaveLength(0);
    expect(screen.getByTestId("target-banner")).toHaveTextContent("Anywhere");

    await user.click(button("Next"));
    await user.click(button("Next"));
    expect(position()).toHaveTextContent("Move 2 of 17");
    expect(cell(0, 3)).toHaveAccessibleName("Board A, Middle Left, occupied by X");
    expect(cell(3, 0)).toHaveAccessibleName("Board D, Top Left, occupied by O");
    expect(moveRow(2)).toHaveAttribute("aria-current", "step");
    expect(cell(3, 0)).toHaveAttribute("data-last-move", "true");
    expect(cell(3, 0)).toHaveTextContent("2");
    expect(cell(0, 3)).not.toHaveTextContent("1");
    expect(screen.getByTestId("target-banner")).toHaveTextContent("Board A");

    await user.click(button("Previous"));
    expect(position()).toHaveTextContent("Move 1 of 17");

    await user.click(moveRow(5));
    expect(position()).toHaveTextContent("Move 5 of 17");
    expect(cell(0, 5)).toHaveAccessibleName("Board A, Middle Right, occupied by X");
    expect(cell(1, 3)).toHaveAccessibleName("Board B, Middle Left, empty");

    await user.click(button("Last"));
    expect(screen.getByTestId("result-headline")).toHaveTextContent("X wins");
  });

  it("can jump back to the start position from the move list", async () => {
    const user = await finishGameAndOpenReplay();
    await user.click(moveRow(0));
    expect(position()).toHaveTextContent("Move 0 of 17");
  });

  it("highlights the previewed cell when hovering a move in replay", async () => {
    const user = await finishGameAndOpenReplay();
    await user.hover(moveRow(3));
    expect(cell(0, 4)).toHaveAttribute("data-highlighted", "true");
    expect(screen.getByTestId("board-0")).toHaveAttribute("data-previewed", "true");
  });

  it("returns to the live game without starting a new one", async () => {
    const user = userEvent.setup();
    render(<GameScreen />);
    await playMoves(TOP_ROW_VICTORY);
    await user.click(button("Play again"));
    await user.click(within(screen.getByRole("dialog", { name: "New game" })).getByRole("button", { name: "Start game" }));
    await playMoves([[4, 4]]);

    await user.click(button("History"));
    await user.click(button("Replay"));
    await user.click(button("Back to game"));

    expect(screen.queryByTestId("replay-controls")).not.toBeInTheDocument();
    expect(screen.getByTestId("turn-indicator")).toHaveTextContent("Player O to move");
    expect(cell(4, 4)).toHaveAccessibleName("Board E, Center, occupied by X");
  });
});

describe("replay autoplay", () => {
  afterEach(() => vi.useRealTimers());

  it("advances on a timer and stops on pause", async () => {
    const user = await finishGameAndOpenReplay();
    await user.click(button("First"));
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });

    await user.click(button("Play"));
    act(() => vi.advanceTimersByTime(900 * 3));
    expect(position()).toHaveTextContent("Move 3 of 17");

    await user.click(button("Pause"));
    act(() => vi.advanceTimersByTime(900 * 3));
    expect(position()).toHaveTextContent("Move 3 of 17");
  });
});

describe("history records", () => {
  it("keeps the card free of redundant X / O labels but readable for screen readers", async () => {
    const user = userEvent.setup();
    render(<GameScreen />);
    await playMoves(TOP_ROW_VICTORY);
    await user.click(button("History"));

    expect(screen.getByTestId("history-row").querySelectorAll(".sr-only")).toHaveLength(2);
    expect(screen.getByTestId("history-score")).toHaveTextContent("3 – 2");
  });

  it("lists games saved without move data but offers no replay for them", async () => {
    const user = userEvent.setup();
    storeHistory(undefined);
    render(<GameScreen />);
    await user.click(button("History"));

    expect(screen.getAllByTestId("history-row")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Replay" })).not.toBeInTheDocument();
  });

  it("drops corrupt move data instead of crashing", async () => {
    const user = userEvent.setup();
    const sameMove = { player: "X", boardIndex: 0, cellIndex: 0, moveNumber: 1 };
    storeHistory({ startedAt: 0, timeLimitSeconds: null, moves: [sameMove, { ...sameMove, moveNumber: 2 }] });
    render(<GameScreen />);
    await user.click(button("History"));

    expect(screen.getAllByTestId("history-row")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Replay" })).not.toBeInTheDocument();
  });

  it("replays a stored game after a reload", async () => {
    const user = userEvent.setup();
    storeHistory({
      startedAt: 0,
      timeLimitSeconds: 300,
      moves: [
        { player: "X", boardIndex: 0, cellIndex: 4, moveNumber: 1 },
        { player: "O", boardIndex: 4, cellIndex: 0, moveNumber: 2 },
      ],
    });
    render(<GameScreen />);
    await user.click(button("History"));
    await user.click(button("Replay"));
    await user.click(button("Last"));

    expect(screen.getByTestId("replay-details")).toHaveTextContent("Timed · 5:00 per player");
    expect(cell(0, 4)).toHaveAccessibleName("Board A, Center, occupied by X");
    expect(cell(4, 0)).toHaveAccessibleName("Board E, Top Left, occupied by O");
  });
});
