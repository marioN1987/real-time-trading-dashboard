import { Decimal } from "decimal.js";
import { ITickState, IPriceTick, Subscriber } from "../types/types";
import { isValidSymbol, normalizeSymbol } from "../helper/helperMethods";

class MarketDataStore {
  private cache = new Map<string, ITickState>();
  private subscribers = new Set<Subscriber>();

  // All known instruments, including those removed from the watchlist.
  private symbols: string[] = [];

  // Symbols currently visible in the store's watchlist.
  private visibleSymbols: string[] = [];

  // Opening prices used to calculate changeSinceOpen.
  private baselines = new Map<string, string>();

  private version = 0;
  private notificationScheduled = false;

  private readonly maxHistoryLength = 20;

  public getVersion = (): number => this.version;

  public reset(): void {
    this.cache.clear();
    this.subscribers.clear();
    this.symbols = [];
    this.baselines.clear();
    this.visibleSymbols = [];
    this.version++;
    this.notificationScheduled = false;
  }

  /**
   * Registers a symbol and makes it visible in the watchlist.
   * Only notifies subscribers if the watchlist changes.
   */
  public registerSymbol(symbol: string): void {
    const normalized = normalizeSymbol(symbol);

    if (!isValidSymbol(normalized)) return;

    let changed = false;

    if (!this.symbols.includes(normalized)) {
      this.symbols.push(normalized);
    }

    if (!this.visibleSymbols.includes(normalized)) {
      this.visibleSymbols.push(normalized);
      changed = true;
    }

    if (changed) {
      this.notifySubscribers();
    }
  }

  /**
   * Hides a symbol without deleting its cached market data.
   */
  public removeSymbol(symbol: string): void {
    const normalized = normalizeSymbol(symbol);

    const updated = this.visibleSymbols.filter(
      (item) => item !== normalized,
    );

    if (updated.length === this.visibleSymbols.length) return;

    this.visibleSymbols = updated;
    this.notifySubscribers();
  }

  public reorderSymbols(symbols: string[]): void {
    const unique = [
      ...new Set(symbols.map(normalizeSymbol)),
    ].filter((symbol) => this.visibleSymbols.includes(symbol));

    const reordered = [
      ...unique,
      ...this.visibleSymbols.filter(
        (symbol) => !unique.includes(symbol),
      ),
    ];

    if (
      reordered.length === this.visibleSymbols.length &&
      reordered.every((symbol, index) => symbol === this.visibleSymbols[index])
    ) {
      return;
    }

    this.visibleSymbols = reordered;
    this.notifySubscribers();
  }

  public getAllSymbols = (): string[] => this.visibleSymbols;

  public getAllRegisteredSymbols = (): string[] => this.symbols;

  public getTickStateBySymbol = (
    symbol: string,
  ): ITickState | undefined => this.cache.get(normalizeSymbol(symbol));

  public subscribe = (callback: Subscriber): (() => void) => {
    this.subscribers.add(callback);

    return () => {
      this.subscribers.delete(callback);
    };
  };

  /**
   * Processes a market tick and batches of UI notifications.
   */
  public handleIncomingTick(tick: IPriceTick): void {
    if (
      !tick ||
      typeof tick.symbol !== "string" ||
      !isValidSymbol(tick.symbol) ||
      !Number.isSafeInteger(tick.seq)
    ) {
      return;
    }

    const symbol = normalizeSymbol(tick.symbol);

    try {
      const bid = new Decimal(tick.bid);
      const ask = new Decimal(tick.ask);

      if (
        !bid.isFinite() ||
        !ask.isFinite() ||
        bid.isNegative() ||
        ask.lt(bid)
      ) {
        return;
      }

      const previous = this.cache.get(symbol);

      // Ignore duplicate or out-of-order ticks.
      if (previous && tick.seq <= previous.seq) {
        return;
      }

      // Register in the catalog without automatically displaying the symbol.
      if (!this.symbols.includes(symbol)) {
        this.symbols.push(symbol);
      }

      if (!this.baselines.has(symbol)) {
        this.baselines.set(symbol, bid.toString());
      }

      let direction: ITickState["direction"] = "FLAT";

      if (previous) {
        if (bid.gt(previous.bid)) {
          direction = "UP";
        } else if (bid.lt(previous.bid)) {
          direction = "DOWN";
        }
      }

      const history = [
        ...(previous?.history ?? []),
        bid.toString(),
      ].slice(-this.maxHistoryLength);

      const baseline = new Decimal(this.baselines.get(symbol)!);

      const updatedState: ITickState = {
        ...tick,
        symbol,
        bid: bid.toString(),
        ask: ask.toString(),
        spread: ask.minus(bid).toFixed(5),
        changeSinceOpen: bid.minus(baseline).toFixed(5),
        direction,
        isStale: false,
        history,
      };

      this.cache.set(symbol, updatedState);

      // Many ticks can arrive before the next frame.
      // Notify React once rather than once for every tick.
      this.scheduleNotification();
    } catch (error) {
      console.error("Failed to process market tick:", error);
    }
  }

  public setDisconnectedState(): void {
    let changed = false;

    for (const [symbol, state] of this.cache) {
      if (!state.isStale) {
        this.cache.set(symbol, {
          ...state,
          isStale: true,
        });

        changed = true;
      }
    }

    if (changed) {
      this.notifySubscribers();
    }
  }

  /**
   * Merge high-frequency market updates into one notification per frame.
   */
  private scheduleNotification(): void {
    if (this.notificationScheduled) return;

    this.notificationScheduled = true;

    requestAnimationFrame(() => {
      this.notificationScheduled = false;
      this.notifySubscribers();
    });
  }

  /**
   * Immediate notification for structural changes such as adding,
   * removing, or reordering watchlist symbols.
   */
  private notifySubscribers(): void {
    this.version++;

    this.subscribers.forEach((callback) => callback());
  }
}

export const marketDataStore = new MarketDataStore();