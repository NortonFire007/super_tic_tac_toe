"use client";

import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { useState } from "react";
import type { GameResultReason } from "@/game/types";
import { Mark } from "./mark";
import { Modal } from "./modal";
import type { GameRecord } from "./use-game-history";

const PAGE_SIZE = 5;

const REASON_LABEL: Record<GameResultReason, string> = {
  GLOBAL_LINE: "Three boards in a row",
  MAJORITY: "Most boards",
  EQUAL_BOARDS: "Level on boards",
};

interface HistoryDialogProps {
  open: boolean;
  records: readonly GameRecord[];
  onClear: () => void;
  onClose: () => void;
}

const PAGE_BUTTON =
  "inline-flex items-center gap-1 rounded-lg bg-white/[0.06] px-3 py-2 text-sm font-medium transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white/[0.06]";

function RecordRow({ record }: { record: GameRecord }) {
  const outcome = record.winner ? `${record.winner} won` : "Draw";

  return (
    <li data-testid="history-row" className="rounded-2xl bg-ink p-3 ring-1 ring-white/5">
      <div className="flex items-center gap-3">
        <Mark player="X" className="size-6 shrink-0" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">X</span>
        <span className="font-display text-xl font-semibold tabular-nums" data-testid="history-score">
          {record.boards.X} – {record.boards.O}
        </span>
        <span className="min-w-0 flex-1 truncate text-right text-sm font-medium">O</span>
        <Mark player="O" className="size-6 shrink-0" />
      </div>
      <p className="mt-2 flex flex-wrap justify-between gap-x-3 text-xs text-muted">
        <span>
          <span className="font-semibold text-fg">{outcome}</span> · {REASON_LABEL[record.reason]} · {record.moves} moves
          {record.mode === "AI" ? " · vs AI" : ""}
        </span>
        <time dateTime={new Date(record.finishedAt).toISOString()}>
          {new Date(record.finishedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
        </time>
      </p>
    </li>
  );
}

export function HistoryDialog({ open, records, onClear, onClose }: HistoryDialogProps) {
  const [requestedPage, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(records.length / PAGE_SIZE));
  // Clamp rather than store: the list can shrink (clear, or an undone game) while open.
  const page = Math.min(requestedPage, pageCount - 1);
  const visible = records.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <Modal open={open} title="Game history" onClose={onClose}>
      {records.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted" data-testid="history-empty">
          No finished games yet. Scores show up here when a game ends.
        </p>
      ) : (
        <>
          <ul className="space-y-2">
            {visible.map((record) => (
              <RecordRow key={record.id} record={record} />
            ))}
          </ul>

          <div className="mt-4 flex items-center justify-between gap-2">
            <button type="button" onClick={() => setPage(page - 1)} disabled={page === 0} className={PAGE_BUTTON}>
              <ChevronLeft className="size-4" aria-hidden="true" />
              Prev
            </button>
            <span className="text-sm text-muted" data-testid="history-page">
              Page {page + 1} of {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage(page + 1)}
              disabled={page >= pageCount - 1}
              className={PAGE_BUTTON}
            >
              Next
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>

          <button
            type="button"
            onClick={onClear}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm text-muted transition-colors hover:bg-white/[0.06] hover:text-fg"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Clear history
          </button>
        </>
      )}
    </Modal>
  );
}
