"use client";

import { Modal } from "./modal";

interface RulesDialogProps {
  open: boolean;
  onClose: () => void;
}

/** A 3×3 diagram with one highlighted square. */
function MiniGrid({ highlight, label }: { highlight: number; label: string }) {
  return (
    <div role="img" aria-label={label} className="grid size-14 shrink-0 grid-cols-3 gap-0.5 rounded-lg bg-edge p-1">
      {Array.from({ length: 9 }, (_, index) => (
        <span key={index} className={`rounded-[3px] ${index === highlight ? "bg-free" : "bg-white/10"}`} />
      ))}
    </div>
  );
}

const RULES: { title: string; body: string; diagram?: { highlight: number; label: string } }[] = [
  { title: "X goes first", body: "The first move can be made in any cell of any board." },
  {
    title: "Your cell picks their board",
    body: "The position of the cell you play inside its board decides which of the nine boards your opponent must play in next. Play the top-right cell and they go to the top-right board.",
    diagram: { highlight: 2, label: "Top-right cell sends the opponent to the top-right board" },
  },
  { title: "Win boards", body: "Three marks in a row, column or diagonal claim a small board. Claimed and full boards are closed." },
  {
    title: "Win the game",
    body: "Own three boards in a row, column or diagonal on the big board. A drawn board belongs to nobody.",
    diagram: { highlight: 4, label: "Centre board of the big board" },
  },
  {
    title: "Free Move",
    body: "If you are sent to a board that is already closed, you may play in any open board. It is still just one move — your turn ends afterwards and the usual routing continues.",
  },
  {
    title: "No moves left",
    body: "If every board is closed and nobody has three boards in a row, the player who owns more boards wins. Equal counts are a draw.",
  },
];

export function RulesDialog({ open, onClose }: RulesDialogProps) {
  return (
    <Modal open={open} title="How to play" onClose={onClose}>
      <ol className="space-y-4">
        {RULES.map((rule, index) => (
          <li key={rule.title} className="flex gap-4">
            {rule.diagram ? (
              <MiniGrid {...rule.diagram} />
            ) : (
              <span className="grid size-14 shrink-0 place-items-center rounded-lg bg-edge font-display text-xl font-semibold text-muted">
                {index + 1}
              </span>
            )}
            <div>
              <h3 className="font-semibold">{rule.title}</h3>
              <p className="text-sm leading-relaxed text-muted">{rule.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </Modal>
  );
}
