import React, { useMemo } from 'react';
import { View, ScrollView, Text, StyleSheet } from 'react-native';
import { OHLCV } from '@/lib/price-data';
import { AllIndicators } from '@/lib/indicators';

interface TradingChartProps {
  candles: OHLCV[];
  indicators: AllIndicators | null;
  currentPrice: number;
  predictedPrice: number;
  height?: number;
}

const CANDLE_WIDTH = 6;
const CANDLE_GAP = 2;
const CANDLE_STEP = CANDLE_WIDTH + CANDLE_GAP;
const Y_AXIS_WIDTH = 52;
const X_AXIS_HEIGHT = 18;
const LEGEND_HEIGHT = 24;
const CHART_PADDING_TOP = 4;
const CHART_PADDING_BOTTOM = 4;

const GREEN = '#10B981';
const RED = '#EF4444';
const CYAN = '#00D4FF';
const MAGENTA = '#FF00FF';
const GOLD = '#F59E0B';
const BG = '#111827';
const TEXT_COLOR = '#94A3B8';

function TradingChart({
  candles,
  indicators,
  currentPrice,
  predictedPrice,
  height = 280,
}: TradingChartProps) {
  const volumeHeight = Math.round(height * 0.2);
  const priceChartHeight = height - LEGEND_HEIGHT - X_AXIS_HEIGHT - volumeHeight;

  const { minPrice, maxPrice, maxVolume } = useMemo(() => {
    if (candles.length === 0) return { minPrice: 0, maxPrice: 1, maxVolume: 1 };
    let lo = Infinity;
    let hi = -Infinity;
    let mv = 0;
    for (const c of candles) {
      if (c.low < lo) lo = c.low;
      if (c.high > hi) hi = c.high;
      if (c.volume > mv) mv = c.volume;
    }
    if (currentPrice < lo) lo = currentPrice;
    if (currentPrice > hi) hi = currentPrice;
    if (predictedPrice < lo) lo = predictedPrice;
    if (predictedPrice > hi) hi = predictedPrice;
    const pad = (hi - lo) * 0.05 || 1;
    return { minPrice: lo - pad, maxPrice: hi + pad, maxVolume: mv || 1 };
  }, [candles, currentPrice, predictedPrice]);

  const priceRange = maxPrice - minPrice || 1;
  const drawableHeight = priceChartHeight - CHART_PADDING_TOP - CHART_PADDING_BOTTOM;

  const priceToY = (price: number) => {
    return CHART_PADDING_TOP + drawableHeight * (1 - (price - minPrice) / priceRange);
  };

  const totalWidth = candles.length * CANDLE_STEP;

  const yLabels = useMemo(() => {
    const count = 5;
    const labels: { price: number; y: number }[] = [];
    for (let i = 0; i <= count; i++) {
      const price = minPrice + (priceRange * i) / count;
      labels.push({ price, y: priceToY(price) });
    }
    return labels;
  }, [minPrice, maxPrice, priceChartHeight]);

  const currentPriceY = priceToY(currentPrice);
  const predictedPriceY = priceToY(predictedPrice);

  const bbUpperValues = indicators?.bollinger?.values?.upper;
  const bbLowerValues = indicators?.bollinger?.values?.lower;
  const stValues = indicators?.superTrend?.values;
  const stDirections = indicators?.superTrend?.directions;

  const superTrendDir = indicators?.superTrend?.trend ?? 'BULLISH';
  const rsiValue = indicators?.rsi?.value ?? 50;
  const consensus = indicators?.consensusSignal ?? 'NEUTRAL';

  const consensusColor =
    consensus === 'STRONG_BUY' || consensus === 'BUY'
      ? GREEN
      : consensus === 'STRONG_SELL' || consensus === 'SELL'
        ? RED
        : GOLD;

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const hh = d.getHours().toString().padStart(2, '0');
    const mm = d.getMinutes().toString().padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const formatPrice = (p: number) => {
    if (p >= 10000) return p.toFixed(0);
    if (p >= 100) return p.toFixed(1);
    return p.toFixed(2);
  };

  const timeLabels = useMemo(() => {
    const labels: { x: number; text: string }[] = [];
    const step = Math.max(1, Math.floor(candles.length / 6));
    for (let i = 0; i < candles.length; i += step) {
      labels.push({ x: i * CANDLE_STEP + CANDLE_WIDTH / 2, text: formatTime(candles[i].time) });
    }
    return labels;
  }, [candles]);

  if (candles.length === 0) {
    return (
      <View testID="trading-chart" style={[styles.container, { height }]}>
        <Text style={styles.emptyText}>No data</Text>
      </View>
    );
  }

  return (
    <View testID="trading-chart" style={[styles.container, { height }]}>
      <View style={styles.legend}>
        <View style={[styles.badge, { backgroundColor: superTrendDir === 'BULLISH' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)' }]}>
          <Text style={[styles.badgeText, { color: superTrendDir === 'BULLISH' ? GREEN : RED }]}>
            ST {superTrendDir === 'BULLISH' ? '▲' : '▼'}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
          <Text style={[styles.badgeText, { color: GOLD }]}>RSI {rsiValue}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: consensusColor + '20' }]}>
          <Text style={[styles.badgeText, { color: consensusColor }]}>{consensus}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: 'rgba(0,212,255,0.15)' }]}>
          <View style={styles.legendDot} />
          <Text style={[styles.badgeText, { color: CYAN }]}>LTP</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: 'rgba(255,0,255,0.15)' }]}>
          <View style={[styles.legendDot, { backgroundColor: MAGENTA }]} />
          <Text style={[styles.badgeText, { color: MAGENTA }]}>AI</Text>
        </View>
      </View>

      <View style={styles.chartRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ width: totalWidth }}
          style={styles.scrollView}
        >
          <View style={{ width: totalWidth, height: priceChartHeight + volumeHeight }}>
            {bbUpperValues && bbUpperValues.length > 0 && (
              <View style={StyleSheet.absoluteFill}>
                {(() => {
                  const offset = candles.length - bbUpperValues.length;
                  return bbUpperValues.map((val, i) => {
                    const x = (i + offset) * CANDLE_STEP + CANDLE_WIDTH / 2;
                    const y = priceToY(val);
                    return <View key={`bbu-${i}`} style={[styles.bbDot, { left: x, top: y }]} />;
                  });
                })()}
              </View>
            )}

            {bbLowerValues && bbLowerValues.length > 0 && (
              <View style={StyleSheet.absoluteFill}>
                {(() => {
                  const offset = candles.length - bbLowerValues.length;
                  return bbLowerValues.map((val, i) => {
                    const x = (i + offset) * CANDLE_STEP + CANDLE_WIDTH / 2;
                    const y = priceToY(val);
                    return <View key={`bbl-${i}`} style={[styles.bbDot, { left: x, top: y }]} />;
                  });
                })()}
              </View>
            )}

            {stValues && stValues.length > 0 && stDirections && (
              <View style={StyleSheet.absoluteFill}>
                {(() => {
                  const offset = candles.length - stValues.length;
                  return stValues.map((val, i) => {
                    if (val === 0) return null;
                    const x = (i + offset) * CANDLE_STEP + CANDLE_WIDTH / 2;
                    const y = priceToY(val);
                    const color = stDirections[i] === 'UP' ? GREEN : RED;
                    return (
                      <View
                        key={`st-${i}`}
                        style={[styles.stDot, { left: x - 1.5, top: y - 1.5, backgroundColor: color }]}
                      />
                    );
                  });
                })()}
              </View>
            )}

            {candles.map((c, i) => {
              const x = i * CANDLE_STEP;
              const bullish = c.close >= c.open;
              const color = bullish ? GREEN : RED;
              const bodyTop = priceToY(Math.max(c.open, c.close));
              const bodyBottom = priceToY(Math.min(c.open, c.close));
              const bodyHeight = Math.max(1, bodyBottom - bodyTop);
              const wickTop = priceToY(c.high);
              const wickBottom = priceToY(c.low);
              const wickHeight = Math.max(1, wickBottom - wickTop);
              const wickX = x + CANDLE_WIDTH / 2;

              const volH = (c.volume / maxVolume) * volumeHeight;
              const volTop = priceChartHeight + (volumeHeight - volH);

              return (
                <React.Fragment key={i}>
                  <View
                    style={[
                      styles.wick,
                      { left: wickX, top: wickTop, height: wickHeight, backgroundColor: color },
                    ]}
                  />
                  <View
                    style={[
                      styles.candleBody,
                      {
                        left: x,
                        top: bodyTop,
                        height: bodyHeight,
                        width: CANDLE_WIDTH,
                        backgroundColor: color,
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.volumeBar,
                      {
                        left: x,
                        top: volTop,
                        height: volH,
                        width: CANDLE_WIDTH,
                        backgroundColor: color,
                      },
                    ]}
                  />
                </React.Fragment>
              );
            })}

            <DashedLine y={currentPriceY} width={totalWidth} color={CYAN} />
            <DashedLine y={predictedPriceY} width={totalWidth} color={MAGENTA} />
          </View>
        </ScrollView>

        <View style={[styles.yAxis, { height: priceChartHeight + volumeHeight }]}>
          {yLabels.map((l, i) => (
            <Text key={i} style={[styles.yLabel, { top: l.y - 6 }]}>
              {formatPrice(l.price)}
            </Text>
          ))}
          <Text style={[styles.yLabel, { top: currentPriceY - 6, color: CYAN }]}>
            {formatPrice(currentPrice)}
          </Text>
          <Text style={[styles.yLabel, { top: predictedPriceY - 6, color: MAGENTA }]}>
            {formatPrice(predictedPrice)}
          </Text>
        </View>
      </View>

      <View style={styles.xAxisRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEnabled={false}
          contentContainerStyle={{ width: totalWidth }}
          style={styles.scrollView}
        >
          <View style={{ width: totalWidth, height: X_AXIS_HEIGHT, flexDirection: 'row' }}>
            {timeLabels.map((l, i) => (
              <Text key={i} style={[styles.xLabel, { position: 'absolute', left: l.x - 14 }]}>
                {l.text}
              </Text>
            ))}
          </View>
        </ScrollView>
        <View style={{ width: Y_AXIS_WIDTH }} />
      </View>
    </View>
  );
}

function DashedLine({ y, width, color }: { y: number; width: number; color: string }) {
  const dashCount = Math.ceil(width / 8);
  return (
    <View style={[styles.dashedRow, { top: y }]}>
      {Array.from({ length: dashCount }).map((_, i) => (
        <View key={i} style={[styles.dash, { backgroundColor: color }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: BG,
    borderRadius: 8,
    overflow: 'hidden',
  },
  emptyText: {
    color: TEXT_COLOR,
    fontFamily: 'DMSans_400Regular',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 13,
  },
  legend: {
    height: LEGEND_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  legendDot: {
    width: 6,
    height: 2,
    borderRadius: 1,
    backgroundColor: CYAN,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: 'DMSans_600SemiBold',
  },
  chartRow: {
    flexDirection: 'row',
  },
  scrollView: {
    flex: 1,
  },
  yAxis: {
    width: Y_AXIS_WIDTH,
    position: 'relative',
  },
  yLabel: {
    position: 'absolute',
    right: 4,
    fontSize: 8,
    color: TEXT_COLOR,
    fontFamily: 'DMSans_400Regular',
  },
  xAxisRow: {
    flexDirection: 'row',
    height: X_AXIS_HEIGHT,
  },
  xLabel: {
    fontSize: 8,
    color: TEXT_COLOR,
    fontFamily: 'DMSans_400Regular',
  },
  wick: {
    position: 'absolute',
    width: 1,
  },
  candleBody: {
    position: 'absolute',
    borderRadius: 1,
  },
  volumeBar: {
    position: 'absolute',
    opacity: 0.35,
    borderRadius: 1,
  },
  bbDot: {
    position: 'absolute',
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(148,163,184,0.5)',
  },
  stDot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  dashedRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    height: 1,
    gap: 4,
  },
  dash: {
    width: 4,
    height: 1,
  },
});

export default TradingChart;
