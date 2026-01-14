export enum OrderSide {
  LONG = 'LONG',
  SHORT = 'SHORT'
}

export enum OrderStatus {
  PENDING = 'ОЖИДАЕТ',
  OPEN = 'ОТКРЫТ',
  FILLED = 'ИСПОЛНЕН',
  CLOSED_TP = 'ЗАКРЫТ (TP)',
  CLOSED_SL = 'ЗАКРЫТ (SL)',
  CANCELLED = 'ОТМЕНЕН',
  ERROR = 'ОШИБКА'
}

export interface TradeConfig {
  symbol: string;
  entryPrice: number;
  leverage: number;
  amountUSDT: number;
  tpPercent: number;
  slPercent: number;
  side: OrderSide;
}

export interface ActiveOrder extends TradeConfig {
  id: string;
  status: OrderStatus;
  createdAt: number;
  tpPrice: number;
  slPrice: number;
  pnl?: number;
  bingxOrderId?: string;
}

export interface BotLog {
  id: string;
  timestamp: number;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface MarketData {
  time: string; // HH:mm
  open: number;
  high: number;
  low: number;
  close: number;
  timestamp: number;
}

export interface BingXCreds {
  apiKey: string;
  secretKey: string;
}

export interface AccountBalance {
  asset: string;
  balance: number;      // Общий баланс кошелька
  equity: number;       // Эквивалент (с учетом PnL)
  availableMargin: number; // Доступно для торговли
  unrealizedPL: number; // Нереализованный PnL
  isSimulated?: boolean; // Флаг: данные настоящие или фейковые
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected_real' | 'connected_sim' | 'error';
