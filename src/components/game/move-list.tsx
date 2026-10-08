"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { BOARD_LABELS, CELL_NAMES } from "@/game/constants";
import type { Move } from "@/game/types";
import { Mark } from "./mark";

interface MoveListProps {
  moves: readonly Move[];
  /** The move currently shown on the board: the latest one, or the replay position (0 = before the first move). */
  currentMoveNumber: number;
  /** The move previewed from the board or the list itself, if any. */
  highlightedMoveNumber: number | null;
  /** Makes rows selectable (replay). Without it rows only preview their cell. */
  onSelect?: (moveNumber: number) => void;
  onHighlightMove: (moveNumber: number | null) => void;
}

const ROW_CLASS =
  "flex w-full items-center gap-3 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-white/[0.08] focus-visible:bg-white/[0.08]";
const CURRENT_ROW_CLASS = "bg-white/[0.12] font-semibold ring-1 ring-white/30";
const HIGHLIGHTED_ROW_CLASS = "bg-white/[0.08] underline decoration-white/50 underline-offset-4";

interface RowProps {
  moveNumber: number;
  isCurrent: boolean;
  isHighlighted: boolean;
  label: string;
  onSelect?: () => void;
  onHighlight: (highlighted: boolean) => void;
  children: ReactNode;
}

function Row({ moveNumber, isCurrent, isHighlighted, label, onSelect, onHighlight, children }: RowProps) {
  const shared = {
    "aria-label": label,
    "aria-current": isCurrent ? ("step" as const) : undefined,
    "data-testid": `move-${moveNumber}`,
    "data-highlighted": isHighlighted,
    onMouseEnter: () => onHighlight(true),
    onMouseLeave: () => onHighlight(false),
    onFocus: () => onHighlight(true),
    onBlur: () => onHighlight(false),
    className: `${ROW_CLASS} ${isCurrent ? CURRENT_ROW_CLASS : isHighlighted ? HIGHLIGHTED_ROW_CLASS : ""}`,
  };

  return (
    <li>
      {onSelect ? (
        <button type="button" onClick={onSelect} {...shared}>
          {children}
        </button>
      ) : (
        <div tabIndex={0} {...shared}>
          {children}
        </div>
      )}
    </li>
  );
}

/** Chronological, scrollable list of moves. Keeps the current move in view without scrolling the page. */
export function MoveList({ moves, currentMoveNumber, highlightedMoveNumber, onSelect, onHighlightMove }: MoveListProps) {
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const list = listRef.current;
    const row = list?.querySelector<HTMLElement>('[aria-current="step"]')?.parentElement;
    if (!list || !row) return;
    if (row.offsetTop < list.scrollTop) list.scrollTop = row.offsetTop;
    else if (row.offsetTop + row.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = row.offsetTop + row.offsetHeight - list.clientHeight;
    }
  }, [currentMoveNumber]);

  return (
    <section aria-label="Moves" data-testid="move-list" className="rounded-2xl bg-surface p-3 ring-1 ring-white/5">
      <h2 className="px-1 pb-2 text-xs font-semibold uppercase tracking-wider text-muted">Moves</h2>
      {moves.length === 0 && !onSelect ? (
        <p className="px-1 pb-1 text-sm text-muted">No moves yet</p>
      ) : (
        <ol ref={listRef} className="relative max-h-56 space-y-0.5 overflow-y-auto overscroll-contain pr-1 lg:max-h-72">
          {onSelect && (
            <Row
              moveNumber={0}
              isCurrent={currentMoveNumber === 0}
              isHighlighted={false}
              label="Start position, move 0"
              onSelect={() => onSelect(0)}
              onHighlight={() => {}}
            >
              <span className="w-6 text-right tabular-nums text-muted">0</span>
              <span className="text-muted">Start</span>
            </Row>
          )}
          {moves.map((move) => (
            <Row
              key={move.moveNumber}
              moveNumber={move.moveNumber}
              isCurrent={move.moveNumber === currentMoveNumber}
              isHighlighted={move.moveNumber === highlightedMoveNumber}
              label={`Move ${move.moveNumber}: ${move.player}, Board ${BOARD_LABELS[move.boardIndex]}, ${CELL_NAMES[move.cellIndex]}`}
              onSelect={onSelect && (() => onSelect(move.moveNumber))}
              onHighlight={(highlighted) => onHighlightMove(highlighted ? move.moveNumber : null)}
            >
              <span className="w-6 text-right tabular-nums text-muted">{move.moveNumber}</span>
              <Mark player={move.player} className="size-4 shrink-0" />
              <span className="min-w-0 truncate">
                Board {BOARD_LABELS[move.boardIndex]} · {CELL_NAMES[move.cellIndex]}
              </span>
            </Row>
          ))}
        </ol>
      )}
    </section>
  );
}
