import React, { useState, useEffect, useSyncExternalStore } from "react";
import { Decimal } from "decimal.js";
import { marketDataStore } from "../store/MarketDataStore";
import { ITicketProps } from "../types/types";

export const OrderTicket: React.FC<ITicketProps> = ({
  initialSymbol,
  initialPrice,
  initialSeq,
  maxTolerance,
}) => {
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [quantity, setQuantity] = useState<string>("10000");
  const [limitPrice, setLimitPrice] = useState<string>(initialPrice ?? "0");
  const [estimatedCost, setEstimatedCost] = useState<string>("0.00");

  // Multiplies Quantity * Limit Price using exact base-10 arithmetic to avoid float drift
  useEffect(() => {
    try {
      if (!quantity || !limitPrice) {
        setEstimatedCost("0.00");
        return;
      }

      const q = new Decimal(quantity);
      const p = new Decimal(limitPrice);

      setEstimatedCost(q.times(p).toFixed(2));
    } catch {
      setEstimatedCost("0.00");
    }
  }, [quantity, limitPrice]);

  // Subscribe to symbol data modifications
  useSyncExternalStore(marketDataStore.subscribe, marketDataStore.getVersion);

  //useSyncExternalStore(marketDataStore.subscribe, marketDataStore.getVersion);

  const handleOrderSubmission = (e: React.FormEvent) => {
    e.preventDefault();

    const latestTickState = marketDataStore.getTickStateBySymbol(initialSymbol);
    if (!latestTickState) {
      alert("Execution rejected: Market data pipeline unavailable.");
      return;
    }

    const currentLivePriceStr =
      side === "BUY" ? latestTickState.ask : latestTickState.bid;

    const initialPriceDec = new Decimal(initialPrice);
    const livePriceDec = new Decimal(currentLivePriceStr);

    // Calculate price difference
    const priceDelta = livePriceDec.minus(initialPriceDec).abs();
    const allowedToleranceDec = new Decimal(maxTolerance);

    // Ask confirmation if price is outside limits
    if (priceDelta.gt(allowedToleranceDec)) {
      const proceed = window.confirm(
        `Price changed!\n\n` +
          `The market shifted since you locked this ticket instance.\n\n` +
          `Price when clicked: ${initialPrice}\n` +
          `Current market price: ${currentLivePriceStr}\n` +
          `Movement Delta: ${priceDelta.toFixed(5)} (Max Allowed: ${maxTolerance})\n\n` +
          `Do you want to force order routing with the current live price?`,
      );
      if (!proceed) return;
    }

    alert(
      `Order executed: ${side} ${quantity} ${initialSymbol} at ${limitPrice}`,
    );
  };

  return (
    <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 text-slate-100 shadow-2xl">
      <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
        <div>
          <h3 className="text-sm font-bold tracking-wider font-mono text-slate-200">
            {initialSymbol} Execution Ticket
          </h3>
          <p className="text-[10px] text-slate-500 font-mono">
            Tolerance: {maxTolerance} Pips
          </p>
        </div>
        <span className="text-xs text-slate-500 font-mono bg-slate-900 px-2 py-1 rounded border border-slate-800">
          Seq Lock: {initialSeq}
        </span>
      </div>

      <form onSubmit={handleOrderSubmission} className="space-y-4">
        {/* BUY/SELL Toggle buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setSide("BUY")}
            className={`py-2 rounded font-bold tracking-wide text-xs transition-all ${
              side === "BUY"
                ? "bg-emerald-600 text-white shadow-md font-mono"
                : "bg-slate-900 text-slate-400 border border-slate-800 font-mono"
            }`}
          >
            BUY / ASK
          </button>
          <button
            type="button"
            onClick={() => setSide("SELL")}
            className={`py-2 rounded font-bold tracking-wide text-xs transition-all ${
              side === "SELL"
                ? "bg-rose-600 text-white shadow-md font-mono"
                : "bg-slate-900 text-slate-400 border border-slate-800 font-mono"
            }`}
          >
            SELL / BID
          </button>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-400 font-mono block">
            Order Quantity
          </label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-slate-100 font-mono text-sm focus:outline-none focus:border-indigo-500 transition-colors"
            required
            min="1"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-400 font-mono block">
            Limit Execution Price
          </label>
          <input
            type="text"
            value={limitPrice}
            onChange={(e) => setLimitPrice(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-slate-100 font-mono text-sm focus:outline-none focus:border-indigo-500 transition-colors"
            required
          />
        </div>

        <div className="bg-slate-900 rounded p-3 border border-slate-800 space-y-2 text-xs">
          <div className="flex justify-between text-slate-400">
            <span>Price Base:</span>
            <span className="font-mono text-slate-200">{initialPrice}</span>
          </div>
          <div className="flex justify-between border-t border-slate-800 pt-2 text-sm">
            <span className="font-semibold text-slate-300">
              Estimated Invoice Cost:
            </span>
            <span className="font-mono font-bold text-indigo-400">
              ${estimatedCost}
            </span>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold py-3 rounded transition-all shadow-lg active:scale-[0.99] font-mono tracking-wider"
        >
          ROUTE ORDER AT LOCK
        </button>
      </form>
    </div>
  );
};
