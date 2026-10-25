import React, { useState, useEffect, useRef } from "react";
import { marketDataStore } from "../store/MarketDataStore";
import { WatchlistRow } from "./WatchlistRow";
import { IWatchlistProps } from "../types/types";
import { isValidSymbol, normalizeSymbol } from "../helper/helperMethods";

const STORAGE_KEY = "fx_watchlist";
const SESSION_STORAGE_KEY = "fx_watchlist_server_session";

export const Watchlist: React.FC<IWatchlistProps> = ({
  onSelectInstrument,
  onSubscribeSymbol,
  serverSessionId,
  availableInstruments,
}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [symbols, setSymbols] = useState<string[]>([]);
  const initializedRef = useRef(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, _] = useState("");
  const [inputSymbol, setInputSymbol] = useState("");
  const tbodyRef = useRef<HTMLTableSectionElement>(null);

  useEffect(() => {
    if (availableInstruments.length === 0 || !serverSessionId) {
      return;
    }

    const previousSession = localStorage.getItem(SESSION_STORAGE_KEY);

    if (previousSession !== serverSessionId) {
      // Server restarted: reset to all server instruments.
      localStorage.setItem(SESSION_STORAGE_KEY, serverSessionId);
      //localStorage.setItem(STORAGE_KEY, JSON.stringify(availableInstruments));

      setSymbols(availableInstruments);
      initializedRef.current = true;
      setIsInitialized(true);
      return;
    }

    // Restore from localStorage
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved !== null) {
      try {
        const parsed: unknown = JSON.parse(saved);

        if (
          Array.isArray(parsed) &&
          parsed.every(
            (item): item is string =>
              typeof item === "string" && isValidSymbol(item),
          )
        ) {
          setSymbols(parsed);
          initializedRef.current = true;
          setIsInitialized(true);
          return;
        }
      } catch {
        //code continues
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(availableInstruments));

    setSymbols(availableInstruments);
    initializedRef.current = true;
    setIsInitialized(true);
  }, [availableInstruments, serverSessionId]);

  useEffect(() => {
    if (!isInitialized) return;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(symbols));
  }, [symbols, isInitialized]);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (idx: number) => {
    setDraggedIndex(idx);
  };

  function handleRemoveSymbol(symbol: string) {
    setSymbols((current) => current.filter((item) => item !== symbol));

    if (selected === symbol) {
      const replacement = symbols.find((item) => item !== symbol);
      if (replacement) setSelected(replacement);
    }
  }

  const handleAddSymbol = (input: string) => {
    const normalizedSymbol = normalizeSymbol(input);

    // six uppercase letters validation
    if (!isValidSymbol(normalizedSymbol)) {
      alert("Enter a valid symbol, e.g. EURJPY");
      return;
    }

    if (symbols.includes(normalizedSymbol)) {
      alert(`${normalizedSymbol} is already in your watchlist`);
      return;
    }

    if (symbols.length >= 200) {
      alert("Watchlist limit reached");
      return;
    }

    // Add symbol with the market store
    marketDataStore.registerSymbol(normalizedSymbol);

    // Existing useEffect saves localStorage
    setSymbols((prev) => [...prev, normalizedSymbol]);

    onSubscribeSymbol(normalizedSymbol);
  };

  //handle drag event
  const handleDragOver = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIdx) return;

    const updatedList = [...symbols];
    const [draggedItem] = updatedList.splice(draggedIndex, 1);
    updatedList.splice(targetIdx, 0, draggedItem);

    setDraggedIndex(targetIdx);
    setSymbols(updatedList);
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 shadow-2xl">
      <div className="flex justify-between items-center mb-5 gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-slate-200 tracking-wide">
            Live Execution Matrix
          </h2>
          <p className="text-xs text-slate-500 font-mono">
            Count: {symbols.length} Assets
          </p>
        </div>

        {error && (
          <p role="alert" className="mb-3 text-sm text-red-400">
            {error}
          </p>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAddSymbol(inputSymbol);
            setInputSymbol("");
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            placeholder="Add e.g. NZDUSD"
            maxLength={6}
            value={inputSymbol}
            onChange={(e) => setInputSymbol(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-sm font-mono text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors uppercase placeholder:text-slate-600"
          />
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-500 text-slate-100 text-xs px-4 py-1.5 rounded font-bold tracking-wide transition-colors active:scale-[0.98]"
          >
            Add Asset
          </button>
        </form>
      </div>

      <div className="overflow-x-auto">
        <table
          className="w-full table-fixed text-left border-collapse select-none"
          role="grid"
        >
          <thead>
            <tr className="border-b border-slate-800 text-slate-500 uppercase text-xs font-mono font-semibold tracking-wider">
              <th className="pb-3 pl-3 w-10">Sort</th>
              <th className="pb-3">Asset</th>
              <th className="pb-3 text-right">Bid Axis</th>
              <th className="pb-3 text-right">Ask Axis</th>
              <th className="pb-3 text-right">Spread</th>
              <th className="pb-3 text-center">Sparkline</th>
              <th className="pb-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody
            ref={tbodyRef}
            className="divide-y divide-slate-900/60"
            role="rowgroup"
          >
            {symbols.map((symbol, idx) => (
              <WatchlistRow
                key={symbol}
                symbol={symbol}
                onRemove={handleRemoveSymbol}
                index={idx}
                onSelect={onSelectInstrument}
                onDragStart={() => handleDragStart(idx)}
                onDragOver={handleDragOver}
                onDragEnd={() => setDraggedIndex(null)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
