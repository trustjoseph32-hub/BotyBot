import React, { useState, useEffect, useRef } from 'react';
import { Settings, Shield, Activity, ExternalLink } from 'lucide-react';
import BotControlPanel from './components/BotControlPanel';
import ChartPanel from './components/ChartPanel';
import LogPanel from './components/LogPanel';
import { TradeConfig, ActiveOrder, BotLog, MarketData, OrderStatus, OrderSide, BingXCreds, AccountBalance, ConnectionStatus } from './types';
import { fetchBingXCandles, placeBingXOrder, setBingXLeverage, fetchAccountBalance } from './services/bingxService';

const INITIAL_PRICE = 63500;

export default function App() {
  const [currentSymbol, setCurrentSymbol] = useState('BTC-USDT');
  const [currentPrice, setCurrentPrice] = useState(INITIAL_PRICE);
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null);
  const [logs, setLogs] = useState<BotLog[]>([]);
  
  // New States
  const [accountBalance, setAccountBalance] = useState<AccountBalance | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  
  const orderRef = useRef<ActiveOrder | null>(null);
  const priceRef = useRef(INITIAL_PRICE);

  const addLog = (message: string, type: BotLog['type'] = 'info') => {
    setLogs(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      message,
      type
    }]);
  };

  useEffect(() => {
    setMarketData([]); // Reset chart while loading
    const fetchData = async () => {
      const candles = await fetchBingXCandles(currentSymbol);
      if (candles.length > 0) {
        setMarketData(candles);
        const lastPrice = candles[candles.length - 1].close;
        setCurrentPrice(lastPrice);
        priceRef.current = lastPrice;
      }
    };
    fetchData(); 
    const interval = setInterval(fetchData, 5000); 
    return () => clearInterval(interval);
  }, [currentSymbol]);

  useEffect(() => {
    const checkOrder = () => {
      const order = orderRef.current;
      const price = priceRef.current;

      if (order && !order.bingxOrderId) {
        // Skip processing if order is already closed or cancelled
        if (order.status === OrderStatus.CLOSED_TP || 
            order.status === OrderStatus.CLOSED_SL || 
            order.status === OrderStatus.CANCELLED) {
            return;
        }

        if (order.status === OrderStatus.PENDING) {
            const hitEntry = order.side === OrderSide.LONG ? price <= order.entryPrice : price >= order.entryPrice;
            if (hitEntry) {
                const filledOrder: ActiveOrder = { ...order, status: OrderStatus.FILLED };
                orderRef.current = filledOrder;
                setActiveOrder(filledOrder);
                addLog(`Вход Исполнен @ ${price.toFixed(4)}`, 'success');
            }
        }
        else if (order.status === OrderStatus.FILLED) {
            // Calculate PnL
            let pnl = 0;
            const positionSize = (order.amountUSDT * order.leverage) / order.entryPrice; // Quantity in coins
            
            if (order.side === OrderSide.LONG) {
                pnl = (price - order.entryPrice) * positionSize;
            } else {
                pnl = (order.entryPrice - price) * positionSize;
            }
            
            // Update PnL in real-time for UI
            const updatedOrder = { ...order, pnl };
            orderRef.current = updatedOrder;
            setActiveOrder(updatedOrder);

            // Check TP
            const hitTP = order.side === OrderSide.LONG ? price >= order.tpPrice : price <= order.tpPrice;
            if (hitTP) {
                const closedOrder: ActiveOrder = { ...updatedOrder, status: OrderStatus.CLOSED_TP };
                orderRef.current = closedOrder;
                setActiveOrder(closedOrder);
                addLog(`Take Profit Сработал! PnL: ${pnl.toFixed(2)} USDT`, 'success');
                return;
            }

            // Check SL
            const hitSL = order.side === OrderSide.LONG ? price <= order.slPrice : price >= order.slPrice;
            if (hitSL) {
                const closedOrder: ActiveOrder = { ...updatedOrder, status: OrderStatus.CLOSED_SL };
                orderRef.current = closedOrder;
                setActiveOrder(closedOrder);
                addLog(`Stop Loss Сработал. PnL: ${pnl.toFixed(2)} USDT`, 'error');
                return;
            }
        }
      }
    };
    const botInterval = setInterval(checkOrder, 1000);
    return () => clearInterval(botInterval);
  }, []);

  const handleStartBot = async (config: TradeConfig, creds: BingXCreds | null) => {
    // If there is an existing finished order, clear it first
    if (activeOrder && (activeOrder.status === OrderStatus.CLOSED_TP || activeOrder.status === OrderStatus.CLOSED_SL)) {
        orderRef.current = null;
        setActiveOrder(null);
    }

    const entry = config.entryPrice;
    let tpPrice = 0;
    let slPrice = 0;

    if (config.side === OrderSide.LONG) {
      tpPrice = entry * (1 + config.tpPercent / 100);
      slPrice = entry * (1 - config.slPercent / 100);
    } else {
      tpPrice = entry * (1 - config.tpPercent / 100);
      slPrice = entry * (1 + config.slPercent / 100);
    }

    const newOrder: ActiveOrder = {
      ...config,
      symbol: currentSymbol,
      id: Math.random().toString(),
      status: OrderStatus.PENDING,
      createdAt: Date.now(),
      tpPrice,
      slPrice,
      pnl: 0 // Initialize PnL
    };

    if (creds && creds.apiKey) {
        addLog(`Отправка ордера ${config.symbol}...`, 'info');
        await setBingXLeverage(creds, config.symbol, config.side, config.leverage);
        const result = await placeBingXOrder(creds, config.symbol, config.side, config.entryPrice, config.amountUSDT, config.leverage, tpPrice, slPrice);

        if (result.success) {
            newOrder.bingxOrderId = result.orderId;
            addLog(`Ордер создан на бирже! ID: ${result.orderId}`, 'success');
            handleRefreshBalance(creds);
        } else {
            addLog(`Ошибка биржи: ${result.message}`, 'error');
            addLog('Переход в симуляцию', 'warning');
        }
    } else {
        addLog('Запуск в режиме СИМУЛЯЦИИ', 'warning');
    }

    orderRef.current = newOrder;
    setActiveOrder(newOrder);
  };

  const handleCancel = () => {
    orderRef.current = null;
    setActiveOrder(null);
    addLog('Ордер сброшен / отменен', 'warning');
  };

  const handleRefreshBalance = async (creds: BingXCreds) => {
     if(!creds.apiKey) {
         setConnectionStatus('disconnected');
         return;
     }
     
     setConnectionStatus('connecting');
     
     const result = await fetchAccountBalance(creds);
     
     if (result.data) {
         setAccountBalance(result.data);
         if (result.data.isSimulated) {
             setConnectionStatus('connected_sim');
             // Log the specific error reason provided by the service
             addLog(result.error || `Внимание: Доступ к API ограничен. Используются демо-данные.`, 'warning');
         } else {
             setConnectionStatus('connected_real');
             addLog(`Успешное подключение к счету BingX! Баланс: ${result.data.balance}`, 'success');
         }
     } else {
         setConnectionStatus('error');
         addLog(`Критическая ошибка: ${result.error}`, 'error');
     }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex justify-between items-center bg-gray-850 p-4 rounded-xl border border-gray-800 shadow-lg">
          <div className="flex items-center gap-3">
             <div className="bg-gradient-to-br from-bingx-blue to-blue-700 p-2 rounded-lg">
                <Activity className="text-white" size={24} />
             </div>
             <div>
               <h1 className="text-xl font-bold text-white tracking-tight">BingX AI Терминал</h1>
               <p className="text-xs text-gray-500">Автоматизация отложенных ордеров (M5)</p>
             </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="hidden md:flex items-center gap-2 text-xs text-gray-400 bg-gray-900 px-3 py-1.5 rounded-full border border-gray-800">
                <Shield size={12} className="text-bingx-green" />
                <span>Secure Environment</span>
             </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
             <ChartPanel 
                data={marketData} 
                currentPrice={currentPrice}
                entryPrice={activeOrder?.entryPrice}
                tpPrice={activeOrder?.tpPrice}
                slPrice={activeOrder?.slPrice}
                side={activeOrder?.side}
                symbol={currentSymbol}
             />
             <LogPanel 
                logs={logs} 
                activeOrder={activeOrder}
                onCancelOrder={handleCancel}
             />
          </div>
          <div className="lg:col-span-1 h-full">
            <BotControlPanel 
              currentPrice={currentPrice} 
              onStartBot={handleStartBot}
              isBotRunning={!!activeOrder && activeOrder.status !== OrderStatus.CLOSED_TP && activeOrder.status !== OrderStatus.CLOSED_SL && activeOrder.status !== OrderStatus.CANCELLED}
              accountBalance={accountBalance}
              onRefreshBalance={handleRefreshBalance}
              connectionStatus={connectionStatus}
              selectedSymbol={currentSymbol}
              onSymbolChange={setCurrentSymbol}
            />
          </div>
        </div>
      </div>
    </div>
  );
}