/* ==========================================================================
   Heidi Whelping & Puppy Growth Tracker — Offline SVG Chart Engine (charts.js)
   מנוע גרפים וקטורי עצמאי (משקלים + השוואת גורים + טמפרטורת סביבה)
   ========================================================================== */

const HeidiCharts = {
  formatNum(n, decimals = 0) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    return Number(n).toLocaleString('he-IL', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  },

  renderGrowthChart(containerId, legendId, mode = 'weight_all', selectedPuppyId = 'all') {
    const container = document.getElementById(containerId);
    const legendEl = document.getElementById(legendId);
    if (!container) return;

    const store = window.HeidiStore;
    const puppies = store.state.puppies;

    if (!puppies || puppies.length === 0) {
      container.innerHTML = `
        <div style="padding: 32px; text-align: center; color: var(--text-muted);">
          טרם הוזנו גורים במערכת. ברגע שיוזנו גורים ושקילות, גרפי הגדילה וההשוואה יוצגו כאן אוטומטית.
        </div>
      `;
      if (legendEl) legendEl.innerHTML = '';
      return;
    }

    const seriesList = [];
    const targetPuppies = selectedPuppyId === 'all'
      ? puppies
      : puppies.filter(p => p.id === selectedPuppyId);

    if (mode === 'litter_avg') {
      const dayBuckets = new Map();
      puppies.forEach(p => {
        const calc = store.getCalculatedWeightsForPuppy(p.id);
        calc.forEach((entry, idx) => {
          const dayKey = entry.ageDaysDecimal !== null ? Math.round(entry.ageDaysDecimal) : idx;
          if (!dayBuckets.has(dayKey)) dayBuckets.set(dayKey, []);
          dayBuckets.get(dayKey).push(entry.weightG);
        });
      });

      const points = Array.from(dayBuckets.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([day, weights]) => {
          const avg = weights.reduce((s, v) => s + v, 0) / weights.length;
          return {
            x: day,
            xLabel: `יום ${day}`,
            y: avg,
            tooltip: `יום ${day}: ממוצע ${this.formatNum(avg, 0)} גרם (${weights.length} גורים)`
          };
        });

      if (points.length > 0) {
        seriesList.push({
          name: 'ממוצע השגר (גרם)',
          color: '#059669',
          points
        });
      }
    } else {
      targetPuppies.forEach((p, idx) => {
        const calc = store.getCalculatedWeightsForPuppy(p.id);
        if (calc.length === 0) return;

        const fallbackColors = ['#059669', '#3b82f6', '#ef4444', '#eab308', '#8b5cf6', '#ec4899', '#f97316', '#06b6d4'];
        const lineColor = (p.ribbonColorHex && p.ribbonColorHex !== '#e2e8f0')
          ? p.ribbonColorHex
          : fallbackColors[idx % fallbackColors.length];

        const points = [];
        calc.forEach((entry, eIdx) => {
          const xVal = entry.ageDaysDecimal !== null ? Number(entry.ageDaysDecimal.toFixed(2)) : eIdx;
          const xLabel = entry.ageDisplay !== 'חסרה שעת לידה' ? entry.ageDisplay : `שקילה ${eIdx + 1}`;

          if (mode === 'pct_from_birth') {
            if (entry.changeFromBirthPercent !== null) {
              points.push({
                x: xVal,
                xLabel,
                y: Number(entry.changeFromBirthPercent.toFixed(1)),
                tooltip: `${p.code} (${p.name}): ${entry.changeFromBirthPercent >= 0 ? '+' : ''}${this.formatNum(entry.changeFromBirthPercent, 1)}% (${this.formatNum(entry.weightG)} גרם)`
              });
            }
          } else {
            points.push({
              x: xVal,
              xLabel,
              y: entry.weightG,
              tooltip: `${p.code} (${p.name}): ${this.formatNum(entry.weightG)} גרם (${xLabel})`
            });
          }
        });

        if (points.length > 0) {
          seriesList.push({
            name: `${p.code} · ${p.name} (${p.ribbonColorName || 'ללא סרט'})`,
            color: lineColor,
            points
          });
        }
      });
    }

    if (seriesList.length === 0) {
      container.innerHTML = `
        <div style="padding: 32px; text-align: center; color: var(--text-muted);">
          אין עדיין מספיק נתוני שקילות להצגת הגרף שנבחר.
        </div>
      `;
      if (legendEl) legendEl.innerHTML = '';
      return;
    }

    const allPoints = seriesList.flatMap(s => s.points);
    let minX = Math.min(...allPoints.map(pt => pt.x));
    let maxX = Math.max(...allPoints.map(pt => pt.x));
    if (minX === maxX) {
      minX = Math.max(0, minX - 1);
      maxX = maxX + 1;
    }

    let minY = Math.min(...allPoints.map(pt => pt.y));
    let maxY = Math.max(...allPoints.map(pt => pt.y));
    if (mode === 'pct_from_birth') {
      minY = Math.min(minY, -10);
      maxY = Math.max(maxY, 20);
    } else {
      minY = Math.max(0, Math.floor(minY * 0.9));
      maxY = Math.ceil(maxY * 1.08);
    }
    if (minY === maxY) {
      minY -= 10;
      maxY += 10;
    }

    const width = 760;
    const height = 300;
    const padLeft = 64;
    const padRight = 28;
    const padTop = 24;
    const padBottom = 42;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    const toSvgX = (x) => padLeft + ((x - minX) / (maxX - minX)) * plotW;
    const toSvgY = (y) => padTop + plotH - ((y - minY) / (maxY - minY)) * plotH;

    const yTicks = 5;
    let gridLinesHtml = '';
    const unitSuffix = mode === 'pct_from_birth' ? '%' : ' ג׳';

    for (let i = 0; i <= yTicks; i++) {
      const val = minY + ((maxY - minY) / yTicks) * i;
      const sy = toSvgY(val);
      gridLinesHtml += `
        <line x1="${padLeft}" y1="${sy}" x2="${width - padRight}" y2="${sy}" stroke="#cbd5e1" stroke-dasharray="4 4" stroke-width="1" opacity="0.6" />
        <text x="${padLeft - 8}" y="${sy + 4}" text-anchor="end" font-size="11" fill="#64748b" font-family="sans-serif">${this.formatNum(val, 0)}${unitSuffix}</text>
      `;
    }

    if (mode === 'pct_from_birth' && minY < 0 && maxY > 0) {
      const zeroY = toSvgY(0);
      gridLinesHtml += `
        <line x1="${padLeft}" y1="${zeroY}" x2="${width - padRight}" y2="${zeroY}" stroke="#ef4444" stroke-width="1.5" opacity="0.7" />
      `;
    }

    const xTicks = Math.min(6, Math.max(2, Math.ceil(maxX - minX)));
    for (let i = 0; i <= xTicks; i++) {
      const val = minX + ((maxX - minX) / xTicks) * i;
      const sx = toSvgX(val);
      gridLinesHtml += `
        <text x="${sx}" y="${height - 12}" text-anchor="middle" font-size="11" fill="#64748b" font-family="sans-serif">יום ${this.formatNum(val, 1)}</text>
      `;
    }

    let pathsHtml = '';
    seriesList.forEach(s => {
      if (s.points.length > 1) {
        const d = s.points
          .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${toSvgX(pt.x).toFixed(1)} ${toSvgY(pt.y).toFixed(1)}`)
          .join(' ');
        pathsHtml += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />`;
      }
      s.points.forEach(pt => {
        const cx = toSvgX(pt.x).toFixed(1);
        const cy = toSvgY(pt.y).toFixed(1);
        pathsHtml += `
          <g>
            <circle cx="${cx}" cy="${cy}" r="5.5" fill="${s.color}" stroke="#ffffff" stroke-width="2">
              <title>${pt.tooltip}</title>
            </circle>
          </g>
        `;
      });
    });

    container.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: auto; min-width: 520px; display: block; direction: ltr;">
        ${gridLinesHtml}
        ${pathsHtml}
      </svg>
    `;

    if (legendEl) {
      legendEl.innerHTML = seriesList.map(s => `
        <span class="legend-item">
          <span class="ribbon-dot" style="background-color: ${s.color};"></span>
          <span>${s.name}</span>
        </span>
      `).join('');
    }
  },

  // גרף מעקב טמפרטורה סביבתית באזור הגורים (סעיפים 8 ו-9 במסמך האפיון)
  renderEnvironmentChart(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const logs = (window.HeidiStore.state.environmentLogs || [])
      .slice()
      .sort((a, b) => new Date(a.eventAt).getTime() - new Date(b.eventAt).getTime());

    if (logs.length === 0) {
      container.innerHTML = `
        <div style="padding: 22px; text-align: center; color: var(--text-muted);">
          טרם הוזנו מדידות טמפרטורה באזור הגורים. הוסיפי מדידה כדי לראות את מגמת הטמפרטורה לאורך זמן.
        </div>
      `;
      return;
    }

    const points = logs.map((l, idx) => ({
      x: idx,
      y: Number(l.tempC),
      label: l.eventAt ? l.eventAt.slice(5, 16).replace('T', ' ') : `#${idx + 1}`,
      tooltip: `${l.tempC}°C ${l.humidityPct !== null ? `(לחות ${l.humidityPct}%)` : ''} · ${l.eventAt}`
    }));

    let minY = Math.min(...points.map(p => p.y), 24);
    let maxY = Math.max(...points.map(p => p.y), 34);
    minY = Math.floor(minY - 2);
    maxY = Math.ceil(maxY + 2);

    const width = 720;
    const height = 220;
    const padLeft = 58;
    const padRight = 24;
    const padTop = 20;
    const padBottom = 36;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    const maxX = Math.max(1, points.length - 1);
    const toSvgX = (x) => padLeft + (x / maxX) * plotW;
    const toSvgY = (y) => padTop + plotH - ((y - minY) / (maxY - minY)) * plotH;

    let gridHtml = '';
    const yTicks = 4;
    for (let i = 0; i <= yTicks; i++) {
      const val = minY + ((maxY - minY) / yTicks) * i;
      const sy = toSvgY(val);
      gridHtml += `
        <line x1="${padLeft}" y1="${sy}" x2="${width - padRight}" y2="${sy}" stroke="#cbd5e1" stroke-dasharray="4 4" stroke-width="1" opacity="0.6" />
        <text x="${padLeft - 8}" y="${sy + 4}" text-anchor="end" font-size="11" fill="#64748b" font-family="sans-serif">${this.formatNum(val, 0)}°C</text>
      `;
    }

    let pathHtml = '';
    if (points.length > 1) {
      const d = points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${toSvgX(pt.x).toFixed(1)} ${toSvgY(pt.y).toFixed(1)}`).join(' ');
      pathHtml += `<path d="${d}" fill="none" stroke="#f59e0b" stroke-width="3" stroke-linecap="round" />`;
    }
    points.forEach(pt => {
      pathHtml += `
        <circle cx="${toSvgX(pt.x).toFixed(1)}" cy="${toSvgY(pt.y).toFixed(1)}" r="5.5" fill="#f59e0b" stroke="#ffffff" stroke-width="2">
          <title>${pt.tooltip}</title>
        </circle>
      `;
    });

    container.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: auto; min-width: 480px; display: block; direction: ltr;">
        ${gridHtml}
        ${pathHtml}
      </svg>
    `;
  }
};

window.HeidiCharts = HeidiCharts;
