/**
 * Exponential Triple Smoothing (Holt-Winters ETS) Time-Series Forecaster.
 * Uses Level (α), Trend (β), and Seasonality (γ) smoothing parameters
 * to project 30-day performance forecasts based on historical Google Ads baseline data.
 */
export default class ETSForecaster {
  /**
   * Runs Holt-Winters ETS time-series forecast over baseline daily performance data.
   * 
   * @param {object} baselineData - Historical daily time-series from Google Ads API or baseline
   * @param {object} [swarmMetricsMultiplier] - Multiplier derived from top Swarm candidates
   * @param {number} [horizonDays=30] - Days to project into the future
   * @param {object} [params] - Custom ETS parameters (alpha, beta, gamma, period)
   * @returns {object} Structured 30-day ETS forecast with daily points and confidence bounds
   */
  static forecast(baselineData, swarmMetricsMultiplier = {}, horizonDays = 30, params = {}) {
    const alpha = params.alpha || 0.35; // Level smoothing
    const beta = params.beta || 0.15;   // Trend smoothing
    const gamma = params.gamma || 0.10;  // Seasonal smoothing
    const period = params.period || 7;  // 7-day weekly seasonality

    const dailySeries = baselineData.dailySeries || [];
    if (dailySeries.length === 0) {
      throw new Error('ETSForecaster Error: Empty historical daily series provided.');
    }

    // Extract metric vectors
    const ctrSeries = dailySeries.map(d => d.ctrPercent);
    const cpcSeries = dailySeries.map(d => d.cpcEuro);
    const cplSeries = dailySeries.map(d => d.cplEuro);
    const convSeries = dailySeries.map(d => d.conversions);
    const costSeries = dailySeries.map(d => d.costEuro);

    // Run Holt-Winters ETS for CTR, CPC, CPL, Conversions, Cost
    const ctrForecast = this._holtWintersETS(ctrSeries, horizonDays, alpha, beta, gamma, period);
    const cpcForecast = this._holtWintersETS(cpcSeries, horizonDays, alpha, beta, gamma, period);
    const cplForecast = this._holtWintersETS(cplSeries, horizonDays, alpha, beta, gamma, period);
    const convForecast = this._holtWintersETS(convSeries, horizonDays, alpha, beta, gamma, period);
    const costForecast = this._holtWintersETS(costSeries, horizonDays, alpha, beta, gamma, period);

    // Apply Swarm Predictive Multipliers (e.g. Swarm Grade A Winner Uplift)
    const ctrUplift = swarmMetricsMultiplier.ctrUplift || 1.12; // +12% CTR uplift for Top Swarm Ads
    const cpcDiscount = swarmMetricsMultiplier.cpcDiscount || 0.96; // -4% CPC discount
    const cplUplift = swarmMetricsMultiplier.cplUplift || 0.92; // -8% CPL optimization

    const startDate = new Date();
    const dailyForecastSeries = [];

    for (let h = 0; h < horizonDays; h++) {
      const forecastDate = new Date(startDate);
      forecastDate.setDate(forecastDate.getDate() + h + 1);
      const dateStr = forecastDate.toISOString().split('T')[0];

      const projCtr = parseFloat(Math.max(0.5, ctrForecast.pointForecast[h] * ctrUplift).toFixed(2));
      const projCpc = parseFloat(Math.max(0.2, cpcForecast.pointForecast[h] * cpcDiscount).toFixed(2));
      const projCpl = parseFloat(Math.max(5.0, cplForecast.pointForecast[h] * cplUplift).toFixed(2));
      const projConvs = parseFloat(Math.max(0.1, convForecast.pointForecast[h] * 1.1).toFixed(1));
      const projCost = parseFloat(Math.max(10, costForecast.pointForecast[h]).toFixed(2));

      dailyForecastSeries.push({
        date: dateStr,
        forecastDay: h + 1,
        projectedCtrPercent: projCtr,
        projectedCpcEuro: projCpc,
        projectedCplEuro: projCpl,
        projectedConversions: projConvs,
        projectedCostEuro: projCost,
        confidenceInterval: {
          ctrLower: parseFloat(Math.max(0.1, projCtr - ctrForecast.stdError * 1.96).toFixed(2)),
          ctrUpper: parseFloat((projCtr + ctrForecast.stdError * 1.96).toFixed(2)),
          cplLower: parseFloat(Math.max(1.0, projCpl - cplForecast.stdError * 1.96).toFixed(2)),
          cplUpper: parseFloat((projCpl + cplForecast.stdError * 1.96).toFixed(2))
        }
      });
    }

    const totalProjectedSpend = dailyForecastSeries.reduce((s, d) => s + d.projectedCostEuro, 0);
    const totalProjectedConvs = dailyForecastSeries.reduce((s, d) => s + d.projectedConversions, 0);
    const avgProjectedCtr = dailyForecastSeries.reduce((s, d) => s + d.projectedCtrPercent, 0) / horizonDays;
    const avgProjectedCpc = dailyForecastSeries.reduce((s, d) => s + d.projectedCpcEuro, 0) / horizonDays;
    const avgProjectedCpl = totalProjectedConvs > 0 ? totalProjectedSpend / totalProjectedConvs : dailyForecastSeries.reduce((s, d) => s + d.projectedCplEuro, 0) / horizonDays;

    return {
      model: 'Exponential Triple Smoothing (Holt-Winters ETS)',
      etsParameters: { alpha, beta, gamma, seasonalPeriod: period },
      baselineSource: baselineData.source || 'Google Ads Account Baseline Stream',
      horizonDays,
      trendVelocityPercentPerWeek: parseFloat((ctrForecast.trendSlope * 7).toFixed(2)),
      aggregatedForecast: {
        totalProjectedSpendEuro: parseFloat(totalProjectedSpend.toFixed(2)),
        totalProjectedConversions: parseFloat(totalProjectedConvs.toFixed(1)),
        avgProjectedCtrPercent: parseFloat(avgProjectedCtr.toFixed(2)),
        avgProjectedCpcEuro: parseFloat(avgProjectedCpc.toFixed(2)),
        avgProjectedCplEuro: parseFloat(avgProjectedCpl.toFixed(2))
      },
      dailyForecastSeries
    };
  }

  /**
   * Internal Holt-Winters ETS calculation for a numeric time-series vector
   */
  static _holtWintersETS(series, horizon, alpha, beta, gamma, period) {
    const len = series.length;
    let level = series[0];
    let trend = (series[len - 1] - series[0]) / len;
    const seasonals = new Array(period).fill(0);

    // Initial seasonal components
    for (let i = 0; i < period && i < len; i++) {
      seasonals[i] = series[i] - level;
    }

    const errors = [];

    for (let t = 0; t < len; t++) {
      const val = series[t];
      const sIdx = t % period;
      const prevLevel = level;

      // Update level, trend, seasonal
      level = alpha * (val - seasonals[sIdx]) + (1 - alpha) * (prevLevel + trend);
      trend = beta * (level - prevLevel) + (1 - beta) * trend;
      seasonals[sIdx] = gamma * (val - level) + (1 - gamma) * seasonals[sIdx];

      const fittedVal = prevLevel + trend + seasonals[sIdx];
      errors.push(val - fittedVal);
    }

    // Compute standard error
    const mse = errors.reduce((acc, err) => acc + err * err, 0) / errors.length;
    const stdError = Math.sqrt(mse);

    // Forecast future points
    const pointForecast = [];
    for (let h = 1; h <= horizon; h++) {
      const sIdx = (len + h - 1) % period;
      const fc = level + h * trend + seasonals[sIdx];
      pointForecast.push(fc);
    }

    return {
      level,
      trendSlope: trend,
      seasonals,
      stdError,
      pointForecast
    };
  }
}
