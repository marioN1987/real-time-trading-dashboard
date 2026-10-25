
import { Decimal } from "decimal.js";
import { ITickState, IPriceTick, Subscriber } from "../types/types";
import { isValidSymbol, normalizeSymbol } from "../helper/helperMethods";

class MarketDataStore {
  private cache = new Map<string, ITickState>();
  private subscribers = new Set<Subscriber>();
  private symbols: string[] = [];
  private baselines = new Map<string, string>();
  private visibleSymbols: string[] = [];

  // version counter that tells React when the store has changed
  private version = 0;

  private readonly maxHistoryLength = 20;
  
  public getVersion = (): number => this.version;
  
  public reset(): void {
    this.cache.clear();
    this.subscribers.clear();
    this.symbols = [];
    this.baselines.clear();
    this.visibleSymbols = [];
  }

  public registerSymbol(symbol: string): void {
    const normalizedSymbol = normalizeSymbol(symbol);

    if (!isValidSymbol(normalizedSymbol)) return;

    if (!this.symbols.includes(normalizedSymbol)) {
      this.symbols = [...this.symbols, normalizedSymbol];
    }

    if (!this.visibleSymbols.includes(normalizedSymbol)) {
      this.visibleSymbols = [...this.visibleSymbols, normalizedSymbol];
    }

    this.notifySubscribers();
  }

  public removeSymbol(symbol: string): void {
    const normalizedSymbol = normalizeSymbol(symbol);

    this.visibleSymbols = this.visibleSymbols.filter(
      (item) => item !== normalizedSymbol,
    );

    this.notifySubscribers();
  }

  public reorderSymbols(symbols: string[]): void {
    const unique = [
      ...new Set(
        symbols.map(symbol => normalizeSymbol(symbol))
      ),
    ].filter(symbol => this.visibleSymbols.includes(symbol));

    this.visibleSymbols = [
      ...unique,
      ...this.visibleSymbols.filter(
        symbol => !unique.includes(symbol)
      ),
    ];

    this.notifySubscribers();
  }

  public getAllSymbols = ():string[] => this.visibleSymbols;

  public getAllRegisteredSymbols = ():string[] => this.symbols;

  public getTickStateBySymbol = (
    symbol: string,
  ): ITickState | undefined => this.cache.get(symbol);

  public subscribe = (callback: Subscriber): (() => void) => {
    this.subscribers.add(callback);

    return () => {
      this.subscribers.delete(callback);
    };
  };

  
  public handleIncomingTick(tick: IPriceTick): void {
    if (
      !tick ||
      typeof tick.symbol !== "string" ||
      !isValidSymbol(tick.symbol) ||
      !Number.isSafeInteger(tick.seq)
    ) {
      console.warn("Rejected invalid tick:", tick);
      return;
    }

    try {
      const bid = new Decimal(tick.bid);
      const ask = new Decimal(tick.ask);

      if (
        !bid.isFinite() ||
        !ask.isFinite() ||
        bid.isNegative() ||
        ask.lt(bid)
      ) {
        console.warn("Rejected invalid prices:", tick);
        return;
      }

      const previous = this.cache.get(tick.symbol);

      // Ignore out-of-order ticks.
      if (previous && tick.seq <= previous.seq) return;

      if (!this.baselines.has(tick.symbol)) {
        this.baselines.set(tick.symbol, bid.toString());
      }

      let direction: ITickState["direction"] = "FLAT";

      if (previous) {
        if (bid.gt(previous.bid)) direction = "UP";
        else if (bid.lt(previous.bid)) direction = "DOWN";
      }

      const history = [
        ...(previous?.history ?? []),
        bid.toString(),
      ].slice(-this.maxHistoryLength);

      const baseline = new Decimal(this.baselines.get(tick.symbol)!);

      this.cache.set(tick.symbol, {
        ...tick,
        bid: bid.toString(),
        ask: ask.toString(),
        spread: ask.minus(bid).toFixed(5),
        changeSinceOpen: bid.minus(baseline).toFixed(5),
        direction,
        isStale: false,
        history,
      });

      this.registerSymbol(tick.symbol);
      this.notifySubscribers();
    } catch (err) {
      console.error("Failed to process tick:", tick, err);
    }
  }

  public setDisconnectedState(): void {
    for (const [symbol, state] of this.cache) {
      this.cache.set(symbol, {
        ...state,
        isStale: true,
      });
    }

    this.notifySubscribers();
  }

  private notifySubscribers(): void {
    this.version++;

    this.subscribers.forEach((callback) => callback());
  }
}

export const marketDataStore = new MarketDataStore();
