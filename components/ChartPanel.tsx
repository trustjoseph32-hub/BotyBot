
import React, { useState } from 'react';
import { ComposedChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Customized } from 'recharts';
import { MarketData, OrderSide } from '../types';

interface ChartPanelProps {
  data: MarketData[];
  currentPrice: number;
  entryPrice?: number;
  tpPrice?: number;
  slPrice?: number;
  side?: OrderSide;
  symbol: string;
}

const CandleShape = (props: any) => {
  const { x, y, width, height, payload } = props;
  const { open, close, high, low } = payload;
  
  if (!payload || open === undefined || close === undefined) return null;

  const isUp = close >= open;
  const color = isUp ? '#00c087' : '#ff3b30';
  const wickWidth = 1.5;

  const totalRange = high - low;
  const ratio = totalRange === 0 ? 0 : height / totalRange;

  const bodyTopPrice = Math.max(open, close);
  const bodyBottomPrice = Math.min(open, close);

  const bodyTopY = y + (high - bodyTopPrice) * ratio;
  const bodyHeight = Math.max(1, (bodyTopPrice - bodyBottomPrice) * ratio);

  return (
    <g>
      <line x1={x + width / 2} y1={y} x2={x + width / 2} y2={y + height} stroke={color} strokeWidth={wickWidth} />
      <rect x={x + 1} y={bodyTopY} width={Math.max(1, width - 2)} height={bodyHeight} fill={color} stroke="none"/>
    </g>
  );
};

const CrosshairOverlay = ({ width, height, mousePos, minPrice, maxPrice }: any) => {
    if (!mousePos || !width || !height) return null;
    const { x, y } = mousePos;
    const priceRange = maxPrice - minPrice;
    const price = maxPrice - (y / height) * priceRange;

    return (
        <g className="pointer-events-none">
            <line x1={0} y1={y} x2={width + 55} y2={y} stroke="#3d5afe" strokeWidth={1} strokeDasharray="3 3" opacity={0.6} />
            <line x1={x} y1={0} x2={x} y2={height} stroke="#3d5afe" strokeWidth={1} strokeDasharray="3 3" opacity={0.3} />
            <rect x={width} y={y - 10} width={55} height={20} fill="#1a202c" stroke="#4a5568" rx={2} />
            <text x={width + 27} y={y + 4} textAnchor="middle" fill="#a0aec0" fontSize={10} fontFamily="monospace" fontWeight="bold">
                {price.toFixed(4)}
            </text>
        </g>
    );
};

const ChartPanel: React.FC<ChartPanelProps> = ({ data, currentPrice, entryPrice, tpPrice, slPrice, side, symbol }) => {
  const [mousePos, setMousePos] = useState<{x: number, y: number} | null>(null);
  
  const chartData = data.map(d => ({ ...d, range: [d.low, d.high] }));

  const maxHigh = chartData.length ? Math.max(...chartData.map(d => d.high)) : currentPrice * 1.01;
  const minLow = chartData.length ? Math.min(...chartData.map(d => d.low)) : currentPrice * 0.99;
  const padding = (maxHigh - minLow) * 0.15;
  const maxPrice = maxHigh + padding;
  const minPrice = minLow - padding;

  // Логика определения последнего уровня "пробоя" для визуализации
  const getBreakoutLevel = () => {
      if (data.length < 3) return null;
      // Простой пример: берем максимум/минимум предыдущих свечей
      const prev = data[data.length - 2];
      return { price: prev.high, type: 'RESISTANCE' };
  };

  const breakout = getBreakoutLevel();

  return (
    <div className="bg-gray-850 border border-gray-700 rounded-xl p-4 shadow-xl flex flex-col h-[400px]">
      <div className="flex justify-between items-end mb-4">
        <div>
          <h3 className="text-gray-400 text-sm font-medium">{symbol.replace('-', '/')} Perpetual (M5)</h3>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-mono font-bold ${data.length > 0 && data[data.length-1].close >= data[data.length-1].open ? 'text-bingx-green' : 'text-bingx-red'}`}>
                {currentPrice.toFixed(4)}
            </span>
            <span className="text-xs text-gray-500 font-mono">USDT</span>
          </div>
        </div>
        <div className="text-right">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Confirmed Breakout</div>
            <div className="text-sm font-mono text-purple-400">{breakout?.price.toFixed(2)}</div>
        </div>
      </div>
      
      <div className="flex-1 w-full min-h-0 cursor-crosshair relative">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart 
            data={chartData} 
            margin={{ top: 10, right: 60, bottom: 5, left: 5 }}
            onMouseMove={(e: any) => {
              if (e && e.chartX && e.chartY) setMousePos({ x: e.chartX, y: e.chartY });
            }}
            onMouseLeave={() => setMousePos(null)}
          >
            <XAxis dataKey="time" tick={{fill: '#4a5568', fontSize: 10}} minTickGap={30} axisLine={false} tickLine={false}/>
            <YAxis 
                domain={[minPrice, maxPrice]} 
                orientation="right" 
                tick={{fill: '#a0aec0', fontSize: 10}} 
                tickFormatter={(val) => val.toFixed(2)}
                axisLine={{ stroke: '#2d3748' }}
                tickLine={false}
                width={55}
            />
            
            <Tooltip content={() => null} cursor={false} />
            
            <Bar dataKey="range" shape={<CandleShape />} isAnimationActive={false}/>

            {/* Уровень пробоя */}
            {breakout && (
                <ReferenceLine 
                    y={breakout.price} 
                    stroke="#a855f7" 
                    strokeWidth={1}
                    strokeDasharray="2 2"
                    label={{ value: 'BREAKOUT', fill: '#a855f7', fontSize: 8, position: 'insideRight' }} 
                />
            )}

            {entryPrice && <ReferenceLine y={entryPrice} stroke="#3d5afe" strokeWidth={2} label={{ value: 'ENTRY', fill: '#3d5afe', fontSize: 10, position: 'insideLeft' }} />}
            {tpPrice && <ReferenceLine y={tpPrice} stroke="#00c087" strokeDasharray="5 5" label={{ value: `TP`, fill: '#00c087', fontSize: 10, position: 'insideLeft' }} />}
            {slPrice && <ReferenceLine y={slPrice} stroke="#ff3b30" strokeDasharray="5 5" label={{ value: `SL`, fill: '#ff3b30', fontSize: 10, position: 'insideLeft' }} />}

            <Customized component={(props: any) => <CrosshairOverlay {...props} mousePos={mousePos} minPrice={minPrice} maxPrice={maxPrice} />}/>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ChartPanel;
