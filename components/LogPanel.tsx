import React, { useEffect, useRef } from 'react';
import { BotLog, ActiveOrder, OrderStatus } from '../types';
import { Terminal, Clock, CheckCircle, XCircle, AlertCircle, RotateCcw } from 'lucide-react';

interface LogPanelProps {
  logs: BotLog[];
  activeOrder: ActiveOrder | null;
  onCancelOrder: (id: string) => void;
}

const LogPanel: React.FC<LogPanelProps> = ({ logs, activeOrder, onCancelOrder }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getLogIcon = (type: BotLog['type']) => {
    switch(type) {
        case 'success': return <CheckCircle size={14} className="text-bingx-green" />;
        case 'error': return <XCircle size={14} className="text-bingx-red" />;
        case 'warning': return <AlertCircle size={14} className="text-yellow-500" />;
        default: return <Clock size={14} className="text-blue-400" />;
    }
  }

  const getStatusColor = (status: OrderStatus) => {
      switch (status) {
          case OrderStatus.PENDING: return 'text-yellow-400';
          case OrderStatus.OPEN:
          case OrderStatus.FILLED: return 'text-blue-400';
          case OrderStatus.CLOSED_TP: return 'text-bingx-green';
          case OrderStatus.CLOSED_SL: return 'text-bingx-red';
          default: return 'text-gray-400';
      }
  };

  const isOrderClosed = activeOrder && (
      activeOrder.status === OrderStatus.CLOSED_TP || 
      activeOrder.status === OrderStatus.CLOSED_SL ||
      activeOrder.status === OrderStatus.CANCELLED
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[300px]">
      {/* Active Order Card */}
      <div className="bg-gray-850 border border-gray-700 rounded-xl p-4 flex flex-col">
        <h3 className="text-gray-400 text-sm font-medium mb-3 flex items-center gap-2">
            <Terminal size={16} /> Активная Стратегия
        </h3>
        
        {activeOrder ? (
            <div className={`flex-1 rounded-lg p-4 border relative overflow-hidden flex flex-col ${isOrderClosed ? 'bg-gray-900/30 border-gray-800 opacity-90' : 'bg-gray-900/50 border-gray-800'}`}>
                <div className={`absolute top-0 left-0 w-1 h-full ${activeOrder.side === 'LONG' ? 'bg-bingx-green' : 'bg-bingx-red'}`}></div>
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <div className="text-lg font-bold text-white">{activeOrder.symbol}</div>
                        <div className={`text-xs font-bold px-2 py-0.5 rounded w-fit mt-1 ${activeOrder.side === 'LONG' ? 'bg-bingx-green/20 text-bingx-green' : 'bg-bingx-red/20 text-bingx-red'}`}>
                            {activeOrder.side} {activeOrder.leverage}x
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs text-gray-500">Статус</div>
                        <div className={`font-mono font-bold ${getStatusColor(activeOrder.status)}`}>{activeOrder.status}</div>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs mb-auto">
                    <div className="bg-gray-800 p-2 rounded">
                        <div className="text-gray-500">Вход</div>
                        <div className="text-white font-mono">{activeOrder.entryPrice.toFixed(2)}</div>
                    </div>
                    <div className="bg-gray-800 p-2 rounded border border-bingx-green/20">
                        <div className="text-gray-500">TP</div>
                        <div className="text-bingx-green font-mono">{activeOrder.tpPrice.toFixed(2)}</div>
                    </div>
                    <div className="bg-gray-800 p-2 rounded border border-bingx-red/20">
                        <div className="text-gray-500">SL</div>
                        <div className="text-bingx-red font-mono">{activeOrder.slPrice.toFixed(2)}</div>
                    </div>
                </div>

                {(activeOrder.status === OrderStatus.FILLED || isOrderClosed) && (
                    <div className={`text-center font-mono text-lg font-bold my-4 ${activeOrder.pnl && activeOrder.pnl >= 0 ? 'text-bingx-green' : 'text-bingx-red'}`}>
                        {activeOrder.pnl ? `${activeOrder.pnl > 0 ? '+' : ''}${activeOrder.pnl.toFixed(2)} USDT` : '0.00 USDT'}
                    </div>
                )}
                
                {activeOrder.bingxOrderId && (
                    <div className="text-[10px] text-gray-500 text-center mb-2">ID Ордера BingX: {activeOrder.bingxOrderId}</div>
                )}

                <button 
                    onClick={() => onCancelOrder(activeOrder.id)}
                    className={`w-full py-2 rounded text-sm transition-colors flex items-center justify-center gap-2 ${
                        isOrderClosed 
                        ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' 
                        : 'bg-gray-800 hover:bg-red-900/50 hover:text-red-200 text-gray-300 border border-transparent hover:border-red-800'
                    }`}
                >
                    {isOrderClosed ? (
                        <>
                           <RotateCcw size={14} /> Новый Ордер
                        </>
                    ) : (
                        activeOrder.status === OrderStatus.PENDING ? 'Отменить Ордер' : 'Закрыть Позицию'
                    )}
                </button>
            </div>
        ) : (
            <div className="flex-1 flex items-center justify-center text-gray-600 text-sm italic border border-dashed border-gray-800 rounded-lg">
                Нет активных стратегий
            </div>
        )}
      </div>

      {/* Logs Console */}
      <div className="bg-gray-850 border border-gray-700 rounded-xl p-4 flex flex-col">
        <h3 className="text-gray-400 text-sm font-medium mb-3 flex items-center gap-2">
            <Clock size={16} /> Лог Операций
        </h3>
        <div className="flex-1 bg-black/40 rounded-lg p-3 overflow-y-auto font-mono text-xs space-y-2 border border-gray-800">
            {logs.length === 0 && <span className="text-gray-600">Система готова. Ожидание команд...</span>}
            {logs.map((log) => (
                <div key={log.id} className="flex gap-2 items-start animate-in fade-in slide-in-from-left-2">
                    <span className="text-gray-600 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                    <span className="mt-0.5 shrink-0">{getLogIcon(log.type)}</span>
                    <span className={`${
                        log.type === 'error' ? 'text-red-400' : 
                        log.type === 'success' ? 'text-green-400' : 
                        log.type === 'warning' ? 'text-yellow-400' : 'text-gray-300'
                    }`}>
                        {log.message}
                    </span>
                </div>
            ))}
            <div ref={endRef} />
        </div>
      </div>
    </div>
  );
};

export default LogPanel;