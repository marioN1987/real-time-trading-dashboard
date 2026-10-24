import React, { useSyncExternalStore } from "react";
import { marketDataStore } from "../store/MarketDataStore";
import { Sparkline } from "./Sparkline";
import { RowProps } from "../types/types";

export const WatchlistRow: React.FC<RowProps> = ({
  symbol,
  index,
  onRemove,
  onSelect,
  onDragStart,
  onDragOver,
  onDragEnd,
}) => {
  const state = useSyncExternalStore(
    (cb) => marketDataStore.subscribe(cb),
    () => marketDataStore.getTickStateBySymbol(symbol),
    () => undefined,
  );

  const removePair = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onRemove(symbol);
  };

  if (!state) {
    return (
      <tr>
        <td colSpan={3} className="p-3 text-slate-400">
          {symbol} — Waiting for feed data ...
        </td>
        <td colSpan={4}></td>
        <td>
          <button
            aria-label={`Remove ${symbol}`}
            onClick={(ev) => removePair(ev)}
            className="relative w-5 h-5 bg-black-50 text-black-100 flex items-center 
                        justify-center rounded-full text-black-500 hover:bg-red-100 hover:text-gray-800 
                        transition-colors cursor-pointer"
          >
            ×
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr
      role="row"
      tabIndex={0}
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragEnd={onDragEnd}
      onClick={() => onSelect(state.symbol, String(state.bid), state.seq)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(state.symbol, String(state.bid), state.seq);
        }
      }}
      style={{ contentVisibility: "auto" }}
      className={`group border-b border-slate-800 hover:bg-slate-800 hover:border-l-cyan-400 cursor-pointer font-mono transition-all duration-75 text-sm ${state.isStale ? "opacity-30 pointer-events-none" : ""}`}
    >
      <td
        className="py-4 text-center text-slate-500 group-hover:text-cyan-400 cursor-grab active:cursor-grabbing select-none text-md"
        aria-hidden="true"
      >
        ☰
      </td>

      <td className="py-4 pl-2 font-bold text-white tracking-wider text-base">
        {state.symbol}
      </td>

      <td className="py-4 text-right font-black text-[#10B981] drop-shadow-[0_0_6px_rgba(16,185,129,0.2)] tabular-nums pr-2 text-base">
        {state.bid}
      </td>

      <td className="py-4 text-right font-black text-[#EF4444] drop-shadow-[0_0_6px_rgba(239,68,68,0.2)] tabular-nums pr-2 text-base">
        {state.ask}
      </td>

      <td className="py-4 text-right text-xs text-yellow-400 font-bold tabular-nums">
        {state.spread}
      </td>

      <td className="py-4 text-center flex items-center justify-center">
        <Sparkline history={state.history} />
      </td>
      <td>
        <button
          aria-label={`Remove ${symbol}`}
          onClick={(ev) => removePair(ev)}
          className="relative w-5 h-5 bg-black-50 text-black-100 text-right flex items-center justify-center rounded-full text-black-500 hover:bg-red-100 hover:text-gray-800 transition-colors cursor-pointer"
        >
          ×
        </button>
      </td>
    </tr>
  );
};
