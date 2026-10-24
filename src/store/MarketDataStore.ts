
import { Decimal } from "decimal.js";
import { ITickState, IPriceTick, Subscriber } from "../types/types";

class MarketDataStore {
  private cache = new Map<string, ITickState>();
  private subscribers = new Set<Subscriber>();
  private symbols: string[] = [];
  private baselines = new Map<string, string>();
  private removedSymbols = new Set<string>();

  private readonly maxHistoryLength = 20;

  public registerSymbol(symbol: string): void {
    const symbolUppercase = symbol.trim().toUpperCase();

    if (!/^[A-Z]{6}$/.test(symbolUppercase)) return;
    if (this.symbols.includes(symbolUppercase)) return;

    this.symbols = [...this.symbols, symbolUppercase];
    this.notifySubscribers();
  }

  public removeSymbol(symbol: string): void {
    const symbolUppercase = symbol.trim().toUpperCase();

    this.removedSymbols.add(symbolUppercase);
    this.symbols = this.symbols.filter(
      (item) => item !== symbolUppercase,
    );

    this.cache.delete(symbolUppercase);
    this.baselines.delete(symbolUppercase);

    this.notifySubscribers();
  }

  public reorderSymbols(symbols: string[]): void {
    const unique = [...new Set(symbols)].filter((symbol) =>
      this.symbols.includes(symbol),
    );

    this.symbols = [
      ...unique,
      ...this.symbols.filter((symbol) => !unique.includes(symbol)),
    ];

    this.notifySubscribers();
  }

  public getAllSymbols = (): string[] => this.symbols;

  public getTickStateBySymbol = (symbol: string): ITickState | undefined => this.cache.get(symbol);

  public subscribe = (callback: Subscriber): (() => void) => {
    this.subscribers.add(callback);

    return () => {
      this.subscribers.delete(callback);
    };
  };

  public handleIncomingTick(tick: IPriceTick): void {
    //check incoming feed
    if (
      !tick ||
      typeof tick.symbol !== "string" ||
      !/^[A-Z]{6}$/.test(tick.symbol) ||
      !Number.isSafeInteger(tick.seq)
    ) {
      return;
    }

    //convert bid and ask price to decimal
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

      const tickStateExists = this.cache.get(tick.symbol);

      // Ignore duplicate and out-of-order updates.
      if (tickStateExists && tick.seq <= tickStateExists   .seq) return;

      this.registerSymbol(tick.symbol);

      if (!this.baselines.has(tick.symbol)) {
        this.baselines.set(tick.symbol, bid.toString());
      }

      let direction: ITickState["direction"] = "FLAT";

      if (tickStateExists) {
        if (bid.gt(tickStateExists .bid)) direction = "UP";
        else if (bid.lt(tickStateExists.bid)) direction = "DOWN";
      }

      const history = [
        ...(tickStateExists?.history ?? []),
        bid.toString(),
      ].slice(-this.maxHistoryLength);

      const baseline = new Decimal(
        this.baselines.get(tick.symbol)!,
      );

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

      this.notifySubscribers();
    } catch {
      // Ignore invalid decimal values.
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
    this.subscribers.forEach((callback) => callback());
  }
}

export const marketDataStore = new MarketDataStore();
