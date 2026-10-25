export interface ITick {
  symbol: string;
  price?: string;
  seq: number;
}

export interface IPriceTick extends ITick {
  bid: string | number;
  ask: string | number;
  ts?: number;
}

export interface ISparklineProps {
  history: string[];
}

export interface IWatchlistProps {
  onSelectInstrument: (
    symbol: string,
    currentPrice: string,
    currentSeq: number,
  ) => void;
  serverSessionId: string;
  availableInstruments: string[];
  onSubscribeSymbol: (symbol: string) => void;
}

export interface RowProps {
  symbol: string;
  index: number;
  onRemove: (symbol: string) => void;
  onSelect: (symbol: string, currentPrice: string, currentSeq: number) => void;
  onDragStart: (idx: number) => void;
  onDragOver: (e: React.DragEvent, idx: number) => void;
  onDragEnd: () => void;
}

export interface ITickState extends IPriceTick {
  bid: string;
  ask: string;
  spread: string;
  changeSinceOpen: string;
  direction: "UP" | "DOWN" | "FLAT";
  isStale: boolean;
  history: string[];
}

export interface ITicketProps {
  initialSymbol: string;
  initialPrice: string;
  initialSeq: number;
  maxTolerance: string;
}

export type Subscriber = () => void;

export enum ConnectionStatus {
  CONNECTED,
  DISCONNECTED,
  CONNECTING
}