import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useRef,
} from "react";
import { marketDataStore } from "../store/MarketDataStore";
import { WatchlistRow } from "./WatchlistRow";
import { IWatchlistProps } from "../types/types";
import { INITIAL_INSTRUMENTS } from "../helper/helperMethods";

const STORAGE_KEY = "fx_watchlist_layout_config";

export const Watchlist: React.FC<IWatchlistProps> = ({
  onSelectInstrument,
  onSubscribeSymbol,
}) => {
  const [symbols, setSymbols] = useState<string[]>(() => {
    let cachedSymbols: string[] = [];

    try {
      //on page refresh symbols are not lost, they are retrieved from local storage
      const localStorageSaved = localStorage.getItem(STORAGE_KEY);
      const parsed: unknown = localStorageSaved
        ? JSON.parse(localStorageSaved)
        : [];

      if (Array.isArray(parsed)) {
        cachedSymbols = parsed.filter(
          (item): item is string => typeof item === "string",
        );
      }
    } catch (error) {
      console.error("Failed to load symbols from local storage:", error);
    }

    return [...new Set([...cachedSymbols, ...INITIAL_INSTRUMENTS])].slice(
      0,
      200,
    );
  });

  const [selected, setSelected] = useState<string | null>(null);
  const [error, _] = useState("");
  const [inputSymbol, setInputSymbol] = useState("");
  const tbodyRef = useRef<HTMLTableSectionElement>(null);

  // Sync reordered symbol grids instantly to prevent reload state loss
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(symbols));
  }, [symbols]);

  useEffect(() => {
    marketDataStore.reorderSymbols(symbols);
  }, [symbols]);

  // Subscribe to symbol registry modifications from our fast data layer
  useSyncExternalStore(
    (cb) => marketDataStore.subscribe(cb),
    () => marketDataStore.getAllSymbols(),
    () => [],
  );

  useEffect(() => {
    for (const symbol of symbols) {
      marketDataStore.registerSymbol(symbol);
      onSubscribeSymbol(symbol);
    }
  }, []);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (idx: number) => {
    setDraggedIndex(idx);
  };

  function removeSymbol(symbol: string) {
    setSymbols((current) => current.filter((item) => item !== symbol));

    if (selected === symbol) {
      const replacement = symbols.find((item) => item !== symbol);
      if (replacement) setSelected(replacement);
    }
  }

  const handleAddSymbol = (input: string) => {
    const symbol = input.trim().toUpperCase();

    // six uppercase letters validation
    if (!/^[A-Z]{6}$/.test(symbol)) {
      alert("Enter a valid symbol, e.g. EURJPY");
      return;
    }

    if (symbols.includes(symbol)) {
      alert(`${symbol} is already in your watchlist`);
      return;
    }

    if (symbols.length >= 200) {
      alert("Watchlist limit reached");
      return;
    }

    // Add symbol with the market store
    marketDataStore.registerSymbol(symbol);

    // Existing useEffect saves localStorage
    setSymbols((prev) => [...prev, symbol]);

    onSubscribeSymbol(symbol);
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

        {/* Requirement 2: Manual Symbol Creation Form */}
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
                onRemove={removeSymbol}
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
