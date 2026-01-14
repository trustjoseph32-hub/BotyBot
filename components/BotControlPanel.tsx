import React, { useState, useEffect } from 'react';
import { Play, RefreshCw, Zap, AlertTriangle, Cpu, Key, Wallet } from 'lucide-react';
import { TradeConfig, OrderSide, BingXCreds, AccountBalance, ConnectionStatus } from '../types';
import { analyzeTradeStrategy, suggestStrategy } from '../services/geminiService';

interface BotControlPanelProps {
  currentPrice: number;
  onStartBot: (config: TradeConfig, creds: BingXCreds | null) => void;
  isBotRunning: boolean;
  accountBalance: AccountBalance | null;
  onRefreshBalance: (creds: BingXCreds) => void;
  connectionStatus: ConnectionStatus;
  selectedSymbol: string;
  onSymbolChange: (symbol: string) => void;
}

const AVAILABLE_PAIRS = [
  'BTC-USDT',
  'FARTCOIN-USDT',
  'PUMP-USDT',
  'AVNT-USDT',
  'COAI-USDT',
  'ASTER-USDT'
];

const BotControlPanel: React.FC<BotControlPanelProps> = ({ 
    currentPrice, 
    onStartBot, 
    isBotRunning, 
    accountBalance, 
    onRefreshBalance, 
    connectionStatus,
    selectedSymbol,
    onSymbolChange
}) => {
  const [entryPrice, setEntryPrice] = useState<string>(currentPrice.toFixed(4));
  const [amount, setAmount] = useState<string>('100');
  const [leverage, setLeverage] = useState<number>(5);
  const [tpPercent, setTpPercent] = useState<string>('2.5');
  const [slPercent, setSlPercent] = useState<string>('1.0');
  const [side, setSide] = useState<OrderSide>(OrderSide.LONG);
  
  const [apiKey, setApiKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [useRealApi, setUseRealApi] = useState(false);

  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [marketObs, setMarketObs] = useState('');

  // Обновляем цену входа при изменении рыночной цены (если бот не запущен, чтобы поле было актуальным)
  useEffect(() => {
      if (!isBotRunning) {
          setEntryPrice(currentPrice.toFixed(4));
      }
  }, [currentPrice, isBotRunning, selectedSymbol]);

  const handleStart = () => {
    const creds: BingXCreds | null = useRealApi ? { apiKey, secretKey } : null;
    onStartBot({
      symbol: selectedSymbol,
      entryPrice: parseFloat(entryPrice) || currentPrice,
      leverage,
      amountUSDT: parseFloat(amount) || 100,
      tpPercent: parseFloat(tpPercent) || 1,
      slPercent: parseFloat(slPercent) || 1,
      side
    }, creds);
  };

  const handleRefreshBalanceClick = () => {
      if(apiKey && secretKey) {
          onRefreshBalance({ apiKey, secretKey });
      }
  }

  const handleAiAnalyze = async () => {
    setIsAnalyzing(true);
    const config = {
      symbol: selectedSymbol,
      entryPrice: parseFloat(entryPrice) || currentPrice,
      leverage,
      amountUSDT: parseFloat(amount),
      tpPercent: parseFloat(tpPercent),
      slPercent: parseFloat(slPercent),
      side
    };
    const result = await analyzeTradeStrategy(config, currentPrice);
    setAiAnalysis(result);
    setIsAnalyzing(false);
  };

  const handleAiSuggest = async () => {
    if(!marketObs) return;
    setIsAnalyzing(true);
    const result = await suggestStrategy(marketObs);
    if (result) {
        setTpPercent(result.tp.toString());
        setSlPercent(result.sl.toString());
        setLeverage(result.leverage);
        setAiAnalysis(`AI Предложение применено: ${result.reasoning}`);
    }
    setIsAnalyzing(false);
  }

  // Visual Status Logic
  const getStatusColor = () => {
      switch(connectionStatus) {
          case 'connected_real': return 'bg-bingx-green shadow-[0_0_8px_#00c087]';
          case 'connected_sim': return 'bg-orange-500 shadow-[0_0_8px_orange]';
          case 'error': return 'bg-red-500 shadow-[0_0_8px_red]';
          case 'connecting': return 'bg-blue-400 animate-pulse';
          default: return 'bg-gray-600';
      }
  };

  const getStatusText = () => {
      switch(connectionStatus) {
          case 'connected_real': return 'LIVE API';
          case 'connected_sim': return 'SIM / CORS';
          case 'error': return 'ОШИБКА';
          case 'connecting': return '...';
          default: return 'ОТКЛЮЧЕНО';
      }
  };

  return (
    <div className="bg-gray-850 border border-gray-700 rounded-xl p-6 shadow-xl h-full flex flex-col overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Cpu className="text-bingx-blue" /> Конфигурация
        </h2>
        
        {/* Connection Status Indicator */}
        <div className={`text-[10px] font-mono px-2 py-1 rounded border flex items-center gap-2 ${useRealApi ? 'bg-bingx-blue/10 border-bingx-blue/30 text-bingx-blue' : 'bg-gray-800 text-gray-400 border-gray-700'}`}>
          <div className={`w-2 h-2 rounded-full transition-colors ${getStatusColor()}`}></div>
          {getStatusText()}
        </div>
      </div>

      <div className="space-y-6">
        {/* API Keys Section */}
        <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-800">
            <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-400 flex items-center gap-1">
                    <Key size={12} /> BingX API Ключи
                </label>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500">{useRealApi ? 'Вкл' : 'Выкл'}</span>
                    <button 
                        onClick={() => setUseRealApi(!useRealApi)}
                        className={`w-8 h-4 rounded-full relative transition-colors ${useRealApi ? 'bg-bingx-blue' : 'bg-gray-700'}`}
                    >
                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${useRealApi ? 'left-4.5' : 'left-0.5'}`} />
                    </button>
                </div>
            </div>
            {useRealApi && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <input 
                        type="text" 
                        placeholder="API Key"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-xs text-white focus:border-bingx-blue outline-none"
                    />
                    <input 
                        type="password" 
                        placeholder="Secret Key"
                        value={secretKey}
                        onChange={(e) => setSecretKey(e.target.value)}
                        className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-xs text-white focus:border-bingx-blue outline-none"
                    />
                    <button 
                        onClick={handleRefreshBalanceClick}
                        className="w-full mt-2 bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 py-1 rounded transition-colors flex items-center justify-center gap-1"
                    >
                        <RefreshCw size={10} /> Проверить ключи и баланс
                    </button>
                    {connectionStatus === 'connected_sim' && (
                        <div className="text-[10px] text-orange-400 mt-1 px-1 flex items-start gap-1">
                            <AlertTriangle size={10} className="mt-0.5 shrink-0"/>
                            <span>CORS блокировка: используются тестовые данные.</span>
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* Balance Display */}
        {useRealApi && accountBalance && (
             <div className={`p-3 rounded-lg border animate-in fade-in ${accountBalance.isSimulated ? 'bg-orange-900/10 border-orange-500/30' : 'bg-gradient-to-r from-gray-900 to-gray-800 border-gray-700'}`}>
                 <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400 flex items-center gap-1"><Wallet size={12}/> Баланс {accountBalance.isSimulated ? '(DEMO)' : '(REAL)'}</span>
                    <span className="text-xs text-bingx-blue font-bold">{accountBalance.balance.toFixed(2)}</span>
                 </div>
                 <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-500">Доступно</span>
                    <span className="text-[10px] text-gray-300">{accountBalance.availableMargin.toFixed(2)}</span>
                 </div>
                 <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-500">PnL</span>
                    <span className={`text-[10px] ${accountBalance.unrealizedPL >= 0 ? 'text-bingx-green' : 'text-bingx-red'}`}>
                        {accountBalance.unrealizedPL.toFixed(2)}
                    </span>
                 </div>
             </div>
        )}

        {/* Strategy Controls */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Инструмент</label>
            <select
              value={selectedSymbol}
              onChange={(e) => onSymbolChange(e.target.value)}
              className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-bingx-blue outline-none font-mono appearance-none cursor-pointer"
            >
                {AVAILABLE_PAIRS.map(pair => (
                    <option key={pair} value={pair}>{pair}</option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Направление</label>
            <div className="grid grid-cols-2 gap-2 bg-gray-950 p-1 rounded-lg border border-gray-700">
              <button 
                onClick={() => setSide(OrderSide.LONG)}
                className={`text-sm font-bold py-2 rounded transition-all ${side === OrderSide.LONG ? 'bg-bingx-green text-black' : 'text-gray-500 hover:text-white'}`}
              >
                LONG
              </button>
              <button 
                onClick={() => setSide(OrderSide.SHORT)}
                className={`text-sm font-bold py-2 rounded transition-all ${side === OrderSide.SHORT ? 'bg-bingx-red text-white' : 'text-gray-500 hover:text-white'}`}
              >
                SHORT
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
           <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Плечо (x)</label>
            <input 
              type="number" 
              value={leverage}
              onChange={(e) => setLeverage(Number(e.target.value))}
              className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-bingx-blue outline-none font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Маржа (USDT)</label>
            <input 
              type="number" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-bingx-blue outline-none font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Цена Входа (Лимитка)</label>
          <div className="relative">
            <input 
              type="number" 
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-bingx-blue outline-none font-mono"
            />
            <button 
              onClick={() => setEntryPrice(currentPrice.toFixed(4))}
              className="absolute right-2 top-2 text-xs text-bingx-blue hover:text-white bg-gray-800 px-2 py-1 rounded"
            >
              Текущая
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-bingx-green mb-1">Тейк Профит (%)</label>
            <input 
              type="number" 
              step="0.1"
              value={tpPercent}
              onChange={(e) => setTpPercent(e.target.value)}
              className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-bingx-green outline-none font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-bingx-red mb-1">Стоп Лосс (%)</label>
            <input 
              type="number" 
              step="0.1"
              value={slPercent}
              onChange={(e) => setSlPercent(e.target.value)}
              className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-bingx-red outline-none font-mono"
            />
          </div>
        </div>

        {/* AI Section */}
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <h3 className="text-sm font-semibold text-purple-400 flex items-center gap-2 mb-2">
                <Zap size={14} /> Gemini AI Аналитик
            </h3>
            
            {!aiAnalysis ? (
                <>
                <textarea 
                    placeholder="Опишите рынок (напр. 'Цена во флэте, жду падения')"
                    className="w-full text-xs bg-gray-900 border border-gray-700 rounded p-2 text-gray-300 mb-2 focus:outline-none focus:border-purple-500"
                    rows={2}
                    value={marketObs}
                    onChange={(e) => setMarketObs(e.target.value)}
                />
                <div className="flex gap-2">
                    <button 
                        onClick={handleAiSuggest}
                        disabled={isAnalyzing || !marketObs}
                        className="flex-1 text-xs bg-purple-900/30 hover:bg-purple-900/50 text-purple-300 py-2 rounded border border-purple-800 transition-colors disabled:opacity-50"
                    >
                        Авто-подбор
                    </button>
                    <button 
                        onClick={handleAiAnalyze}
                        disabled={isAnalyzing}
                        className="flex-1 text-xs bg-gray-700 hover:bg-gray-600 text-white py-2 rounded transition-colors disabled:opacity-50"
                    >
                        Анализ Сделки
                    </button>
                </div>
                </>
            ) : (
                <div className="text-xs text-gray-300 animate-in fade-in">
                    <div className="bg-gray-900 p-2 rounded border border-gray-700 mb-2 max-h-32 overflow-y-auto whitespace-pre-wrap">
                        {aiAnalysis}
                    </div>
                    <button 
                        onClick={() => setAiAnalysis(null)} 
                        className="text-xs text-gray-500 hover:text-white underline"
                    >
                        Очистить
                    </button>
                </div>
            )}
        </div>

        <button 
          onClick={handleStart}
          disabled={isBotRunning}
          className={`w-full py-4 rounded-lg font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-95 ${
            isBotRunning 
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
              : 'bg-gradient-to-r from-bingx-blue to-blue-600 hover:from-blue-500 hover:to-blue-600 text-white'
          }`}
        >
          {isBotRunning ? (
            <>
              <RefreshCw className="animate-spin" /> Бот Активен
            </>
          ) : (
            <>
              <Play fill="currentColor" /> Запустить Бота
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default BotControlPanel;