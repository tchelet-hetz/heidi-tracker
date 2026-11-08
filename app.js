/* ==========================================================================
   Heidi Whelping & Puppy Growth Tracker — Main UI Controller (app.js)
   שלבים א' + ב' + ג' מלאים: לוח בקרה, המלטה, גורים (שקילות, הנקה, בריאות, אבני דרך),
   מעקב יומי אחר היידי, צ'קליסט ציוד, מעקב טמפרטורת סביבה ויומן עם חיפוש וסינון
   ========================================================================== */

const HeidiApp = {
  activeTab: 'dashboard',
  tableSortField: 'code',
  tableSortAsc: true,
  chartMode: 'weight_all',
  chartSelectedPuppy: 'all',
  weightFilterPuppy: 'all',
  selectedPuppyDetailId: null,
  puppyDetailSubTab: 'weights', // 'weights' | 'feeding' | 'health' | 'milestones'
  tasksSubTab: 'checklist',     // 'checklist' | 'environment' | 'milestones' | 'journal'
  journalSearchQuery: '',
  journalFilterType: 'all',
  liveTimerInterval: null,

  init() {
    const store = window.HeidiStore;
    if (store.state.meta.darkMode) {
      document.body.classList.add('dark-mode');
    }
    this.renderVetEmergencyStrip();
    this.switchTab('dashboard');
    store.updateSaveIndicator(true);

    this.liveTimerInterval = setInterval(() => {
      if (this.activeTab === 'whelping') {
        this.updateWhelpingClocksOnly();
      }
    }, 30000);
  },

  toggleDarkMode() {
    const store = window.HeidiStore;
    store.state.meta.darkMode = !store.state.meta.darkMode;
    document.body.classList.toggle('dark-mode', store.state.meta.darkMode);
    store.save();
    const btn = document.getElementById('darkModeToggleBtn');
    if (btn) {
      btn.textContent = store.state.meta.darkMode ? '☀️ מצב יום' : '🌙 מצב לילה';
    }
  },

  formatNum(n, decimals = 0) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    return Number(n).toLocaleString('he-IL', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  },

  formatDateTimeIL(isoStr) {
    if (!isoStr) return 'לא הוזן';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
  },

  nowLocalInputValue() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  },

  renderVetEmergencyStrip() {
    const strip = document.getElementById('vetEmergencyStrip');
    if (!strip) return;
    const vc = window.HeidiStore.state.vetContact;
    const hasVet = vc.vetPhone || vc.emergencyClinicPhone;

    if (!hasVet) {
      strip.className = 'vet-emergency-strip';
      strip.innerHTML = `
        <div class="vet-strip-inner">
          <div>
            <strong>⚠️ יש להזין פרטי וטרינר ומרפאת חירום:</strong>
            <span>המערכת היא כלי תיעוד בלבד ואינה תחליף לווטרינר.</span>
          </div>
          <button class="btn btn-sm btn-primary" onclick="HeidiApp.openVetContactModal()">
            ➕ הזנת טלפון וטרינר וחירום
          </button>
        </div>
      `;
    } else {
      strip.className = 'vet-emergency-strip configured';
      strip.innerHTML = `
        <div class="vet-strip-inner">
          <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
            <span><strong>🩺 וטרינר/ית:</strong> ${vc.vetName || 'הוגדר'}</span>
            ${vc.vetPhone ? `<a href="tel:${vc.vetPhone}" class="vet-call-btn secondary">📞 חיוג לווטרינר (${vc.vetPhone})</a>` : ''}
            ${vc.emergencyClinicPhone ? `<a href="tel:${vc.emergencyClinicPhone}" class="vet-call-btn">🚨 מרפאת חירום (${vc.emergencyClinicName ? vc.emergencyClinicName + ' · ' : ''}${vc.emergencyClinicPhone})</a>` : ''}
          </div>
          <button class="btn btn-sm btn-secondary" onclick="HeidiApp.openVetContactModal()">
            ✏️ עריכת פרטי חירום
          </button>
        </div>
      `;
    }
  },

  switchTab(tabId) {
    this.activeTab = tabId;
    document.querySelectorAll('.nav-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    const mainEl = document.getElementById('mainViewContainer');
    if (!mainEl) return;

    if (tabId === 'dashboard') {
      this.renderDashboard(mainEl);
    } else if (tabId === 'whelping') {
      this.renderWhelpingView(mainEl);
    } else if (tabId === 'puppies') {
      this.renderPuppiesView(mainEl);
    } else if (tabId === 'weights') {
      this.renderWeightsAndChartsView(mainEl);
    } else if (tabId === 'dam') {
      this.renderDamView(mainEl);
    } else if (tabId === 'tasks') {
      this.renderTasksAndJournalView(mainEl);
    } else if (tabId === 'knowledge') {
      this.renderKnowledgeView(mainEl);
    } else if (tabId === 'settings') {
      this.renderSettingsView(mainEl);
    }
  },

  getBirthCounterInfo() {
    const store = window.HeidiStore;
    const actualBirth = store.state.litter.actualBirthDate;
    if (actualBirth) {
      const birthMs = new Date(actualBirth).getTime();
      const nowMs = Date.now();
      if (birthMs <= nowMs) {
        const diffDays = Math.max(0, Math.floor((nowMs - birthMs) / (1000 * 60 * 60 * 24)));
        return {
          title: `יום ${diffDays} מאז ההמלטה`,
          subtitle: `תאריך המלטה מתועד: ${actualBirth.split('-').reverse().join('.')}`
        };
      }
    }
    return {
      title: 'לפני המלטה (היריון פעיל)',
      subtitle: 'חלון משוער: רביעי עד שבת השבוע (11.11.2026 עד 14.11.2026)'
    };
  },

  // ========================================================================
  // 1. לוח בקרה (Dashboard)
  // ========================================================================
  renderDashboard(container) {
    const store = window.HeidiStore;
    const puppies = store.state.puppies;
    const activePuppies = puppies.filter(p => p.status !== 'homed');
    const summaries = puppies.map(p => store.getPuppySummary(p.id)).filter(Boolean);

    const notWeighedToday = summaries.filter(s => s.puppy.status !== 'homed' && !s.weighedToday);
    const vetAlerts = summaries.filter(s => s.hasVetAlert || s.puppy.status === 'vet_care');
    const birthInfo = this.getBirthCounterInfo();
    const pendingTasks = store.state.tasks.filter(t => t.status !== 'done');
    const recentLaborEvents = store.state.laborEvents
      .slice()
      .sort((a, b) => new Date(b.eventAt).getTime() - new Date(a.eventAt).getTime())
      .slice(0, 4);

    container.innerHTML = `
      <div class="heidi-hero-card">
        <div class="heidi-hero-left">
          <div class="heidi-hero-photo-wrap" onclick="HeidiApp.openPhotoLightbox('heidi.jpg')" title="לחצי להגדלת התמונה המלאה של היידי">
            <img src="heidi_icon.jpg" alt="היידי הלברדורית" class="heidi-hero-photo" />
            <span class="heidi-hero-badge">Dog of Honor 🐾</span>
          </div>
          <div>
            <h2 class="card-title" style="font-size: 1.38rem; margin-bottom: 4px;">🐾 שלום למשפחה של היידי — לוח הבקרה של היידי והגורים</h2>
            <p style="font-size: 0.92rem; color: var(--text-secondary); font-weight: 600;">
              מערכת תיעוד למשפחה של היידי · לברדור רטריבר (בת כ-3 שנים · לידה ראשונה) · שמירה אוטומטית במכשיר
            </p>
            <p style="font-size: 0.82rem; color: var(--primary-dark); font-weight: 700; margin-top: 3px;">
              💡 לחצו על התמונה של היידי להגדלה למסך מלא
            </p>
          </div>
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn btn-primary" onclick="HeidiApp.switchTab('whelping')">
            ⏱️ מסך ההמלטה (זמן אמת)
          </button>
          <button class="btn btn-secondary" onclick="HeidiApp.openWeightModal()">
            ⚖️ שקילה חדשה
          </button>
          <button class="btn btn-secondary" onclick="HeidiApp.openBatchWeightModal()">
            📋 שקילה קבוצתית
          </button>
          <button class="btn btn-secondary" onclick="HeidiApp.openFeedingModal()">
            🍼 תיעוד הנקה/האכלה
          </button>
          <button class="btn btn-secondary" onclick="HeidiApp.openPuppyModal()">
            🐶 הוספת גור
          </button>
        </div>
      </div>

      <div class="grid-stats">
        <div class="stat-box">
          <span class="stat-label">מצב ההמלטה / גיל השגר</span>
          <span class="stat-value" style="font-size: 1.25rem;">${birthInfo.title}</span>
          <span class="stat-sub">${birthInfo.subtitle}</span>
        </div>
        <div class="stat-box">
          <span class="stat-label">גורים פעילים במעקב</span>
          <span class="stat-value">${this.formatNum(activePuppies.length)} <span style="font-size:0.9rem; font-weight:600; color:var(--text-muted);">(מתוך ${this.formatNum(puppies.length)} סה"כ)</span></span>
          <span class="stat-sub">${puppies.length === 0 ? 'באולטרסאונד (11.10) נצפו כ-6 שקים' : 'לכל גור מזהה קבוע וסרט זיהוי'}</span>
        </div>
        <div class="stat-box">
          <span class="stat-label">טרם נשקלו היום</span>
          <span class="stat-value" style="color: ${notWeighedToday.length > 0 ? 'var(--amber-text)' : 'var(--primary)'};">
            ${puppies.length === 0 ? '—' : (notWeighedToday.length === 0 ? '0 (כולם נשקלו ✓)' : `${this.formatNum(notWeighedToday.length)} גורים`)}
          </span>
          <span class="stat-sub">
            ${notWeighedToday.length > 0 ? notWeighedToday.map(s => `${s.puppy.code} (${s.puppy.ribbonColorName})`).join(' · ') : 'מעקב שקילה יומי תקין'}
          </span>
        </div>
        <div class="stat-box">
          <span class="stat-label">דורשים בדיקה / שיחת וטרינר</span>
          <span class="stat-value" style="color: ${vetAlerts.length > 0 ? 'var(--danger)' : 'var(--primary)'};">
            ${this.formatNum(vetAlerts.length)}
          </span>
          <span class="stat-sub">${vetAlerts.length > 0 ? 'ראי התראות מפורטות למטה' : 'אין התראות משקל חריגות כרגע'}</span>
        </div>
      </div>

      ${vetAlerts.length > 0 ? `
        <div class="card" style="border-color: var(--danger-border);">
          <div class="card-header">
            <h3 class="card-title" style="color: var(--danger);">🚨 גורים הדורשים התייעצות / בדיקת וטרינר</h3>
          </div>
          ${vetAlerts.map(s => `
            <div class="alert-box alert-danger">
              <div>
                <strong>${s.puppy.code} · ${s.puppy.name} (סרט: ${s.puppy.ribbonColorName}):</strong>
                <span>${s.vetAlertText || 'מוגדר בסטטוס טיפול וטרינרי'}</span>
                <div style="font-size: 0.8rem; margin-top: 4px; opacity: 0.9;">
                  הבהרה: התראה זו אינה אבחנה רפואית. יש לבדוק גם יניקה, חום, חיוניות ומצב האם וליצור קשר עם הווטרינר/ית.
                </div>
              </div>
              <button class="btn btn-sm btn-secondary" onclick="HeidiApp.openPuppyDetail('${s.puppy.id}')">לכרטיס הגור</button>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">📊 טבלת השוואת גורים ושקילות אחרונות</h3>
            <p style="font-size: 0.84rem; color: var(--text-muted);">לחצי על כותרת עמודה למיון · העמודה הראשונה מימין היא מס"ד</p>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-sm btn-secondary" onclick="HeidiApp.switchTab('weights')">📈 לכל הגרפים</button>
          </div>
        </div>
        ${this.renderComparisonTableHtml(summaries)}
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">📈 מגמת משקל השגר (לפי צבע הסרט של כל גור)</h3>
          <button class="btn btn-sm btn-secondary" onclick="HeidiApp.switchTab('weights')">תצוגת גרפים מלאה</button>
        </div>
        <div id="dashboardChartContainer" class="chart-container"></div>
        <div id="dashboardChartLegend" class="chart-legend"></div>
      </div>

      <div class="form-grid" style="grid-template-columns: repeat(auto-fit, minmax(310px, 1fr)); gap: 16px;">
        <div class="card" style="margin-bottom:0;">
          <div class="card-header">
            <h3 class="card-title">🐕 פרופיל היידי ונתוני היריון</h3>
            <button class="btn btn-sm btn-secondary" onclick="HeidiApp.switchTab('dam')">למעקב האם</button>
          </div>
          <ul style="list-style: none; font-size: 0.9rem; display: flex; flex-direction: column; gap: 8px;">
            <li><strong>גזע וצבע:</strong> ${store.state.dam.breed}, ${store.state.dam.color}</li>
            <li><strong>משקל עבר מדווח:</strong> ${store.state.dam.reportedPastWeightKg}</li>
            <li><strong>משקל עדכני:</strong> ${store.state.dam.currentWeightKg ? `${store.state.dam.currentWeightKg} ק"ג` : '<span style="color:var(--amber-text);">טרם הוזן</span>'}</li>
            <li><strong>תחילת ייחום משוערת:</strong> 02.09.2026 · <strong>הזרעות (מרטי):</strong> 14.09.2026, 15.09.2026</li>
            <li><strong>אולטרסאונד (11.10.2026):</strong> ${store.state.pregnancy.ultrasoundResult}</li>
            <li><strong>חלון המלטה משוער:</strong> ${store.state.pregnancy.estimatedWhelpingWindow}</li>
            <li><strong>תאריך המלטה מאושר וטרינרית:</strong> ${store.state.pregnancy.vetConfirmedDueDate || '<span style="color:var(--amber-text);">טרם הוזן אישור וטרינר</span>'}</li>
          </ul>
        </div>

        <div class="card" style="margin-bottom:0;">
          <div class="card-header">
            <h3 class="card-title">⏱️ אירועים אחרונים בהמלטה</h3>
            <button class="btn btn-sm btn-primary" onclick="HeidiApp.switchTab('whelping')">למסך ההמלטה</button>
          </div>
          ${recentLaborEvents.length === 0 ? `
            <p style="font-size:0.88rem; color:var(--text-muted); padding:10px 0;">
              טרם תועדו אירועי המלטה. בזמן אמת לחצי על לשונית <strong>"⏱️ ההמלטה"</strong> לתיעוד שלב ראשון, לחיצות, לידת גורים ושליות בלחיצה אחת.
            </p>
          ` : `
            <div style="display:flex; flex-direction:column; gap:8px;">
              ${recentLaborEvents.map(ev => {
                const tInfo = window.LABOR_EVENT_TYPES[ev.eventType] || { label: ev.eventType, icon: '📌' };
                return `
                  <div style="padding:8px 10px; border-radius:8px; background:var(--surface-muted); border:1px solid var(--border-color); font-size:0.86rem;">
                    <strong>${tInfo.icon} ${tInfo.label}</strong> · <span style="color:var(--text-muted);">${this.formatDateTimeIL(ev.eventAt)}</span>
                    ${ev.description ? `<div style="margin-top:2px;">${ev.description}</div>` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

        <div class="card" style="margin-bottom:0;">
          <div class="card-header">
            <h3 class="card-title">✅ צ'קליסט הכנה ומשימות (${this.formatNum(pendingTasks.length)} פתוחות)</h3>
            <button class="btn btn-sm btn-secondary" onclick="HeidiApp.switchTab('tasks')">לצ'קליסט המלא</button>
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px; max-height: 230px; overflow-y: auto;">
            ${store.state.tasks.slice(0, 6).map(t => `
              <label style="display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:8px; background:var(--surface-muted); border:1px solid var(--border-color); cursor:pointer; font-size:0.86rem;">
                <input type="checkbox" ${t.status === 'done' ? 'checked' : ''} onchange="HeidiApp.toggleTaskQuick('${t.id}')" style="width:18px; height:18px; accent-color:var(--primary);" />
                <span style="${t.status === 'done' ? 'text-decoration:line-through; color:var(--text-muted);' : 'font-weight:600;'}">
                  ${t.title}
                </span>
              </label>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    this.bindTableScrollSync('dashScrollTop', 'dashScrollBottom');
    window.HeidiCharts.renderGrowthChart('dashboardChartContainer', 'dashboardChartLegend', 'weight_all', 'all');
  },

  toggleTaskQuick(taskId) {
    const store = window.HeidiStore;
    const t = store.state.tasks.find(x => x.id === taskId);
    if (!t) return;
    t.status = t.status === 'done' ? 'not_started' : 'done';
    t.updatedAt = new Date().toISOString();
    store.save();
    this.switchTab(this.activeTab);
  },

  // ========================================================================
  // 2. שלב ב': מודול ההמלטה בזמן אמת (Whelping Live View)
  // ========================================================================
  updateWhelpingClocksOnly() {
    const stats = window.HeidiStore.getWhelpingLiveStats();
    const elStage1 = document.getElementById('clock_stage1');
    const elContractions = document.getElementById('clock_contractions');
    const elLastPup = document.getElementById('clock_last_puppy');
    if (elStage1) elStage1.textContent = stats.elapsedSinceStage1 || 'טרם התחיל';
    if (elContractions) elContractions.textContent = stats.elapsedSinceContractions || 'טרם תועד';
    if (elLastPup) elLastPup.textContent = stats.elapsedSinceLastPuppy || 'טרם נולד גור';
  },

  renderWhelpingView(container) {
    const store = window.HeidiStore;
    const vc = store.state.vetContact;
    const dam = store.state.dam;
    const litter = store.state.litter;
    const stats = store.getWhelpingLiveStats();
    const eventsDesc = store.state.laborEvents
      .slice()
      .sort((a, b) => new Date(b.eventAt).getTime() - new Date(a.eventAt).getTime());

    const ascEvents = store.state.laborEvents
      .slice()
      .sort((a, b) => new Date(a.eventAt).getTime() - new Date(b.eventAt).getTime());
    const intervalMap = new Map();
    let prevPupBornTime = null;
    ascEvents.forEach(ev => {
      if (ev.eventType === 'puppy_born') {
        const curMs = new Date(ev.eventAt).getTime();
        if (prevPupBornTime && !isNaN(curMs)) {
          const diffMin = Math.max(0, Math.round((curMs - prevPupBornTime) / 60000));
          intervalMap.set(ev.id, `${diffMin} דקות מהגור הקודם`);
        }
        prevPupBornTime = curMs;
      }
    });

    container.innerHTML = `
      <div class="emergency-red-card">
        <div class="emergency-red-header">
          <div class="emergency-red-title">
            <span>🚨 סימנים המחייבים פנייה דחופה לווטרינר/ית (כרטיס חירום קבוע)</span>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            ${vc.vetPhone
              ? `<a href="tel:${vc.vetPhone}" class="vet-call-btn secondary">📞 חיוג לווטרינר: ${vc.vetName || ''} (${vc.vetPhone})</a>`
              : `<button class="btn btn-sm btn-primary" onclick="HeidiApp.switchTab('settings')">➕ יש להזין טלפון וטרינר</button>`
            }
            ${vc.emergencyClinicPhone
              ? `<a href="tel:${vc.emergencyClinicPhone}" class="vet-call-btn">🚑 מרפאת חירום: ${vc.emergencyClinicName || ''} (${vc.emergencyClinicPhone})</a>`
              : `<button class="btn btn-sm btn-secondary" onclick="HeidiApp.switchTab('settings')">➕ הזנת מרפאת חירום</button>`
            }
          </div>
        </div>

        <ul class="emergency-red-list">
          <li>לחיצות חזקות ומתמשכות ללא יציאת גור.</li>
          <li>גור או שק מי שפיר שנראה תקוע בתעלת הלידה.</li>
          <li>הפרשה ירוקה לפני גור ראשון או הפרשה חריגה שמדאיגה את המלווה.</li>
          <li>דימום טרי משמעותי או דימום מתמשך.</li>
          <li>חולשה קיצונית, התמוטטות, כאב חריג או מצוקה של היידי.</li>
          <li>הפסקה ממושכת בין גורים כאשר ידוע או יש חשד שנותרו גורים ברחם.</li>
          <li>כל מצב שהווטרינר/ית הגדיר/ה מראש כמצב חירום.</li>
        </ul>

        ${dam.vetInstructions ? `
          <div style="margin-top:10px; padding:8px 12px; background:rgba(255,255,255,0.65); border-radius:8px; font-size:0.86rem; color:#7f1d1d;">
            <strong>🩺 הנחיות וספי זמן שסוכמו עם הווטרינר/ית של היידי:</strong> ${dam.vetInstructions}
          </div>
        ` : ''}

        <div style="margin-top:10px; font-size:0.82rem; opacity:0.95; border-top:1px dashed var(--danger-border); padding-top:8px;">
          <strong>⚠️ הוראת בטיחות מחייבת:</strong> בכל ספק או חשש מתקשרים מיד לווטרינר/ית ולא ממתינים שהאפליקציה "תאשר".
          <strong>אין לתת אוקסיטוצין, סידן, תרופות או לבצע מניפולציה פנימית ללא הוראה מפורשת של וטרינר/ית.</strong>
        </div>
      </div>

      <div class="grid-stats">
        <div class="stat-box">
          <span class="stat-label">זמן מאז לידת הגור האחרון</span>
          <span class="stat-value" id="clock_last_puppy" style="color:var(--primary); font-size:1.35rem;">
            ${stats.elapsedSinceLastPuppy || 'טרם נולד גור'}
          </span>
          <span class="stat-sub">${stats.lastPuppyIso ? `נולד ב-${this.formatDateTimeIL(stats.lastPuppyIso)}` : 'יתעדכן אוטומטית עם לידת גור'}</span>
        </div>
        <div class="stat-box">
          <span class="stat-label">זמן מתחילת לחיצות אחרונות</span>
          <span class="stat-value" id="clock_contractions" style="font-size:1.35rem;">
            ${stats.elapsedSinceContractions || 'טרם תועד'}
          </span>
          <span class="stat-sub">${stats.lastContractionIso ? `תועד ב-${this.formatDateTimeIL(stats.lastContractionIso)}` : 'לחיצות בטן (שלב שני)'}</span>
        </div>
        <div class="stat-box">
          <span class="stat-label">זמן מתחילת שלב ראשון</span>
          <span class="stat-value" id="clock_stage1" style="font-size:1.35rem;">
            ${stats.elapsedSinceStage1 || 'טרם התחיל'}
          </span>
          <span class="stat-sub">${stats.stage1StartIso ? `התחלה: ${this.formatDateTimeIL(stats.stage1StartIso)}` : 'פתיחת צוואר הרחם והכנה'}</span>
        </div>
        <div class="stat-box">
          <span class="stat-label">גורים שנולדו מול שליות שנצפו</span>
          <span class="stat-value" style="font-size:1.35rem;">
            ${this.formatNum(stats.puppiesBornCount)} גורים · ${this.formatNum(stats.totalObservedPlacentas)} שליות
          </span>
          <span class="stat-sub">הערה: לעיתים האם אוכלת שליה בלי שנצפתה</span>
        </div>
      </div>

      <div class="card">
        <div class="card-header" style="margin-bottom:6px;">
          <div>
            <h2 class="card-title">⏱️ תיעוד מהיר בזמן ההמלטה (בלחיצה אחת)</h2>
            <p style="font-size:0.86rem; color:var(--text-muted);">
              לחצי על האירוע המתאים — ניתן לתעד בזמן אמת או להזין שעה מדויקת בדיעבד
            </p>
          </div>
        </div>

        <div class="whelping-action-grid">
          <button class="whelping-big-btn btn-puppy-born" onclick="HeidiApp.openBornPuppyModal()">
            <span class="btn-icon">🐶</span>
            <span class="btn-title">נולד גור!</span>
            <span class="btn-sub">יוצר אוטומטית כרטיס גור + סרט</span>
          </button>

          <button class="whelping-big-btn btn-contractions" onclick="HeidiApp.openLaborEventModal('contractions_start')">
            <span class="btn-icon">⚡</span>
            <span class="btn-title">תחילת לחיצות</span>
            <span class="btn-sub">התכווצויות בטן (שלב 2)</span>
          </button>

          <button class="whelping-big-btn btn-placenta" onclick="HeidiApp.openLaborEventModal('placenta_delivered')">
            <span class="btn-icon">🟣</span>
            <span class="btn-title">יצאה שליה</span>
            <span class="btn-sub">תיעוד יציאת שליה בנפרד</span>
          </button>

          <button class="whelping-big-btn" onclick="HeidiApp.openLaborEventModal('stage1_start')">
            <span class="btn-icon">🟢</span>
            <span class="btn-title">התחלת שלב ראשון</span>
            <span class="btn-sub">קינון, חוסר מנוחה, רעד</span>
          </button>

          <button class="whelping-big-btn" onclick="HeidiApp.openLaborEventModal('rest_break')">
            <span class="btn-icon">🛋️</span>
            <span class="btn-title">הפסקה / מנוחה</span>
            <span class="btn-sub">מנוחה של היידי בין גורים</span>
          </button>

          <button class="whelping-big-btn btn-vet-call" onclick="HeidiApp.openLaborEventModal('vet_contact')">
            <span class="btn-icon">📞</span>
            <span class="btn-title">התקשרות לווטרינר</span>
            <span class="btn-sub">תיעוד שיחה והנחיות</span>
          </button>

          <button class="whelping-big-btn" onclick="HeidiApp.openLaborEventModal('free_note')">
            <span class="btn-icon">📝</span>
            <span class="btn-title">הערה חופשית</span>
            <span class="btn-sub">תיעוד כל תצפית או שינוי</span>
          </button>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">📜 ציר זמן ויומן אירועי ההמלטה (${this.formatNum(eventsDesc.length)} אירועים)</h3>
            <p style="font-size:0.83rem; color:var(--text-muted);">
              כל אירוע שומר את שעת האירוע בפועל ואת מועד הזנתו · ניתן לערוך ולהשלים פרטים בדיעבד
            </p>
          </div>
          <button class="btn btn-sm btn-secondary" onclick="HeidiApp.openLaborEventModal('free_note')">➕ הוספת אירוע בדיעבד</button>
        </div>

        ${eventsDesc.length === 0 ? `
          <div style="padding:28px; text-align:center; background:var(--surface-muted); border-radius:var(--radius-sm); color:var(--text-muted);">
            עדיין לא נרשמו אירועים בהמלטה. השתמשי בכפתורים הגדולים למעלה לתחילת התיעוד.
          </div>
        ` : `
          <div class="timeline-list">
            ${eventsDesc.map((ev, idx) => {
              const tInfo = window.LABOR_EVENT_TYPES[ev.eventType] || { label: ev.eventType, icon: '📌' };
              const intervalBadge = intervalMap.get(ev.id);
              const num = eventsDesc.length - idx;
              return `
                <div class="timeline-item type-${ev.eventType}">
                  <div style="flex:1; min-width:240px;">
                    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                      <span class="puppy-id-badge">#${num}</span>
                      <strong style="font-size:1.02rem; font-family:var(--font-heading);">${tInfo.icon} ${tInfo.label}</strong>
                      <span style="font-weight:700; color:var(--primary-dark);">${this.formatDateTimeIL(ev.eventAt)}</span>
                      ${intervalBadge ? `<span class="status-badge status-with_dam">⏱️ ${intervalBadge}</span>` : ''}
                      ${ev.interventionRequired ? `<span class="status-badge status-vet_care">⚠️ נדרשה התערבות/סיוע</span>` : ''}
                      ${ev.relatedPuppyCode ? `<span class="puppy-id-badge" style="background:var(--primary-light);">${ev.relatedPuppyCode}</span>` : ''}
                    </div>
                    ${ev.description ? `<div style="margin-top:6px; font-size:0.93rem;">${ev.description}</div>` : ''}
                    ${ev.interventionDetails ? `<div style="margin-top:4px; font-size:0.85rem; color:var(--danger-text);"><strong>פירוט התערבות/סיוע:</strong> ${ev.interventionDetails}</div>` : ''}
                    <div style="margin-top:6px; font-size:0.76rem; color:var(--text-muted);">
                      תועד ע"י: ${ev.recordedBy || 'תכלת'} · חותמת הזנה: ${this.formatDateTimeIL(ev.createdAt)}
                      ${ev.editHistory && ev.editHistory.length > 0 ? ` · נערך (${ev.editHistory.length})` : ''}
                    </div>
                  </div>
                  <div style="display:flex; align-items:center; gap:6px;">
                    ${ev.photoDataUrl ? `<img src="${ev.photoDataUrl}" style="width:48px; height:48px; object-fit:cover; border-radius:8px; border:1px solid var(--border-color);" />` : ''}
                    ${ev.relatedPuppyId ? `<button class="btn btn-sm btn-secondary" onclick="HeidiApp.openPuppyDetail('${ev.relatedPuppyId}')">כרטיס גור</button>` : ''}
                    <button class="btn btn-sm btn-secondary" onclick="HeidiApp.openLaborEventModal('${ev.eventType}', '${ev.id}')" title="עריכת אירוע">✏️</button>
                    <button class="btn btn-sm btn-danger" onclick="HeidiApp.confirmDeleteLaborEvent('${ev.id}')" title="מחיקת אירוע">🗑️</button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">📋 סיכום ההמלטה ובדיקת אם בסיום</h3>
            <p style="font-size:0.84rem; color:var(--text-muted);">
              למילוי במהלך או בסיום ההמלטה · הווטרינר/ית צריך/ה לוודא לאחר ההמלטה שכל הגורים נולדו ושמצב היידי תקין
            </p>
          </div>
          <button type="button" class="btn btn-sm btn-secondary" onclick="HeidiApp.printWhelpingSummaryReport()">
            🖨️ הדפסת / שמירת PDF סיכום המלטה
          </button>
        </div>

        <form onsubmit="HeidiApp.saveLitterSummaryForm(event)">
          <div class="form-grid">
            <div class="form-group">
              <label>שעת תחילת ההמלטה</label>
              <input type="datetime-local" id="sum_startTime" class="form-control" value="${litter.laborStartTime ? litter.laborStartTime.slice(0, 16) : ''}" />
            </div>
            <div class="form-group">
              <label>שעת סיום ההמלטה</label>
              <input type="datetime-local" id="sum_endTime" class="form-control" value="${litter.laborEndTime ? litter.laborEndTime.slice(0, 16) : ''}" />
            </div>
            <div class="form-group">
              <label>מספר גורים חיים</label>
              <input type="number" min="0" id="sum_liveBorn" class="form-control" value="${litter.liveBornCount !== '' ? litter.liveBornCount : store.state.puppies.length}" />
            </div>
            <div class="form-group">
              <label>מספר גורים שנולדו ללא רוח חיים (אם חלילה)</label>
              <input type="number" min="0" id="sum_stillborn" class="form-control" value="${litter.stillbornCount !== '' ? litter.stillbornCount : 0}" />
            </div>
            <div class="form-group">
              <label>מספר שליות שנצפו סה"כ</label>
              <input type="number" min="0" id="sum_placentas" class="form-control" value="${litter.placentasObservedCount !== '' ? litter.placentasObservedCount : stats.totalObservedPlacentas}" />
            </div>
            <div class="form-group">
              <label>האם נדרשה התערבות וטרינרית?</label>
              <select id="sum_vetIntervention" class="form-control">
                <option value="" ${!litter.vetInterventionRequired ? 'selected' : ''}>לא הוזן עדיין</option>
                <option value="לא נדרשה" ${litter.vetInterventionRequired === 'לא נדרשה' ? 'selected' : ''}>לא נדרשה (המלטה תקינה)</option>
                <option value="ייעוץ טלפוני בלבד" ${litter.vetInterventionRequired === 'ייעוץ טלפוני בלבד' ? 'selected' : ''}>ייעוץ טלפוני בלבד</option>
                <option value="כן — התערבות פיזית / רפואית" ${litter.vetInterventionRequired === 'כן — התערבות פיזית / רפואית' ? 'selected' : ''}>כן — התערבות פיזית / רפואית</option>
              </select>
            </div>
            <div class="form-group">
              <label>האם בוצע אימות וטרינרי שלא נותרו גורים ברחם?</label>
              <select id="sum_vetVerifiedEmpty" class="form-control">
                <option value="" ${!litter.vetVerifiedEmptyUterus ? 'selected' : ''}>טרם בוצע / לא ידוע</option>
                <option value="בוצע ואושר" ${litter.vetVerifiedEmptyUterus === 'בוצע ואושר' ? 'selected' : ''}>בוצע ואושר שלא נותרו גורים</option>
                <option value="ממתין לבדיקת וטרינר" ${litter.vetVerifiedEmptyUterus === 'ממתין לבדיקת וטרינר' ? 'selected' : ''}>ממתין לבדיקת וטרינר</option>
              </select>
            </div>
            <div class="form-group">
              <label>בדיקת היידי (האם) לאחר ההמלטה</label>
              <input type="text" id="sum_damCheck" class="form-control" value="${litter.postPartumDamCheck || ''}" placeholder="מצב כללי, חום, עטינים, הפרשות..." />
            </div>
          </div>
          <div class="form-group">
            <label>הערות סיכום להמלטה</label>
            <textarea id="sum_notes" class="form-control" rows="2" placeholder="סיכום חופשי והנחיות להמשך">${litter.notes || ''}</textarea>
          </div>
          <button type="submit" class="btn btn-primary">💾 שמירת סיכום ההמלטה</button>
        </form>
      </div>
    `;
  },

  saveLitterSummaryForm(e) {
    e.preventDefault();
    const startVal = document.getElementById('sum_startTime').value;
    window.HeidiStore.updateLitterSummary({
      laborStartTime: startVal,
      actualBirthDate: startVal ? startVal.slice(0, 10) : window.HeidiStore.state.litter.actualBirthDate,
      laborEndTime: document.getElementById('sum_endTime').value,
      liveBornCount: document.getElementById('sum_liveBorn').value,
      stillbornCount: document.getElementById('sum_stillborn').value,
      placentasObservedCount: document.getElementById('sum_placentas').value,
      vetInterventionRequired: document.getElementById('sum_vetIntervention').value,
      vetVerifiedEmptyUterus: document.getElementById('sum_vetVerifiedEmpty').value,
      postPartumDamCheck: document.getElementById('sum_damCheck').value.trim(),
      notes: document.getElementById('sum_notes').value.trim()
    });
    this.renderWhelpingView(document.getElementById('mainViewContainer'));
    alert('סיכום ההמלטה נשמר בהצלחה!');
  },

  openLaborEventModal(defaultType = 'free_note', editEventId = '') {
    const store = window.HeidiStore;
    const existing = editEventId ? store.state.laborEvents.find(e => e.id === editEventId) : null;
    const evType = existing ? existing.eventType : defaultType;
    const dtVal = existing && existing.eventAt ? existing.eventAt.slice(0, 16) : this.nowLocalInputValue();
    const tInfo = window.LABOR_EVENT_TYPES[evType] || { label: 'אירוע המלטה', icon: '📌' };

    const modalBody = document.getElementById('appModalContent');
    modalBody.innerHTML = `
      <div class="card-header">
        <h3 class="card-title">${existing ? `✏️ עריכת אירוע: ${tInfo.label}` : `${tInfo.icon} תיעוד מהיר: ${tInfo.label}`}</h3>
        <button class="btn btn-sm btn-secondary" onclick="HeidiApp.closeModal()">✖ סגירה</button>
      </div>
      <form onsubmit="HeidiApp.submitLaborEventForm(event, '${editEventId}')">
        <div class="form-grid">
          <div class="form-group">
            <label>סוג האירוע</label>
            <select id="lev_type" class="form-control">
              ${Object.entries(window.LABOR_EVENT_TYPES).map(([k, v]) => `
                <option value="${k}" ${k === evType ? 'selected' : ''}>${v.icon} ${v.label}</option>
              `).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>תאריך ושעה מדויקים של האירוע</label>
            <input type="datetime-local" id="lev_eventAt" class="form-control" value="${dtVal}" required />
          </div>
        </div>

        <div class="form-group">
          <label>תיאור / הערה תצפיתית</label>
          <textarea id="lev_desc" class="form-control" rows="2" placeholder="למשל: עוצמת הלחיצות, האם השליה נאכלה ע״י היידי, מה הווטרינר הנחה...">${existing ? existing.description : ''}</textarea>
        </div>

        <div class="form-grid">
          <div class="form-group">
            <label>מי תיעד/ה?</label>
            <input type="text" id="lev_recordedBy" class="form-control" value="${existing ? existing.recordedBy : 'תכלת'}" />
          </div>
          <div class="form-group">
            <label>האם נדרשה התערבות / סיוע?</label>
            <select id="lev_intervention" class="form-control" onchange="document.getElementById('lev_interDetailsGroup').style.display = this.value === 'yes' ? 'flex' : 'none';">
              <option value="no" ${!existing || !existing.interventionRequired ? 'selected' : ''}>לא</option>
              <option value="yes" ${existing && existing.interventionRequired ? 'selected' : ''}>כן — נדרשה התערבות/סיוע</option>
            </select>
          </div>
        </div>

        <div class="form-group" id="lev_interDetailsGroup" style="display: ${existing && existing.interventionRequired ? 'flex' : 'none'};">
          <label>פירוט ההתערבות או הסיוע שבוצעו</label>
          <input type="text" id="lev_interDetails" class="form-control" value="${existing ? (existing.interventionDetails || '') : ''}" placeholder="פרטי הסיוע..." />
        </div>

        <div class="form-group">
          <label>📷 צירוף תמונה לאירוע (אופציונלי)</label>
          <input type="file" accept="image/*" class="form-control" onchange="HeidiApp.handleGenericPhotoUpload(this, 'lev_photoDataUrl', 'lev_photoPreview')" />
          <input type="hidden" id="lev_photoDataUrl" value="${existing && existing.photoDataUrl ? existing.photoDataUrl : ''}" />
          <div id="lev_photoPreview" style="margin-top:6px;">
            ${existing && existing.photoDataUrl ? `<img src="${existing.photoDataUrl}" style="width:68px; height:68px; object-fit:cover; border-radius:8px;" />` : ''}
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:12px;">
          <button type="button" class="btn btn-secondary" onclick="HeidiApp.closeModal()">ביטול</button>
          <button type="submit" class="btn btn-primary">💾 שמירת אירוע</button>
        </div>
      </form>
    `;
    document.getElementById('appModalBackdrop').classList.add('open');
  },

  submitLaborEventForm(e, editEventId) {
    e.preventDefault();
    const payload = {
      eventType: document.getElementById('lev_type').value,
      eventAt: document.getElementById('lev_eventAt').value,
      description: document.getElementById('lev_desc').value,
      recordedBy: document.getElementById('lev_recordedBy').value,
      interventionRequired: document.getElementById('lev_intervention').value === 'yes',
      interventionDetails: document.getElementById('lev_interDetails').value,
      photoDataUrl: document.getElementById('lev_photoDataUrl').value
    };

    if (editEventId) {
      window.HeidiStore.updateLaborEvent(editEventId, payload);
    } else {
      window.HeidiStore.addLaborEvent(payload);
    }
    this.closeModal();
    this.switchTab(this.activeTab);
  },

  confirmDeleteLaborEvent(eventId) {
    const ok = confirm('⚠️ האם את בטוחה שברצונך למחוק אירוע זה מיומן ההמלטה?');
    if (!ok) return;
    window.HeidiStore.deleteLaborEvent(eventId);
    this.switchTab(this.activeTab);
  },

  openBornPuppyModal() {
    const store = window.HeidiStore;
    const nextOrder = store.state.puppies.length + 1;
    const presetRibbon = window.RIBBON_PRESETS[(nextOrder - 1) % (window.RIBBON_PRESETS.length - 1)];
    const dtVal = this.nowLocalInputValue();

    const modalBody = document.getElementById('appModalContent');
    modalBody.innerHTML = `
      <div class="card-header">
        <div>
          <h3 class="card-title">🐶 מזל טוב! תיעוד לידת גור #${nextOrder}</h3>
          <p style="font-size:0.82rem; color:var(--text-muted);">
            שמירה תיצור אוטומטית כרטיס גור חדש עם מזהה קבוע, שקילת לידה ואירוע בציר הזמן של ההמלטה
          </p>
        </div>
        <button class="btn btn-sm btn-secondary" onclick="HeidiApp.closeModal()">✖ סגירה</button>
      </div>

      <form onsubmit="HeidiApp.submitBornPuppyForm(event)">
        <div class="form-group">
          <label>🎀 צבע סרט זיהוי ששמנו על הגור</label>
          <div class="ribbon-picker" id="bornRibbonPresetContainer">
            ${window.RIBBON_PRESETS.map(r => `
              <button type="button" class="ribbon-choice ${r.name === presetRibbon.name ? 'selected' : ''}"
                onclick="HeidiApp.selectBornRibbonPreset('${r.name}', '${r.hex}', this)">
                <span class="ribbon-dot" style="background-color: ${r.hex};"></span>
                <span>${r.name}</span>
              </button>
            `).join('')}
          </div>
          <div style="display:flex; gap:8px; margin-top:8px; align-items:center;">
            <input type="text" id="born_ribbonName" class="form-control" style="flex:1;" value="${presetRibbon.name}" required />
            <input type="color" id="born_ribbonHex" value="${presetRibbon.hex}" style="width:48px; height:44px; border:1px solid var(--border-strong); border-radius:8px; cursor:pointer;" />
          </div>
        </div>

        <div class="form-grid">
          <div class="form-group">
            <label>מספר/שם זמני בלידה</label>
            <input type="text" id="born_name" class="form-control" value="גור ${nextOrder}" required />
          </div>
          <div class="form-group">
            <label>תאריך ושעת לידה מדויקת</label>
            <input type="datetime-local" id="born_dt" class="form-control" value="${dtVal}" required />
          </div>
          <div class="form-group">
            <label>מין הגור</label>
            <select id="born_sex" class="form-control">
              <option value="unknown">לא ידוע עדיין</option>
              <option value="female">נקבה ♀</option>
              <option value="male">זכר ♂</option>
            </select>
          </div>
          <div class="form-group">
            <label>משקל לידה בגרמים (ג׳)</label>
            <input type="number" step="1" min="1" id="born_weightG" class="form-control" placeholder="למשל: 410 (אפשר להשלים אחרי ייבוש)" />
          </div>
          <div class="form-group">
            <label>צבע וסימנים מזהים</label>
            <input type="text" id="born_markings" class="form-control" placeholder="למשל: לבן/צהבהב, כתם בחזה" />
          </div>
          <div class="form-group">
            <label>שליה נצפתה עם הגור?</label>
            <select id="born_placenta" class="form-control">
              <option value="כן">כן — יצאה שליה</option>
              <option value="לא">לא נצפתה עדיין</option>
              <option value="לא ידוע">לא ידוע (אולי האם אכלה)</option>
            </select>
          </div>
        </div>

        <hr style="border:none; border-top:1px solid var(--border-color); margin:12px 0;" />
        <h4 style="font-size:0.95rem; margin-bottom:8px; color:var(--primary-dark);">🔍 פרטי יציאה ותצפית ראשונית בלידה (תיעוד תצפיתי בלבד — ללא ציון רפואי)</h4>

        <div class="form-grid">
          <div class="form-group">
            <label>האם נולד בתוך שק מי שפיר?</label>
            <select id="born_inSac" class="form-control">
              <option value="כן">כן (בתוך שק שלם)</option>
              <option value="לא — השק נקרע ביציאה">לא — השק נקרע ביציאה</option>
              <option value="לא ידוע">לא ידוע</option>
            </select>
          </div>
          <div class="form-group">
            <label>חבל הטבור והטיפול הראשוני בוצעו ע"י:</label>
            <select id="born_cordBy" class="form-control">
              <option value="האם (היידי)">האם (היידי)</option>
              <option value="בסיוע שלנו / מלווה">בסיוע שלנו / מלווה</option>
              <option value="משולב (היידי + סיוע)">משולב (היידי + סיוע)</option>
            </select>
          </div>
          <div class="form-group">
            <label>מצג בלידה (אם ידוע)</label>
            <select id="born_presentation" class="form-control">
              <option value="לא ידוע">לא ידוע</option>
              <option value="קדמי (ראש וכפות קדמיות)">קדמי (ראש וכפות קדמיות)</option>
              <option value="אחורי (רגליים אחוריות/זנב)">אחורי (רגליים אחוריות/זנב)</option>
            </select>
          </div>
          <div class="form-group">
            <label>האם נדרש סיוע ביציאת הגור?</label>
            <select id="born_assist" class="form-control">
              <option value="לא">לא — יצא עצמאית</option>
              <option value="סיוע קל (פתיחת שק / ייבוש)">סיוע קל (פתיחת שק / ייבוש)</option>
              <option value="כן — נדרש סיוע משמעותי">כן — נדרש סיוע משמעותי</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>תצפית ראשונית על הגור (סמני מה שנצפה בפועל):</label>
          <div class="obs-checks-grid">
            <label class="obs-check-label"><input type="checkbox" id="born_obsBreathing" checked /> נושם תקין</label>
            <label class="obs-check-label"><input type="checkbox" id="born_obsActive" checked /> פעיל וזז</label>
            <label class="obs-check-label"><input type="checkbox" id="born_obsWarm" checked /> חם למגע</label>
            <label class="obs-check-label"><input type="checkbox" id="born_obsResponsive" checked /> מגיב</label>
            <label class="obs-check-label"><input type="checkbox" id="born_obsNursing" /> כבר יונק</label>
          </div>
        </div>

        <div class="form-group">
          <label>📷 תמונה ראשונה של הגור (אופציונלי)</label>
          <input type="file" accept="image/*" class="form-control" onchange="HeidiApp.handleGenericPhotoUpload(this, 'born_photoDataUrl', 'born_photoPreview')" />
          <input type="hidden" id="born_photoDataUrl" value="" />
          <div id="born_photoPreview" style="margin-top:6px;"></div>
        </div>

        <div class="form-group">
          <label>הערות והנחיות וטרינריות ללידה זו</label>
          <textarea id="born_notes" class="form-control" rows="2" placeholder="הערות חופשיות..."></textarea>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:12px;">
          <button type="button" class="btn btn-secondary" onclick="HeidiApp.closeModal()">ביטול</button>
          <button type="submit" class="btn btn-primary">🐶 שמירת לידת הגור ופתיחת כרטיס</button>
        </div>
      </form>
    `;
    document.getElementById('appModalBackdrop').classList.add('open');
  },

  selectBornRibbonPreset(name, hex, btnEl) {
    document.getElementById('born_ribbonName').value = name;
    document.getElementById('born_ribbonHex').value = hex;
    document.querySelectorAll('#bornRibbonPresetContainer .ribbon-choice').forEach(b => b.classList.remove('selected'));
    if (btnEl) btnEl.classList.add('selected');
  },

  submitBornPuppyForm(e) {
    e.preventDefault();
    const store = window.HeidiStore;
    const name = document.getElementById('born_name').value;
    const birthDateTime = document.getElementById('born_dt').value;
    const sex = document.getElementById('born_sex').value;
    const birthWeightG = document.getElementById('born_weightG').value;
    const ribbonColorName = document.getElementById('born_ribbonName').value;
    const ribbonColorHex = document.getElementById('born_ribbonHex').value;
    const markings = document.getElementById('born_markings').value;
    const placentaObserved = document.getElementById('born_placenta').value;
    const bornInSac = document.getElementById('born_inSac').value;
    const cordHandledBy = document.getElementById('born_cordBy').value;
    const presentation = document.getElementById('born_presentation').value;
    const assistanceRequired = document.getElementById('born_assist').value;
    const obsBreathing = document.getElementById('born_obsBreathing').checked;
    const obsActive = document.getElementById('born_obsActive').checked;
    const obsWarm = document.getElementById('born_obsWarm').checked;
    const obsResponsive = document.getElementById('born_obsResponsive').checked;
    const obsNursing = document.getElementById('born_obsNursing').checked;
    const photoDataUrl = document.getElementById('born_photoDataUrl').value;
    const notes = document.getElementById('born_notes').value;

    const newPup = store.addPuppy({
      name,
      sex,
      ribbonColorName,
      ribbonColorHex,
      coatColor: markings,
      markings,
      birthDateTime,
      birthWeightG,
      presentation,
      bornInSac,
      assistanceRequired,
      obsBreathing,
      obsActive,
      obsWarm,
      obsResponsive,
      obsNursing,
      cordHandledBy,
      placentaObserved,
      photoDataUrl,
      notes,
      weighedBy: 'תכלת'
    });

    const obsSummary = [
      obsBreathing ? 'נושם' : 'לא סומן נושם',
      obsActive ? 'פעיל' : '',
      obsWarm ? 'חם' : '',
      obsResponsive ? 'מגיב' : '',
      obsNursing ? 'יונק' : ''
    ].filter(Boolean).join(', ');

    const descParts = [
      `נולד ${newPup.code} (${newPup.name}) · סרט: ${ribbonColorName} · מין: ${window.SEX_LABELS[sex]}`,
      birthWeightG ? `משקל לידה: ${birthWeightG} גרם` : 'משקל לידה טרם הוזן',
      `שליה עם הגור: ${placentaObserved}`,
      `תצפית: ${obsSummary}`,
      notes ? `הערה: ${notes}` : ''
    ].filter(Boolean).join(' | ');

    store.addLaborEvent({
      eventType: 'puppy_born',
      eventAt: birthDateTime,
      description: descParts,
      recordedBy: 'תכלת',
      interventionRequired: assistanceRequired !== 'לא',
      interventionDetails: assistanceRequired !== 'לא' ? `סיוע בלידה: ${assistanceRequired} (חבל טבור: ${cordHandledBy})` : '',
      relatedPuppyId: newPup.id,
      relatedPuppyCode: newPup.code,
      photoDataUrl
    });

    this.closeModal();
    this.switchTab(this.activeTab);
  },

  handleGenericPhotoUpload(inputEl, hiddenId, previewId) {
    const file = inputEl.files && inputEl.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 320;
        let w = img.width;
        let h = img.height;
        if (w > h && w > maxDim) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else if (h > maxDim) {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL('image/jpeg', 0.78);
        document.getElementById(hiddenId).value = compressed;
        document.getElementById(previewId).innerHTML = `<img src="${compressed}" style="width:72px; height:72px; object-fit:cover; border-radius:10px;" />`;
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  },

  // ========================================================================
  // 3. טבלת השוואת גורים (משותפת ללוח הבקרה ולמעקב משקלים)
  // ========================================================================
  sortComparisonTable(field) {
    if (this.tableSortField === field) {
      this.tableSortAsc = !this.tableSortAsc;
    } else {
      this.tableSortField = field;
      this.tableSortAsc = true;
    }
    this.switchTab(this.activeTab);
  },

  renderComparisonTableHtml(summaries) {
    if (!summaries || summaries.length === 0) {
      return `
        <div style="padding: 24px; text-align: center; background: var(--surface-muted); border-radius: var(--radius-sm); color: var(--text-muted);">
          עדיין לא נוספו גורים. לחצי על <strong>"🐶 הוספת גור"</strong> או על <strong>"🐶 נולד גור!"</strong> במסך ההמלטה כדי ליצור כרטיס גור עם מזהה קבוע וצבע סרט.
        </div>
      `;
    }

    const sorted = summaries.slice().sort((a, b) => {
      const dir = this.tableSortAsc ? 1 : -1;
      if (this.tableSortField === 'code') {
        return a.puppy.code.localeCompare(b.puppy.code) * dir;
      }
      if (this.tableSortField === 'ribbon') {
        return (a.puppy.ribbonColorName || '').localeCompare(b.puppy.ribbonColorName || '', 'he') * dir;
      }
      if (this.tableSortField === 'weight') {
        return ((a.currentWeightG || 0) - (b.currentWeightG || 0)) * dir;
      }
      if (this.tableSortField === 'deltaPct') {
        const pctA = a.latestEntry && a.latestEntry.changeFromBirthPercent !== null ? a.latestEntry.changeFromBirthPercent : -9999;
        const pctB = b.latestEntry && b.latestEntry.changeFromBirthPercent !== null ? b.latestEntry.changeFromBirthPercent : -9999;
        return (pctA - pctB) * dir;
      }
      if (this.tableSortField === 'status') {
        return (a.puppy.status || '').localeCompare(b.puppy.status || '') * dir;
      }
      return 0;
    });

    const rowsHtml = sorted.map((s, idx) => {
      const p = s.puppy;
      const latest = s.latestEntry;
      const deltaG = latest && latest.deltaG !== null ? latest.deltaG : null;
      const deltaPct = latest && latest.deltaPercent !== null ? latest.deltaPercent : null;
      const birthPct = latest && latest.changeFromBirthPercent !== null ? latest.changeFromBirthPercent : null;

      const deltaGStr = deltaG === null
        ? 'אין מספיק נתונים'
        : `<span class="${deltaG >= 0 ? 'delta-pos' : 'delta-neg'}">${deltaG > 0 ? '+' : ''}${this.formatNum(deltaG)} גרם (${deltaPct > 0 ? '+' : ''}${this.formatNum(deltaPct, 1)}%)</span>`;

      const birthPctStr = birthPct === null
        ? 'אין מספיק נתונים'
        : `<span class="${birthPct >= 0 ? 'delta-pos' : 'delta-neg'}">${birthPct > 0 ? '+' : ''}${this.formatNum(birthPct, 1)}%</span>`;

      return `
        <tr>
          <td class="td-center"><strong>${idx + 1}</strong></td>
          <td class="td-right">
            <span class="puppy-id-badge">${p.code}</span>
            <strong style="margin-right: 6px;">${p.name}</strong>
          </td>
          <td class="td-center">
            <span class="ribbon-pill" style="background: var(--surface); border-color: ${p.ribbonColorHex};">
              <span class="ribbon-dot" style="background-color: ${p.ribbonColorHex};"></span>
              <span>${p.ribbonColorName || 'ללא סרט'}</span>
            </span>
          </td>
          <td class="td-center">${window.SEX_LABELS[p.sex] || 'לא ידוע'}</td>
          <td class="td-center">${p.birthWeightG ? `${this.formatNum(p.birthWeightG)} גרם` : '—'}</td>
          <td class="td-center"><strong>${s.currentWeightG ? `${this.formatNum(s.currentWeightG)} גרם` : '—'}</strong></td>
          <td class="td-center">${deltaGStr}</td>
          <td class="td-center">${birthPctStr}</td>
          <td class="td-center">${latest ? this.formatDateTimeIL(latest.eventAt) : 'טרם נשקל'}</td>
          <td class="td-center">
            <span class="status-badge status-${p.status}">${window.STATUS_LABELS[p.status] || p.status}</span>
          </td>
          <td class="td-center">
            <button class="btn btn-sm btn-primary" onclick="HeidiApp.openWeightModal('${p.id}')">⚖️ שקילה</button>
            <button class="btn btn-sm btn-secondary" onclick="HeidiApp.openPuppyDetail('${p.id}')">כרטיס</button>
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div id="dashScrollTop" class="table-scroll-top">
        <div style="width: 1050px; height: 1px;"></div>
      </div>
      <div id="dashScrollBottom" class="table-scroll-bottom">
        <table class="rtl-table">
          <thead>
            <tr>
              <th style="width: 56px;">מס"ד</th>
              <th onclick="HeidiApp.sortComparisonTable('code')">מזהה ושם ⇅</th>
              <th onclick="HeidiApp.sortComparisonTable('ribbon')">צבע סרט ⇅</th>
              <th>מין</th>
              <th>משקל לידה</th>
              <th onclick="HeidiApp.sortComparisonTable('weight')">משקל נוכחי ⇅</th>
              <th>שינוי משקילה קודמת</th>
              <th onclick="HeidiApp.sortComparisonTable('deltaPct')">שינוי מלידה (%) ⇅</th>
              <th>מועד שקילה אחרונה</th>
              <th onclick="HeidiApp.sortComparisonTable('status')">סטטוס מעקב ⇅</th>
              <th>פעולות</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;
  },

  bindTableScrollSync(topId, bottomId) {
    const topEl = document.getElementById(topId);
    const botEl = document.getElementById(bottomId);
    if (!topEl || !botEl) return;
    topEl.addEventListener('scroll', () => { botEl.scrollLeft = topEl.scrollLeft; });
    botEl.addEventListener('scroll', () => { topEl.scrollLeft = botEl.scrollLeft; });
  },

  // ========================================================================
  // 4. לשונית הגורים + מעקב הנקה, תצפיות בריאות ואבני דרך (Puppies View)
  // ========================================================================
  renderPuppiesView(container) {
    const store = window.HeidiStore;
    const puppies = store.state.puppies;

    if (this.selectedPuppyDetailId) {
      const found = puppies.find(p => p.id === this.selectedPuppyDetailId);
      if (found) {
        this.renderSinglePuppyDetail(container, found);
        return;
      }
      this.selectedPuppyDetailId = null;
    }

    const cardsHtml = puppies.map(p => {
      const sum = store.getPuppySummary(p.id);
      const latest = sum.latestEntry;
      const deltaG = latest && latest.deltaG !== null ? latest.deltaG : null;
      const birthPct = latest && latest.changeFromBirthPercent !== null ? latest.changeFromBirthPercent : null;

      return `
        <div class="puppy-card">
          <div class="puppy-ribbon-bar" style="background-color: ${p.ribbonColorHex || '#94a3b8'};"></div>
          <div class="puppy-card-top">
            ${p.photoDataUrl
              ? `<img src="${p.photoDataUrl}" alt="${p.name}" class="puppy-photo" />`
              : `<div class="puppy-photo">🐶</div>`
            }
            <div style="flex: 1;">
              <div style="display:flex; align-items:center; justify-content:space-between; gap:6px; flex-wrap:wrap;">
                <span class="puppy-id-badge">${p.code}</span>
                <span class="status-badge status-${p.status}">${window.STATUS_LABELS[p.status]}</span>
              </div>
              <h3 style="font-size: 1.2rem; font-weight: 700; margin-top: 4px;">${p.name}</h3>
              <div style="display:flex; align-items:center; gap:8px; margin-top:4px; flex-wrap:wrap;">
                <span class="ribbon-pill" style="border-color: ${p.ribbonColorHex};">
                  <span class="ribbon-dot" style="background-color: ${p.ribbonColorHex};"></span>
                  <span>סרט: ${p.ribbonColorName || 'ללא סרט'}</span>
                </span>
                <span style="font-size: 0.84rem; color: var(--text-muted); font-weight:600;">
                  ${window.SEX_LABELS[p.sex]} ${p.coatColor ? `· ${p.coatColor}` : ''}
                </span>
              </div>
            </div>
          </div>

          ${sum.hasVetAlert ? `
            <div class="alert-box alert-danger" style="padding:8px 10px; margin-bottom:0; font-size:0.82rem;">
              <strong>⚠️ ${sum.vetAlertText}</strong>
            </div>
          ` : ''}

          <div class="puppy-metrics">
            <div>
              <div style="color:var(--text-muted); font-size:0.78rem;">משקל לידה</div>
              <div style="font-weight:800;">${p.birthWeightG ? `${this.formatNum(p.birthWeightG)} גרם` : 'לא הוזן'}</div>
            </div>
            <div>
              <div style="color:var(--text-muted); font-size:0.78rem;">משקל נוכחי</div>
              <div style="font-weight:800; font-size:1.04rem;">${sum.currentWeightG ? `${this.formatNum(sum.currentWeightG)} גרם` : 'לא הוזן'}</div>
            </div>
            <div>
              <div style="color:var(--text-muted); font-size:0.78rem;">שינוי משקילה קודמת</div>
              <div class="${deltaG !== null ? (deltaG >= 0 ? 'delta-pos' : 'delta-neg') : ''}">
                ${deltaG !== null ? `${deltaG > 0 ? '+' : ''}${this.formatNum(deltaG)} גרם` : 'אין מספיק נתונים'}
              </div>
            </div>
            <div>
              <div style="color:var(--text-muted); font-size:0.78rem;">שינוי מלידה (%)</div>
              <div class="${birthPct !== null ? (birthPct >= 0 ? 'delta-pos' : 'delta-neg') : ''}">
                ${birthPct !== null ? `${birthPct > 0 ? '+' : ''}${this.formatNum(birthPct, 1)}%` : 'אין מספיק נתונים'}
              </div>
            </div>
          </div>

          <div style="font-size: 0.82rem; color: var(--text-muted); display:flex; justify-content:space-between; flex-wrap:wrap; gap:4px;">
            <span><strong>לידה:</strong> ${this.formatDateTimeIL(p.birthDateTime)}</span>
            <span>🍼 ${sum.feedingsCount} האכלות · 🩺 ${sum.healthObsCount} תצפיות</span>
          </div>

          <div style="display:flex; gap:6px; margin-top:auto; flex-wrap:wrap;">
            <button class="btn btn-sm btn-primary" onclick="HeidiApp.openWeightModal('${p.id}')" title="שקילה חדשה">
              ⚖️ שקילה
            </button>
            <button class="btn btn-sm btn-secondary" onclick="HeidiApp.openFeedingModal('${p.id}')" title="תיעוד הנקה או האכלה">
              🍼 הנקה
            </button>
            <button class="btn btn-sm btn-secondary" onclick="HeidiApp.openHealthObsModal('${p.id}')" title="תצפית בריאות">
              🩺 בריאות
            </button>
            <button class="btn btn-sm btn-secondary" style="flex:1;" onclick="HeidiApp.openPuppyDetail('${p.id}')">
              📋 כרטיס מלא
            </button>
            <button class="btn btn-sm btn-secondary" onclick="HeidiApp.openPuppyModal('${p.id}')" title="עריכת פרטי גור וצבע סרט">
              ✏️
            </button>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="card">
        <div class="card-header" style="margin-bottom:0;">
          <div>
            <h2 class="card-title">🐶 כרטיסי הגורים של היידי (${this.formatNum(puppies.length)})</h2>
            <p style="font-size: 0.88rem; color: var(--text-muted);">
              לכל גור מזהה קבוע, צבע סרט זיהוי, שקילות, מעקב הנקה/האכלה ותצפיות בריאות
            </p>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button class="btn btn-secondary" onclick="HeidiApp.openFeedingModal()">🍼 תיעוד הנקה/האכלה</button>
            <button class="btn btn-secondary" onclick="HeidiApp.openHealthObsModal()">🩺 תצפית בריאות</button>
            <button class="btn btn-secondary" onclick="HeidiApp.openBatchWeightModal()">📋 שקילה קבוצתית</button>
            <button class="btn btn-primary" onclick="HeidiApp.openPuppyModal()">➕ הוספת גור חדש</button>
          </div>
        </div>
      </div>

      ${puppies.length === 0 ? `
        <div class="card" style="text-align:center; padding:40px 20px;">
          <div style="font-size: 3rem; margin-bottom: 10px;">🐾</div>
          <h3 style="margin-bottom: 8px;">טרם הוזנו גורים במערכת</h3>
          <p style="color: var(--text-muted); max-width: 460px; margin: 0 auto 18px;">
            ברגע שיוולד גור בזמן ההמלטה (או לבדיקה כעת), לחצי על הכפתור להוספת כרטיס גור עם צבע סרט זיהוי ומשקל לידה.
          </p>
          <button class="btn btn-primary" onclick="HeidiApp.openPuppyModal()">🐶 הוספת גור ראשון</button>
        </div>
      ` : `
        <div class="puppies-grid">
          ${cardsHtml}
        </div>
      `}
    `;
  },

  openPuppyDetail(puppyId, subTab = 'weights') {
    this.selectedPuppyDetailId = puppyId;
    this.puppyDetailSubTab = subTab;
    this.switchTab('puppies');
  },

  closePuppyDetail() {
    this.selectedPuppyDetailId = null;
    this.switchTab('puppies');
  },

  setPuppySubTab(subTab) {
    this.puppyDetailSubTab = subTab;
    const found = window.HeidiStore.state.puppies.find(p => p.id === this.selectedPuppyDetailId);
    if (found) {
      this.renderSinglePuppyDetail(document.getElementById('mainViewContainer'), found);
    }
  },

  renderSinglePuppyDetail(container, p) {
    const store = window.HeidiStore;
    const calcWeights = store.getCalculatedWeightsForPuppy(p.id).slice().reverse();
    const feedings = store.state.feedingEntries.filter(f => f.puppyId === p.id).slice().sort((a, b) => new Date(b.eventAt).getTime() - new Date(a.eventAt).getTime());
    const healthObs = store.state.healthObservations.filter(h => h.puppyId === p.id).slice().sort((a, b) => new Date(b.eventAt).getTime() - new Date(a.eventAt).getTime());
    const sum = store.getPuppySummary(p.id);
    const bd = p.birthDetails || {};

    let subTabHtml = '';

    if (this.puppyDetailSubTab === 'weights') {
      const rowsHtml = calcWeights.map((w, idx) => {
        const rowNum = calcWeights.length - idx;
        const deltaGStr = w.deltaG === null
          ? '—'
          : `<span class="${w.deltaG >= 0 ? 'delta-pos' : 'delta-neg'}">${w.deltaG > 0 ? '+' : ''}${this.formatNum(w.deltaG)} גרם</span>`;
        const deltaPctStr = w.deltaPercent === null
          ? '—'
          : `<span class="${w.deltaPercent >= 0 ? 'delta-pos' : 'delta-neg'}">${w.deltaPercent > 0 ? '+' : ''}${this.formatNum(w.deltaPercent, 1)}%</span>`;
        const birthPctStr = w.changeFromBirthPercent === null
          ? '—'
          : `<span class="${w.changeFromBirthPercent >= 0 ? 'delta-pos' : 'delta-neg'}">${w.changeFromBirthPercent > 0 ? '+' : ''}${this.formatNum(w.changeFromBirthPercent, 1)}%</span>`;
        const dailyGainStr = w.dailyGainG === null
          ? '—'
          : `${w.dailyGainG > 0 ? '+' : ''}${this.formatNum(w.dailyGainG, 1)} ג׳/יום`;

        return `
          <tr>
            <td class="td-center"><strong>${rowNum}</strong></td>
            <td class="td-center">${this.formatDateTimeIL(w.eventAt)}</td>
            <td class="td-center">${w.ageDisplay}</td>
            <td class="td-center"><strong>${this.formatNum(w.weightG)} גרם</strong></td>
            <td class="td-center">${deltaGStr}</td>
            <td class="td-center">${deltaPctStr}</td>
            <td class="td-center">${birthPctStr}</td>
            <td class="td-center">${dailyGainStr}</td>
            <td class="td-right">${w.notes || '—'} ${w.weighedBy ? `<span style="color:var(--text-muted); font-size:0.78rem;">(${w.weighedBy})</span>` : ''}</td>
            <td class="td-center">
              <button class="btn btn-sm btn-secondary" onclick="HeidiApp.openWeightModal('${p.id}', '${w.id}')">✏️</button>
              <button class="btn btn-sm btn-danger" onclick="HeidiApp.confirmDeleteWeight('${w.id}')">🗑️</button>
            </td>
          </tr>
        `;
      }).join('');

      subTabHtml = `
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">📈 גרף גדילה אישי — ${p.code} (${p.name})</h3>
          </div>
          <div id="singlePuppyChartContainer" class="chart-container"></div>
          <div id="singlePuppyChartLegend" class="chart-legend"></div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title">📋 היסטוריית שקילות מלאה (${this.formatNum(calcWeights.length)})</h3>
            <button class="btn btn-sm btn-primary" onclick="HeidiApp.openWeightModal('${p.id}')">➕ שקילה חדשה / בדיעבד</button>
          </div>
          ${calcWeights.length === 0 ? `
            <p style="color:var(--text-muted); padding:16px; text-align:center;">טרם תועדו שקילות לגור זה.</p>
          ` : `
            <div class="table-scroll-bottom">
              <table class="rtl-table">
                <thead>
                  <tr>
                    <th style="width:52px;">מס"ד</th>
                    <th>תאריך ושעת שקילה</th>
                    <th>גיל בשקילה</th>
                    <th>משקל (גרם)</th>
                    <th>הפרש מקודמת</th>
                    <th>% מקודמת</th>
                    <th>% מלידה</th>
                    <th>קצב יומי</th>
                    <th>הערה ושוקל/ת</th>
                    <th>פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>
            </div>
          `}
        </div>
      `;
    } else if (this.puppyDetailSubTab === 'feeding') {
      subTabHtml = `
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">🍼 מעקב הנקה והאכלה — ${p.code} (${p.name})</h3>
              <p style="font-size:0.84rem; color:var(--text-muted);">
                האפליקציה אינה מחשבת כמויות תחליף חלב ואינה ממליצה על פורמולה/מינון ללא הנחיה וטרינרית
              </p>
            </div>
            <button class="btn btn-primary" onclick="HeidiApp.openFeedingModal('${p.id}')">➕ תיעוד הנקה / האכלה</button>
          </div>

          <div style="margin-bottom:14px; padding:12px; background:var(--amber-bg); border:1px solid var(--amber-border); border-radius:10px;">
            <label style="font-weight:700; font-size:0.88rem; display:block; margin-bottom:6px; color:var(--amber-text);">
              🩺 תוכנית האכלה משלימה שהתקבלה מהווטרינר/ית (להזנה ידנית לפי הוראת וטרינר בלבד):
            </label>
            <div style="display:flex; gap:8px;">
              <input type="text" id="vetFeedingPlanInput" class="form-control" style="flex:1;" value="${store.state.litter.vetSupplementalFeedingPlan || ''}" placeholder="למשל: סוג פורמולה, כמות ותדירות כפי שהנחה הווטרינר..." />
              <button class="btn btn-sm btn-secondary" onclick="HeidiApp.saveVetFeedingPlan()">💾 שמירה</button>
            </div>
          </div>

          ${feedings.length === 0 ? `
            <p style="color:var(--text-muted); padding:20px; text-align:center;">טרם תועדו הנקות או האכלות לגור זה.</p>
          ` : `
            <div class="table-scroll-bottom">
              <table class="rtl-table">
                <thead>
                  <tr>
                    <th style="width:52px;">מס"ד</th>
                    <th>תאריך ושעה</th>
                    <th>סוג הנקה / האכלה</th>
                    <th>משך (דק׳)</th>
                    <th>יונק באופן יעיל?</th>
                    <th>הערות ומתעד/ת</th>
                    <th>פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  ${feedings.map((f, idx) => `
                    <tr>
                      <td class="td-center"><strong>${feedings.length - idx}</strong></td>
                      <td class="td-center">${this.formatDateTimeIL(f.eventAt)}</td>
                      <td class="td-center"><strong>${f.feedingType}</strong></td>
                      <td class="td-center">${f.durationMinutes ? `${f.durationMinutes} דק׳` : '—'}</td>
                      <td class="td-center">
                        <span class="status-badge ${f.effectiveLatch === 'כן' ? 'status-with_dam' : (f.effectiveLatch === 'לא' ? 'status-vet_care' : 'status-watch')}">
                          ${f.effectiveLatch}
                        </span>
                      </td>
                      <td class="td-right">${f.notes || '—'} (${f.recordedBy || 'תכלת'})</td>
                      <td class="td-center">
                        <button class="btn btn-sm btn-danger" onclick="HeidiApp.confirmDeleteFeeding('${f.id}')">🗑️</button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      `;
    } else if (this.puppyDetailSubTab === 'health') {
      subTabHtml = `
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">🩺 מעקב בריאות ותצפיות — ${p.code} (${p.name})</h3>
              <p style="font-size:0.84rem; color:var(--text-muted);">
                תיעוד תצפיתי של פעילות, רפלקס יניקה, בכי, חום למגע (אינו תחליף למדידה), נשימה ובדיקות וטרינריות
              </p>
            </div>
            <button class="btn btn-primary" onclick="HeidiApp.openHealthObsModal('${p.id}')">➕ תצפית בריאות חדשה</button>
          </div>

          ${healthObs.length === 0 ? `
            <p style="color:var(--text-muted); padding:20px; text-align:center;">טרם תועדו תצפיות בריאות לגור זה.</p>
          ` : `
            <div class="timeline-list">
              ${healthObs.map((h, idx) => `
                <div class="timeline-item">
                  <div style="flex:1;">
                    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:6px;">
                      <span class="puppy-id-badge">#${healthObs.length - idx}</span>
                      <strong>${this.formatDateTimeIL(h.eventAt)}</strong>
                      <span class="status-badge status-with_dam">פעילות: ${h.activityVitality}</span>
                      <span class="status-badge status-with_dam">רפלקס יניקה: ${h.suckleReflex}</span>
                      <span class="status-badge status-watch">חום למגע: ${h.warmthToTouch}</span>
                    </div>
                    <div style="font-size:0.88rem; display:flex; flex-wrap:wrap; gap:12px;">
                      <span><strong>בכי/שקט:</strong> ${h.cryingRestlessness}</span>
                      <span><strong>נשימה:</strong> ${h.breathingObs}</span>
                      <span><strong>שתן/צואה:</strong> ${h.urineStool}</span>
                      ${h.generalAppearance ? `<span><strong>מראה כללי:</strong> ${h.generalAppearance}</span>` : ''}
                    </div>
                    ${h.vetExamDiagnosisTreatment ? `
                      <div style="margin-top:6px; padding:6px 10px; background:var(--info-bg); border-radius:6px; font-size:0.86rem; color:var(--info-text);">
                        <strong>🩺 בדיקה, אבחנה וטיפול לפי הווטרינר/ית:</strong> ${h.vetExamDiagnosisTreatment}
                      </div>
                    ` : ''}
                    ${h.notes ? `<div style="margin-top:4px; font-size:0.86rem;"><strong>הערות:</strong> ${h.notes}</div>` : ''}
                  </div>
                  <div style="display:flex; align-items:center; gap:6px;">
                    ${h.photoDataUrl ? `<img src="${h.photoDataUrl}" style="width:52px; height:52px; object-fit:cover; border-radius:8px;" />` : ''}
                    <button class="btn btn-sm btn-danger" onclick="HeidiApp.confirmDeleteHealthObs('${h.id}')">🗑️</button>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      `;
    }

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
            <button class="btn btn-sm btn-secondary" onclick="HeidiApp.closePuppyDetail()">➡️ חזרה לכל הגורים</button>
            <span class="puppy-id-badge" style="font-size:1rem;">${p.code}</span>
            <h2 class="card-title" style="font-size:1.35rem;">${p.name}</h2>
            <span class="ribbon-pill" style="border-color: ${p.ribbonColorHex};">
              <span class="ribbon-dot" style="background-color: ${p.ribbonColorHex};"></span>
              <span>סרט: ${p.ribbonColorName || 'ללא סרט'}</span>
            </span>
            <span class="status-badge status-${p.status}">${window.STATUS_LABELS[p.status]}</span>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button class="btn btn-primary" onclick="HeidiApp.openWeightModal('${p.id}')">⚖️ שקילה</button>
            <button class="btn btn-secondary" onclick="HeidiApp.openFeedingModal('${p.id}')">🍼 הנקה</button>
            <button class="btn btn-secondary" onclick="HeidiApp.openHealthObsModal('${p.id}')">🩺 תצפית בריאות</button>
            <button class="btn btn-secondary" onclick="HeidiApp.printSinglePuppyVetReport('${p.id}')" title="הפקת דוח גור מסודר להדפסה או שמירה כ-PDF לווטרינר">🖨️ דוח PDF לווטרינר</button>
            <button class="btn btn-secondary" onclick="HeidiApp.openPuppyModal('${p.id}')">✏️ עריכת גור</button>
            <button class="btn btn-danger" onclick="HeidiApp.confirmDeletePuppy('${p.id}')">🗑️</button>
          </div>
        </div>

        <div class="grid-stats" style="margin-top:12px; margin-bottom:0;">
          <div class="stat-box">
            <span class="stat-label">מין וצבע פרווה</span>
            <span class="stat-value" style="font-size:1.15rem;">${window.SEX_LABELS[p.sex]} · ${p.coatColor || 'לא צוין'}</span>
            <span class="stat-sub">סימנים: ${p.markings || 'ללא סימנים מיוחדים'}</span>
          </div>
          <div class="stat-box">
            <span class="stat-label">משקל לידה ותאריך לידה</span>
            <span class="stat-value" style="font-size:1.15rem;">${p.birthWeightG ? `${this.formatNum(p.birthWeightG)} גרם` : 'לא הוזן'}</span>
            <span class="stat-sub">${this.formatDateTimeIL(p.birthDateTime)}</span>
          </div>
          <div class="stat-box">
            <span class="stat-label">משקל נוכחי (${sum.entriesCount} שקילות)</span>
            <span class="stat-value" style="font-size:1.3rem; color:var(--primary);">${sum.currentWeightG ? `${this.formatNum(sum.currentWeightG)} גרם` : '—'}</span>
            <span class="stat-sub">${sum.latestEntry && sum.latestEntry.changeFromBirthPercent !== null ? `שינוי מלידה: ${sum.latestEntry.changeFromBirthPercent > 0 ? '+' : ''}${this.formatNum(sum.latestEntry.changeFromBirthPercent, 1)}%` : ''}</span>
          </div>
          <div class="stat-box">
            <span class="stat-label">ממוצע עלייה יומי מאז הלידה</span>
            <span class="stat-value" style="font-size:1.15rem;">
              ${sum.avgDailyGainFromBirthG !== null ? `${sum.avgDailyGainFromBirthG > 0 ? '+' : ''}${this.formatNum(sum.avgDailyGainFromBirthG, 1)} גרם/יום` : 'אין מספיק נתונים'}
            </span>
            <span class="stat-sub">מחושב לפי מועד הלידה בפועל</span>
          </div>
        </div>

        <div style="margin-top:14px; padding:12px 14px; background:var(--surface-muted); border:1px solid var(--border-color); border-radius:10px; font-size:0.88rem;">
          <strong>🍼 נתוני לידה מתועדים (תיעוד תצפיתי בלבד):</strong>
          <div style="display:flex; flex-wrap:wrap; gap:14px; margin-top:6px;">
            <span><strong>מצג:</strong> ${bd.presentation || 'לא צוין'}</span>
            <span><strong>נולד בשק:</strong> ${bd.bornInSac || 'לא צוין'}</span>
            <span><strong>נדרש סיוע:</strong> ${bd.assistanceRequired || 'לא'}</span>
            <span><strong>חבל טבור:</strong> ${bd.cordHandledBy || 'האם'}</span>
            <span><strong>שליה נצפתה:</strong> ${bd.placentaObserved || 'לא ידוע'}</span>
          </div>
        </div>

        ${p.notes ? `<div style="margin-top:10px; padding:10px 14px; background:var(--surface-muted); border-radius:8px; font-size:0.9rem;"><strong>הערות כלליות:</strong> ${p.notes}</div>` : ''}

        <!-- תת-לשוניות בתוך כרטיס הגור -->
        <div style="display:flex; gap:8px; margin-top:16px; flex-wrap:wrap; border-top:1px solid var(--border-color); padding-top:14px;">
          <button class="btn btn-sm ${this.puppyDetailSubTab === 'weights' ? 'btn-primary' : 'btn-secondary'}" onclick="HeidiApp.setPuppySubTab('weights')">
            ⚖️ שקילות וגרף (${calcWeights.length})
          </button>
          <button class="btn btn-sm ${this.puppyDetailSubTab === 'feeding' ? 'btn-primary' : 'btn-secondary'}" onclick="HeidiApp.setPuppySubTab('feeding')">
            🍼 הנקה והאכלה (${feedings.length})
          </button>
          <button class="btn btn-sm ${this.puppyDetailSubTab === 'health' ? 'btn-primary' : 'btn-secondary'}" onclick="HeidiApp.setPuppySubTab('health')">
            🩺 תצפיות בריאות (${healthObs.length})
          </button>
        </div>
      </div>

      ${subTabHtml}
    `;

    if (this.puppyDetailSubTab === 'weights') {
      window.HeidiCharts.renderGrowthChart('singlePuppyChartContainer', 'singlePuppyChartLegend', 'weight_all', p.id);
    }
  },

  saveVetFeedingPlan() {
    const val = document.getElementById('vetFeedingPlanInput').value.trim();
    window.HeidiStore.state.litter.vetSupplementalFeedingPlan = val;
    window.HeidiStore.save();
    alert('תוכנית ההאכלה הווטרינרית נשמרה!');
  },

  openFeedingModal(defaultPuppyId = '') {
    const store = window.HeidiStore;
    const puppies = store.state.puppies;
    if (puppies.length === 0) {
      alert('יש להוסיף תחילה לפחות גור אחד למערכת.');
      this.openPuppyModal();
      return;
    }
    const selId = defaultPuppyId || puppies[0].id;
    const dtVal = this.nowLocalInputValue();

    const modalBody = document.getElementById('appModalContent');
    modalBody.innerHTML = `
      <div class="card-header">
        <h3 class="card-title">🍼 תיעוד הנקה / האכלה לגור</h3>
        <button class="btn btn-sm btn-secondary" onclick="HeidiApp.closeModal()">✖ סגירה</button>
      </div>
      <form onsubmit="HeidiApp.submitFeedingForm(event)">
        <div class="form-grid">
          <div class="form-group">
            <label>בחירת גור</label>
            <select id="feed_puppyId" class="form-control" required>
              ${puppies.map(p => `<option value="${p.id}" ${p.id === selId ? 'selected' : ''}>${p.code} · ${p.name} (סרט ${p.ribbonColorName})</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>תאריך ושעה</label>
            <input type="datetime-local" id="feed_eventAt" class="form-control" value="${dtVal}" required />
          </div>
          <div class="form-group">
            <label>סוג הנקה / האכלה</label>
            <select id="feed_type" class="form-control">
              <option value="הנקה מהאם (היידי)">הנקה מהאם (היידי)</option>
              <option value="הנקה בסיוע (חיבור לעטין)">הנקה בסיוע (חיבור לעטין)</option>
              <option value="תחליף חלב (לפי הנחיית וטרינר)">תחליף חלב (לפי הנחיית וטרינר)</option>
              <option value="אחר">אחר</option>
            </select>
          </div>
          <div class="form-group">
            <label>האם הגור נצפה יונק באופן יעיל?</label>
            <select id="feed_latch" class="form-control">
              <option value="כן">כן — יניקה יעילה</option>
              <option value="לא בטוח">לא בטוח</option>
              <option value="לא">לא — מתקשה לינוק</option>
            </select>
          </div>
          <div class="form-group">
            <label>משך בדקות (אופציונלי)</label>
            <input type="number" min="1" id="feed_duration" class="form-control" placeholder="למשל: 15" />
          </div>
          <div class="form-group">
            <label>מי תיעד/ה?</label>
            <input type="text" id="feed_by" class="form-control" value="תכלת" />
          </div>
        </div>
        <div class="form-group">
          <label>הערות</label>
          <input type="text" id="feed_notes" class="form-control" placeholder="הערות חופשיות..." />
        </div>
        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:12px;">
          <button type="button" class="btn btn-secondary" onclick="HeidiApp.closeModal()">ביטול</button>
          <button type="submit" class="btn btn-primary">💾 שמירת האכלה</button>
        </div>
      </form>
    `;
    document.getElementById('appModalBackdrop').classList.add('open');
  },

  submitFeedingForm(e) {
    e.preventDefault();
    window.HeidiStore.addFeedingEntry({
      puppyId: document.getElementById('feed_puppyId').value,
      eventAt: document.getElementById('feed_eventAt').value,
      feedingType: document.getElementById('feed_type').value,
      effectiveLatch: document.getElementById('feed_latch').value,
      durationMinutes: document.getElementById('feed_duration').value,
      recordedBy: document.getElementById('feed_by').value,
      notes: document.getElementById('feed_notes').value
    });
    this.closeModal();
    this.switchTab(this.activeTab);
  },

  confirmDeleteFeeding(entryId) {
    if (!confirm('⚠️ למחוק רשומת הנקה/האכלה זו?')) return;
    window.HeidiStore.deleteFeedingEntry(entryId);
    this.switchTab(this.activeTab);
  },

  openHealthObsModal(defaultPuppyId = '') {
    const store = window.HeidiStore;
    const puppies = store.state.puppies;
    if (puppies.length === 0) {
      alert('יש להוסיף תחילה לפחות גור אחד למערכת.');
      this.openPuppyModal();
      return;
    }
    const selId = defaultPuppyId || puppies[0].id;
    const dtVal = this.nowLocalInputValue();

    const modalBody = document.getElementById('appModalContent');
    modalBody.innerHTML = `
      <div class="card-header">
        <h3 class="card-title">🩺 תצפית בריאות ומעקב גור (סעיף 6 באפיון)</h3>
        <button class="btn btn-sm btn-secondary" onclick="HeidiApp.closeModal()">✖ סגירה</button>
      </div>
      <form onsubmit="HeidiApp.submitHealthObsForm(event)">
        <div class="form-grid">
          <div class="form-group">
            <label>בחירת גור</label>
            <select id="hobs_puppyId" class="form-control" required>
              ${puppies.map(p => `<option value="${p.id}" ${p.id === selId ? 'selected' : ''}>${p.code} · ${p.name} (סרט ${p.ribbonColorName})</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>תאריך ושעה</label>
            <input type="datetime-local" id="hobs_eventAt" class="form-control" value="${dtVal}" required />
          </div>
          <div class="form-group">
            <label>פעילות וחיוניות</label>
            <select id="hobs_activity" class="form-control">
              <option value="פעיל וחיוני">פעיל וחיוני</option>
              <option value="ישנוני / רגוע">ישנוני / רגוע</option>
              <option value="חלש / פסיבי (דורש בדיקת וטרינר)">חלש / פסיבי (דורש בדיקת וטרינר)</option>
            </select>
          </div>
          <div class="form-group">
            <label>יניקה ורפלקס חיפוש/יניקה (תצפית)</label>
            <select id="hobs_suckle" class="form-control">
              <option value="תקין וחזק">תקין וחזק</option>
              <option value="בינוני / מתעייף מהר">בינוני / מתעייף מהר</option>
              <option value="חלש / לא יונק (דורש וטרינר)">חלש / לא יונק (דורש וטרינר)</option>
            </select>
          </div>
          <div class="form-group">
            <label>בכי / אי שקט</label>
            <select id="hobs_crying" class="form-control">
              <option value="רגוע וישן היטב">רגוע וישן היטב</option>
              <option value="בכי קל לפני הנקה">בכי קל לפני הנקה</option>
              <option value="בכי מתמשך / אי שקט חריג (דורש וטרינר)">בכי מתמשך / אי שקט חריג (דורש וטרינר)</option>
            </select>
          </div>
          <div class="form-group">
            <label>תחושת חום למגע (תצפית, לא תחליף למדידה)</label>
            <select id="hobs_warmth" class="form-control">
              <option value="חמים ונעים למגע">חמים ונעים למגע</option>
              <option value="קריר למגע (אין להאכיל גור קר — להתייעץ עם וטרינר!)">קריר למגע (אין להאכיל גור קר — להתייעץ עם וטרינר!)</option>
              <option value="חם מדי">חם מדי</option>
            </select>
          </div>
          <div class="form-group">
            <label>שתן וצואה (אם נצפו)</label>
            <select id="hobs_elim" class="form-control">
              <option value="נצפה תקין">נצפה תקין</option>
              <option value="לא נצפה">לא נצפה</option>
              <option value="צואה רכה / שלשול / חריג">צואה רכה / שלשול / חריג</option>
            </select>
          </div>
          <div class="form-group">
            <label>נשימה (תצפית)</label>
            <select id="hobs_breath" class="form-control">
              <option value="רגועה וסדירה">רגועה וסדירה</option>
              <option value="מהירה / מאומצת / חרחור (דורש וטרינר)">מהירה / מאומצת / חרחור (דורש וטרינר)</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>צבע / מראה כללי (עור, ריריות, טבור)</label>
          <input type="text" id="hobs_appearance" class="form-control" placeholder="למשל: חניכיים/לשון ורודים, טבור יבש ונקי" />
        </div>
        <div class="form-group">
          <label>🩺 בדיקה וטרינרית, אבחנה וטיפול (להזנה לפי הווטרינר/ית בלבד)</label>
          <textarea id="hobs_vetExam" class="form-control" rows="2" placeholder="הנחיות או טיפול שניתנו על ידי הווטרינר/ית"></textarea>
        </div>
        <div class="form-group">
          <label>📷 צירוף תמונה לתצפית (אופציונלי)</label>
          <input type="file" accept="image/*" class="form-control" onchange="HeidiApp.handleGenericPhotoUpload(this, 'hobs_photoDataUrl', 'hobs_photoPreview')" />
          <input type="hidden" id="hobs_photoDataUrl" value="" />
          <div id="hobs_photoPreview" style="margin-top:6px;"></div>
        </div>
        <div class="form-group">
          <label>הערות נוספות</label>
          <input type="text" id="hobs_notes" class="form-control" placeholder="הערות..." />
        </div>
        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:12px;">
          <button type="button" class="btn btn-secondary" onclick="HeidiApp.closeModal()">ביטול</button>
          <button type="submit" class="btn btn-primary">💾 שמירת תצפית בריאות</button>
        </div>
      </form>
    `;
    document.getElementById('appModalBackdrop').classList.add('open');
  },

  submitHealthObsForm(e) {
    e.preventDefault();
    window.HeidiStore.addHealthObservation({
      puppyId: document.getElementById('hobs_puppyId').value,
      eventAt: document.getElementById('hobs_eventAt').value,
      activityVitality: document.getElementById('hobs_activity').value,
      suckleReflex: document.getElementById('hobs_suckle').value,
      cryingRestlessness: document.getElementById('hobs_crying').value,
      warmthToTouch: document.getElementById('hobs_warmth').value,
      urineStool: document.getElementById('hobs_elim').value,
      breathingObs: document.getElementById('hobs_breath').value,
      generalAppearance: document.getElementById('hobs_appearance').value,
      vetExamDiagnosisTreatment: document.getElementById('hobs_vetExam').value,
      photoDataUrl: document.getElementById('hobs_photoDataUrl').value,
      notes: document.getElementById('hobs_notes').value
    });
    this.closeModal();
    this.switchTab(this.activeTab);
  },

  confirmDeleteHealthObs(obsId) {
    if (!confirm('⚠️ למחוק תצפית בריאות זו?')) return;
    window.HeidiStore.deleteHealthObservation(obsId);
    this.switchTab(this.activeTab);
  },

  // ========================================================================
  // 5. לשונית מעקב משקלים וגרפים (Weights & Growth Charts)
  // ========================================================================
  renderWeightsAndChartsView(container) {
    const store = window.HeidiStore;
    const puppies = store.state.puppies;
    const summaries = puppies.map(p => store.getPuppySummary(p.id)).filter(Boolean);

    const allCalculatedEntries = [];
    puppies.forEach(p => {
      if (this.weightFilterPuppy !== 'all' && p.id !== this.weightFilterPuppy) return;
      const calc = store.getCalculatedWeightsForPuppy(p.id);
      calc.forEach(c => {
        allCalculatedEntries.push({ puppy: p, entry: c });
      });
    });

    allCalculatedEntries.sort((a, b) => new Date(b.entry.eventAt).getTime() - new Date(a.entry.eventAt).getTime());

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">⚖️ מרכז שקילות, חישובים וגרפי גדילה</h2>
            <p style="font-size: 0.88rem; color: var(--text-muted);">
              מעקב יומי מדויק בגרמים ובאחוזים · השוואה בין האחים ללא קביעת "מנצח" או אבחנה רפואית
            </p>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button class="btn btn-primary" onclick="HeidiApp.openWeightModal()">➕ שקילה בודדת</button>
            <button class="btn btn-secondary" onclick="HeidiApp.openBatchWeightModal()">📋 שקילה קבוצתית לכל השגר</button>
          </div>
        </div>

        <div class="alert-box alert-info" style="margin-bottom:0; font-size:0.86rem;">
          <div>
            <strong>📌 הנחיית ייחוס מהמקורות הווטרינריים:</strong>
            ב-24 השעות הראשונות תיתכן ירידה קלה (עד כ-10% ממשקל הלידה), ולאחר מכן מצופה עלייה עקבית (לעיתים כ-5% עד 10% ליום כנקודת ייחוס בלבד). כל ירידה אחרי היממה הראשונה או היעדר עלייה מסומנים לפנייה לווטרינר/ית.
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">📈 גרפי גדילה והשוואה</h3>
          <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
            <select class="form-control" style="min-height:38px; padding:4px 10px; width:auto;" onchange="HeidiApp.changeChartMode(this.value)">
              <option value="weight_all" ${this.chartMode === 'weight_all' ? 'selected' : ''}>1. משקל לאורך זמן (גרם)</option>
              <option value="pct_from_birth" ${this.chartMode === 'pct_from_birth' ? 'selected' : ''}>2. אחוז שינוי ממשקל לידה (%)</option>
              <option value="litter_avg" ${this.chartMode === 'litter_avg' ? 'selected' : ''}>3. משקל ממוצע של השגר</option>
            </select>
            <select class="form-control" style="min-height:38px; padding:4px 10px; width:auto;" onchange="HeidiApp.changeChartPuppy(this.value)" ${this.chartMode === 'litter_avg' ? 'disabled' : ''}>
              <option value="all" ${this.chartSelectedPuppy === 'all' ? 'selected' : ''}>כל הגורים יחד (השוואה)</option>
              ${puppies.map(p => `<option value="${p.id}" ${this.chartSelectedPuppy === p.id ? 'selected' : ''}>${p.code} · ${p.name} (סרט ${p.ribbonColorName})</option>`).join('')}
            </select>
          </div>
        </div>
        <div id="weightsMainChartContainer" class="chart-container"></div>
        <div id="weightsMainChartLegend" class="chart-legend"></div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">📊 טבלת השוואה בין האחים</h3>
        </div>
        ${this.renderComparisonTableHtml(summaries)}
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">🕒 יומן שקילות מפורט (${this.formatNum(allCalculatedEntries.length)} רשומות)</h3>
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:0.86rem; font-weight:700;">סינון גור:</span>
            <select class="form-control" style="min-height:38px; padding:4px 10px; width:auto;" onchange="HeidiApp.filterWeightLog(this.value)">
              <option value="all" ${this.weightFilterPuppy === 'all' ? 'selected' : ''}>כל הגורים</option>
              ${puppies.map(p => `<option value="${p.id}" ${this.weightFilterPuppy === p.id ? 'selected' : ''}>${p.code} · ${p.name}</option>`).join('')}
            </select>
          </div>
        </div>
        ${allCalculatedEntries.length === 0 ? `
          <div style="padding:24px; text-align:center; color:var(--text-muted);">אין שקילות להצגה בסינון הנוכחי.</div>
        ` : `
          <div class="table-scroll-bottom">
            <table class="rtl-table">
              <thead>
                <tr>
                  <th style="width:52px;">מס"ד</th>
                  <th>גור וסרט</th>
                  <th>מועד שקילה (eventAt)</th>
                  <th>גיל</th>
                  <th>משקל (גרם)</th>
                  <th>הפרש מקודמת</th>
                  <th>% מלידה</th>
                  <th>הערה ושוקל/ת</th>
                  <th>חותמת הזנה/עריכה</th>
                  <th>פעולות</th>
                </tr>
              </thead>
              <tbody>
                ${allCalculatedEntries.map((item, idx) => {
                  const p = item.puppy;
                  const w = item.entry;
                  return `
                    <tr>
                      <td class="td-center"><strong>${idx + 1}</strong></td>
                      <td class="td-right">
                        <span class="puppy-id-badge">${p.code}</span>
                        <strong>${p.name}</strong>
                        <span class="ribbon-pill" style="padding:1px 7px; font-size:0.75rem; margin-right:4px; border-color:${p.ribbonColorHex};">
                          <span class="ribbon-dot" style="background-color:${p.ribbonColorHex}; width:8px; height:8px;"></span>
                          ${p.ribbonColorName}
                        </span>
                      </td>
                      <td class="td-center">${this.formatDateTimeIL(w.eventAt)}</td>
                      <td class="td-center">${w.ageDisplay}</td>
                      <td class="td-center"><strong>${this.formatNum(w.weightG)} גרם</strong></td>
                      <td class="td-center">
                        ${w.deltaG !== null ? `<span class="${w.deltaG >= 0 ? 'delta-pos' : 'delta-neg'}">${w.deltaG > 0 ? '+' : ''}${this.formatNum(w.deltaG)} ג׳ (${w.deltaPercent > 0 ? '+' : ''}${this.formatNum(w.deltaPercent, 1)}%)</span>` : '—'}
                      </td>
                      <td class="td-center">
                        ${w.changeFromBirthPercent !== null ? `<span class="${w.changeFromBirthPercent >= 0 ? 'delta-pos' : 'delta-neg'}">${w.changeFromBirthPercent > 0 ? '+' : ''}${this.formatNum(w.changeFromBirthPercent, 1)}%</span>` : '—'}
                      </td>
                      <td class="td-right">${w.notes || '—'} ${w.weighedBy ? `(${w.weighedBy})` : ''}</td>
                      <td class="td-center" style="font-size:0.78rem; color:var(--text-muted);">
                        הוזן: ${this.formatDateTimeIL(w.createdAt)}
                        ${w.editHistory && w.editHistory.length > 0 ? `<br/>נערך (${w.editHistory.length})` : ''}
                      </td>
                      <td class="td-center">
                        <button class="btn btn-sm btn-secondary" onclick="HeidiApp.openWeightModal('${p.id}', '${w.id}')">✏️</button>
                        <button class="btn btn-sm btn-danger" onclick="HeidiApp.confirmDeleteWeight('${w.id}')">🗑️</button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;

    this.bindTableScrollSync('dashScrollTop', 'dashScrollBottom');
    window.HeidiCharts.renderGrowthChart('weightsMainChartContainer', 'weightsMainChartLegend', this.chartMode, this.chartSelectedPuppy);
  },

  changeChartMode(mode) {
    this.chartMode = mode;
    this.renderWeightsAndChartsView(document.getElementById('mainViewContainer'));
  },

  changeChartPuppy(puppyId) {
    this.chartSelectedPuppy = puppyId;
    this.renderWeightsAndChartsView(document.getElementById('mainViewContainer'));
  },

  filterWeightLog(puppyId) {
    this.weightFilterPuppy = puppyId;
    this.renderWeightsAndChartsView(document.getElementById('mainViewContainer'));
  },

  // ========================================================================
  // 6. שלב ג': לשונית "🦮 היידי — האם" (סעיף 7 במסמך האפיון)
  // ========================================================================
  renderDamView(container) {
    const store = window.HeidiStore;
    const dam = store.state.dam;
    const logs = (store.state.damDailyLogs || [])
      .slice()
      .sort((a, b) => new Date(b.eventAt).getTime() - new Date(a.eventAt).getTime());

    container.innerHTML = `
      <div class="heidi-hero-card">
        <div class="heidi-hero-left">
          <div class="heidi-hero-photo-wrap" onclick="HeidiApp.openPhotoLightbox('heidi.jpg')" title="לחצי להגדלת התמונה המלאה של היידי">
            <img src="heidi_icon.jpg" alt="היידי הלברדורית" class="heidi-hero-photo" />
            <span class="heidi-hero-badge">היידי שלנו ❤️</span>
          </div>
          <div>
            <h2 class="card-title">🦮 היידי — מעקב בריאות והתאוששות האם לאחר ההמלטה</h2>
            <p style="font-size:0.88rem; color:var(--text-muted);">
              ${dam.name} (${dam.breed} · ${dam.ageText} · ${dam.parityText}) · מעקב יומי אחר תיאבון, שתייה, חום, הפרשות (Lochia), עטינים והתנהגות אימהית
            </p>
          </div>
        </div>
        <button class="btn btn-primary" onclick="HeidiApp.openDamLogModal()">
          ➕ רישום בדיקה יומית להיידי
        </button>
      </div>
      <div class="card">
        <div class="alert-box alert-warning" style="margin-bottom:0; font-size:0.86rem;">
          <div>
            <strong>📌 הנחיות וסימני אזהרה לאחר ההמלטה (סעיף 7 באפיון):</strong>
            <ul style="margin-top:4px; padding-right:18px;">
              <li>לאחר ההמלטה צפויה הפרשה רחמית (לוכיה — <code>lochia</code>) שיכולה להיות כהה/אדומה-חומה, ובדרך כלל <strong>ללא ריח רע</strong>.</li>
              <li><strong>מחייב התייעצות וטרינרית מיידית:</strong> ריח רע מההפרשות, עלייה בכמות ההפרשה או דימום טרי, חום, אפתיה, חוסר תיאבון משמעותי, כאב, עטין אדום/חם/כואב/קשה או התנהגות אימהית חריגה.</li>
              <li>אין לתת תרופות או תוספים ללא הוראת וטרינר/ית.</li>
            </ul>
          </div>
        </div>
      </div>

      <div class="grid-stats">
        <div class="stat-box">
          <span class="stat-label">שם וגזע</span>
          <span class="stat-value" style="font-size:1.2rem;">${dam.name}</span>
          <span class="stat-sub">${dam.breed} · ${dam.color}</span>
        </div>
        <div class="stat-box">
          <span class="stat-label">משקל היידי</span>
          <span class="stat-value" style="font-size:1.2rem;">${dam.currentWeightKg ? `${dam.currentWeightKg} ק"ג` : 'טרם הוזן עדכני'}</span>
          <span class="stat-sub">עבר: ${dam.reportedPastWeightKg}</span>
        </div>
        <div class="stat-box">
          <span class="stat-label">תרופות / תוספים במרשם</span>
          <span class="stat-value" style="font-size:1.05rem;">${dam.prescribedMeds || 'לא הוזנו תרופות במרשם'}</span>
          <span class="stat-sub">להזנה ידנית לפי מרשם וטרינר בלבד</span>
        </div>
        <div class="stat-box">
          <span class="stat-label">רשומות מעקב אם</span>
          <span class="stat-value" style="font-size:1.3rem;">${this.formatNum(logs.length)}</span>
          <span class="stat-sub">${logs.length > 0 ? `אחרון: ${this.formatDateTimeIL(logs[0].eventAt)}` : 'טרם נרשמו בדיקות יומיות'}</span>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">📋 יומן מעקב יומי אחר היידי (${this.formatNum(logs.length)})</h3>
          <button class="btn btn-sm btn-primary" onclick="HeidiApp.openDamLogModal()">➕ רישום בדיקה להיידי</button>
        </div>

        ${logs.length === 0 ? `
          <div style="padding:28px; text-align:center; color:var(--text-muted); background:var(--surface-muted); border-radius:var(--radius-sm);">
            טרם תועדו כרטיסי מעקב יומיים להיידי. לחצי על <strong>"➕ הוספת כרטיס מעקב יומי להיידי"</strong> כדי לתעד תיאבון, שתייה, עטינים והפרשות.
          </div>
        ` : `
          <div class="timeline-list">
            ${logs.map((l, idx) => `
              <div class="timeline-item" style="border-right-color: ${l.hasRedFlag ? 'var(--danger)' : 'var(--primary)'};">
                <div style="flex:1;">
                  <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:6px;">
                    <span class="puppy-id-badge">#${logs.length - idx}</span>
                    <strong style="font-size:1.04rem;">${this.formatDateTimeIL(l.eventAt)}</strong>
                    ${l.temperatureC ? `<span class="status-badge status-watch">🌡️ חום: ${l.temperatureC}°C</span>` : ''}
                    ${l.weightKg ? `<span class="status-badge status-with_dam">⚖️ משקל: ${l.weightKg} ק"ג</span>` : ''}
                    ${l.hasRedFlag ? `<span class="status-badge status-vet_care">🚨 דורש התייעצות עם הווטרינר/ית!</span>` : `<span class="status-badge status-with_dam">✓ תקין</span>`}
                  </div>
                  <div style="font-size:0.9rem; display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:6px 14px;">
                    <span><strong>תיאבון:</strong> ${l.appetite}</span>
                    <span><strong>שתייה:</strong> ${l.drinking}</span>
                    <span><strong>שתן וצואה:</strong> ${l.elimination}</span>
                    <span><strong>מצב רוח/חיוניות:</strong> ${l.mood}</span>
                    <span><strong>הפרשות (ריח):</strong> ${l.dischargeSmell}</span>
                    <span><strong>מגמת הפרשות:</strong> ${l.dischargeTrend} ${l.dischargeColorQty ? `(${l.dischargeColorQty})` : ''}</span>
                    <span><strong>מצב העטינים:</strong> ${l.mammaryState}</span>
                    <span><strong>הנקה ואימהות:</strong> ${l.maternalBehavior}</span>
                  </div>
                  ${l.medsGiven ? `<div style="margin-top:6px; font-size:0.86rem; color:var(--info-text);"><strong>💊 תרופות/תוספים שניתנו (לפי הוראת וטרינר):</strong> ${l.medsGiven}</div>` : ''}
                  ${l.notes ? `<div style="margin-top:4px; font-size:0.88rem;"><strong>הערות:</strong> ${l.notes}</div>` : ''}
                </div>
                <div style="display:flex; align-items:center; gap:6px;">
                  ${l.photoDataUrl ? `<img src="${l.photoDataUrl}" style="width:52px; height:52px; object-fit:cover; border-radius:8px;" />` : ''}
                  <button class="btn btn-sm btn-danger" onclick="HeidiApp.confirmDeleteDamLog('${l.id}')">🗑️</button>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
  },

  openDamLogModal() {
    const dtVal = this.nowLocalInputValue();
    const modalBody = document.getElementById('appModalContent');
    modalBody.innerHTML = `
      <div class="card-header">
        <h3 class="card-title">🦮 כרטיס מעקב יומי אחר היידי (סעיף 7 באפיון)</h3>
        <button class="btn btn-sm btn-secondary" onclick="HeidiApp.closeModal()">✖ סגירה</button>
      </div>
      <form onsubmit="HeidiApp.submitDamLogForm(event)">
        <div class="form-grid">
          <div class="form-group">
            <label>תאריך ושעה</label>
            <input type="datetime-local" id="dlog_eventAt" class="form-control" value="${dtVal}" required />
          </div>
          <div class="form-group">
            <label>חום גוף ב-°C (רק אם נמדד נכון ובהנחיית וטרינר)</label>
            <input type="number" step="0.1" id="dlog_temp" class="form-control" placeholder="למשל: 38.4 (אופציונלי)" />
          </div>
          <div class="form-group">
            <label>תיאבון</label>
            <select id="dlog_appetite" class="form-control">
              <option value="תקין / אוכלת בתיאבון">תקין / אוכלת בתיאבון</option>
              <option value="מוגבר">מוגבר</option>
              <option value="ירוד מעט">ירוד מעט</option>
              <option value="חוסר תיאבון משמעותי">חוסר תיאבון משמעותי (דורש וטרינר)</option>
            </select>
          </div>
          <div class="form-group">
            <label>שתייה</label>
            <select id="dlog_drinking" class="form-control">
              <option value="תקינה">תקינה</option>
              <option value="מרובה">מרובה</option>
              <option value="מועטה / לא שותה">מועטה / לא שותה</option>
            </select>
          </div>
          <div class="form-group">
            <label>מתן שתן וצואה</label>
            <select id="dlog_elim" class="form-control">
              <option value="תקין">תקין</option>
              <option value="צואה רכה / שלשול">צואה רכה / שלשול</option>
              <option value="עצירות / קושי">עצירות / קושי</option>
              <option value="לא נצפה">לא נצפה</option>
            </select>
          </div>
          <div class="form-group">
            <label>מצב רוח וחיוניות</label>
            <select id="dlog_mood" class="form-control">
              <option value="ערנית ורגועה">ערנית ורגועה</option>
              <option value="עייפה אחרי המלטה/הנקה">עייפה אחרי המלטה/הנקה</option>
              <option value="חסרת מנוחה / מתנשפת">חסרת מנוחה / מתנשפת</option>
              <option value="אפטית / חלשה מאוד">אפטית / חלשה מאוד (דורש וטרינר)</option>
            </select>
          </div>
          <div class="form-group">
            <label>ריח הפרשות (לוכיה)</label>
            <select id="dlog_smell" class="form-control">
              <option value="ללא ריח רע (תקין)">ללא ריח רע (תקין)</option>
              <option value="ריח רע / חריג">ריח רע / חריג (דורש וטרינר!)</option>
            </select>
          </div>
          <div class="form-group">
            <label>מגמת ההפרשות</label>
            <select id="dlog_trend" class="form-control">
              <option value="במגמת ירידה / רגילה">במגמת ירידה / רגילה</option>
              <option value="ללא הפרשות">ללא הפרשות</option>
              <option value="מתגברת / דימום טרי">מתגברת / דימום טרי (דורש וטרינר!)</option>
            </select>
          </div>
          <div class="form-group">
            <label>צבע וכמות ההפרשה</label>
            <input type="text" id="dlog_dischargeDesc" class="form-control" placeholder="למשל: אדומה-חומה כהה, כמות קטנה" />
          </div>
          <div class="form-group">
            <label>מצב העטינים</label>
            <select id="dlog_mammary" class="form-control">
              <option value="רכים ותקינים">רכים ותקינים</option>
              <option value="מלאים בחלב (ללא כאב או אודם)">מלאים בחלב (ללא כאב או אודם)</option>
              <option value="אודם / חום / כאב / קושי">אודם / חום / כאב / קושי (דורש וטרינר!)</option>
            </select>
          </div>
          <div class="form-group">
            <label>הנקה והתנהגות אימהית</label>
            <select id="dlog_maternal" class="form-control">
              <option value="מניקה ומטפלת היטב">מניקה ומטפלת היטב</option>
              <option value="זקוקה לעידוד/השגחה בהנקה">זקוקה לעידוד/השגחה בהנקה</option>
              <option value="התנהגות חריגה / דחייה">התנהגות חריגה / דחייה (דורש וטרינר!)</option>
            </select>
          </div>
          <div class="form-group">
            <label>משקל היידי בק"ג (אופציונלי)</label>
            <input type="text" id="dlog_weight" class="form-control" placeholder="למשל: 33.0" />
          </div>
        </div>

        <div class="form-group">
          <label>💊 תרופות / תוספים שניתנו לפי הוראות הווטרינר/ית בלבד</label>
          <input type="text" id="dlog_meds" class="form-control" placeholder="להזנה רק אם ניתנו בהוראת וטרינר" />
        </div>
        <div class="form-group">
          <label>📷 תמונה (אופציונלי)</label>
          <input type="file" accept="image/*" class="form-control" onchange="HeidiApp.handleGenericPhotoUpload(this, 'dlog_photoDataUrl', 'dlog_photoPreview')" />
          <input type="hidden" id="dlog_photoDataUrl" value="" />
          <div id="dlog_photoPreview" style="margin-top:6px;"></div>
        </div>
        <div class="form-group">
          <label>הערות חופשיות</label>
          <textarea id="dlog_notes" class="form-control" rows="2" placeholder="הערות..."></textarea>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:12px;">
          <button type="button" class="btn btn-secondary" onclick="HeidiApp.closeModal()">ביטול</button>
          <button type="submit" class="btn btn-primary">💾 שמירת מעקב יומי להיידי</button>
        </div>
      </form>
    `;
    document.getElementById('appModalBackdrop').classList.add('open');
  },

  submitDamLogForm(e) {
    e.preventDefault();
    const entry = window.HeidiStore.addDamDailyLog({
      eventAt: document.getElementById('dlog_eventAt').value,
      temperatureC: document.getElementById('dlog_temp').value,
      appetite: document.getElementById('dlog_appetite').value,
      drinking: document.getElementById('dlog_drinking').value,
      elimination: document.getElementById('dlog_elim').value,
      mood: document.getElementById('dlog_mood').value,
      dischargeSmell: document.getElementById('dlog_smell').value,
      dischargeTrend: document.getElementById('dlog_trend').value,
      dischargeColorQty: document.getElementById('dlog_dischargeDesc').value,
      mammaryState: document.getElementById('dlog_mammary').value,
      maternalBehavior: document.getElementById('dlog_maternal').value,
      weightKg: document.getElementById('dlog_weight').value,
      medsGiven: document.getElementById('dlog_meds').value,
      photoDataUrl: document.getElementById('dlog_photoDataUrl').value,
      notes: document.getElementById('dlog_notes').value
    });
    this.closeModal();
    this.switchTab(this.activeTab);
    if (entry.hasRedFlag) {
      alert('⚠️ שימי לב: אחד המדדים שהוזנו להיידי (כגון ריח חריג, מצב עטינים, אפתיה או חוסר תיאבון) מחייב התייעצות עם הווטרינר/ית!');
    }
  },

  confirmDeleteDamLog(logId) {
    if (!confirm('⚠️ למחוק רשומת מעקב זו של היידי?')) return;
    window.HeidiStore.deleteDamDailyLog(logId);
    this.switchTab(this.activeTab);
  },

  // ========================================================================
  // 7. שלב ג': לשונית "📋 יומן ומשימות" (צ'קליסט 20 פריטים, סביבה וטמפרטורה, אבני דרך ויומן חופשי)
  // ========================================================================
  setTasksSubTab(sub) {
    this.tasksSubTab = sub;
    this.renderTasksAndJournalView(document.getElementById('mainViewContainer'));
  },

  renderTasksAndJournalView(container) {
    const store = window.HeidiStore;
    const tasks = store.state.tasks || [];
    const doneCount = tasks.filter(t => t.status === 'done').length;
    const inProgCount = tasks.filter(t => t.status === 'in_progress').length;

    let innerContentHtml = '';

    if (this.tasksSubTab === 'checklist') {
      const statusOptions = [
        { val: 'not_started', label: 'לא התחיל' },
        { val: 'in_progress', label: 'בתהליך' },
        { val: 'done', label: 'הושלם ✓' }
      ];

      innerContentHtml = `
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">✅ רשימת ציוד, סביבה ותיאום להמלטה (${doneCount} הושלמו · ${inProgCount} בתהליך · מתוך ${tasks.length})</h3>
              <p style="font-size:0.84rem; color:var(--text-muted);">
                לפי סעיף 3 במסמך האפיון — סמני סטטוס ("לא התחיל / בתהליך / הושלם") ותעדי הערות לכל פריט
              </p>
            </div>
            <button class="btn btn-sm btn-primary" onclick="HeidiApp.openNewTaskModal()">➕ הוספת משימה חדשה</button>
          </div>

          <div class="table-scroll-bottom">
            <table class="rtl-table">
              <thead>
                <tr>
                  <th style="width:52px;">מס"ד</th>
                  <th style="width:130px;">קטגוריה</th>
                  <th>פריט ציוד / משימת היערכות</th>
                  <th style="width:150px;">סטטוס</th>
                  <th style="width:240px;">הערות אישיות</th>
                </tr>
              </thead>
              <tbody>
                ${tasks.map((t, idx) => `
                  <tr>
                    <td class="td-center"><strong>${idx + 1}</strong></td>
                    <td class="td-center"><span class="puppy-id-badge">${t.category}</span></td>
                    <td class="td-right" style="${t.status === 'done' ? 'text-decoration:line-through; color:var(--text-muted);' : 'font-weight:700;'}">
                      ${t.title}
                    </td>
                    <td class="td-center">
                      <select class="form-control" style="min-height:36px; padding:4px 8px; font-size:0.85rem; font-weight:700;"
                        onchange="HeidiApp.updateChecklistStatus('${t.id}', this.value)">
                        ${statusOptions.map(o => `<option value="${o.val}" ${t.status === o.val ? 'selected' : ''}>${o.label}</option>`).join('')}
                      </select>
                    </td>
                    <td class="td-right">
                      <input type="text" class="form-control" style="min-height:36px; padding:4px 8px; font-size:0.85rem;"
                        value="${t.notes || ''}" placeholder="הערה..."
                        onchange="HeidiApp.updateChecklistNote('${t.id}', this.value)" />
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } else if (this.tasksSubTab === 'environment') {
      const envLogs = (store.state.environmentLogs || []).slice().sort((a, b) => new Date(b.eventAt).getTime() - new Date(a.eventAt).getTime());
      innerContentHtml = `
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">🌡️ סביבת הגורים — מעקב טמפרטורה, לחות ובטיחות (סעיף 8 באפיון)</h3>
              <p style="font-size:0.84rem; color:var(--text-muted);">
                גורים שזה עתה נולדו אינם מווסתים היטב את חום גופם · יש לעקוב אחר טמפרטורת אזור הגורים עצמו
              </p>
            </div>
            <button class="btn btn-primary" onclick="HeidiApp.openEnvLogModal()">➕ תיעוד טמפרטורה ולחות</button>
          </div>

          <div class="alert-box alert-warning" style="font-size:0.86rem;">
            <div>
              <strong>🔥 כללי בטיחות וטמפרטורה באזור הגורים:</strong>
              <ul style="margin-top:4px; padding-right:18px;">
                <li>מקורות מקצועיים מציינים טווחים סביב <strong>29 עד 32 מעלות צלזיוס</strong> באזור הגורים בימים הראשונים (נקודת ייחוס בלבד התלויה בגודל השגר, בנוכחות היידי, בלחות ובמבנה הארגז).</li>
                <li>חובה ליצור בארגז <strong>אזור חם ואזור קריר יותר</strong>, כדי שהיידי והגורים יוכלו לבחור ולהתרחק ממקור החום.</li>
                <li>להימנע מכרית חימום/משטח חם במגע ישיר עם גורים, וממנורה שעלולה לגרום לכוויה או להתחממות יתר.</li>
                <li><strong>אזהרה קריטית:</strong> אין לחמם גור קר באמצעות האכלה לפני שהתייעצתם וקיבלתם הנחיה מקצועית (היפותרמיה פוגעת בעיכול וביכולת היניקה).</li>
              </ul>
            </div>
          </div>

          <h4 style="margin:12px 0 8px; font-size:1rem;">📈 גרף מעקב טמפרטורה באזור הגורים (°C)</h4>
          <div id="envChartContainer" class="chart-container"></div>

          <h4 style="margin:16px 0 8px; font-size:1rem;">📋 היסטוריית מדידות טמפרטורה ולחות (${envLogs.length})</h4>
          ${envLogs.length === 0 ? `
            <p style="color:var(--text-muted); padding:16px; text-align:center;">טרם הוזנו מדידות סביבתיות.</p>
          ` : `
            <div class="table-scroll-bottom">
              <table class="rtl-table">
                <thead>
                  <tr>
                    <th style="width:52px;">מס"ד</th>
                    <th>תאריך ושעה</th>
                    <th>טמפרטורה באזור הגורים</th>
                    <th>לחות (%)</th>
                    <th>מקור חימום והערות</th>
                    <th>פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  ${envLogs.map((e, idx) => `
                    <tr>
                      <td class="td-center"><strong>${envLogs.length - idx}</strong></td>
                      <td class="td-center">${this.formatDateTimeIL(e.eventAt)}</td>
                      <td class="td-center"><strong>${this.formatNum(e.tempC, 1)}°C</strong></td>
                      <td class="td-center">${e.humidityPct !== null ? `${this.formatNum(e.humidityPct)}%` : '—'}</td>
                      <td class="td-right">${e.notes || '—'}</td>
                      <td class="td-center">
                        <button class="btn btn-sm btn-danger" onclick="HeidiApp.confirmDeleteEnvLog('${e.id}')">🗑️</button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      `;
    } else if (this.tasksSubTab === 'milestones') {
      const milestones = store.state.milestones || [];
      const statusOptions = [
        { val: 'not_started', label: 'טרם הגיע' },
        { val: 'in_progress', label: 'בתהליך כעת' },
        { val: 'done', label: 'הושלם ✓' }
      ];
      innerContentHtml = `
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">🌱 ציר זמן אבני דרך להתפתחות הגורים (סעיף 6 באפיון)</h3>
              <p style="font-size:0.84rem; color:var(--text-muted);">
                ניתן לעדכן סטטוס ולהתאים לפי הנחיות הווטרינר/ית · אין לקבוע טיפול, חיסון או תילוע אוטומטית לפי גיל בלי אישור וטרינרי
              </p>
            </div>
          </div>

          <div class="table-scroll-bottom">
            <table class="rtl-table">
              <thead>
                <tr>
                  <th style="width:52px;">מס"ד</th>
                  <th style="width:150px;">טווח גילאים</th>
                  <th>אבן דרך והנחיה</th>
                  <th style="width:150px;">סטטוס</th>
                  <th style="width:240px;">תיעוד בפועל / הנחיית וטרינר</th>
                </tr>
              </thead>
              <tbody>
                ${milestones.map((m, idx) => `
                  <tr>
                    <td class="td-center"><strong>${idx + 1}</strong></td>
                    <td class="td-center"><span class="puppy-id-badge">${m.timeframe}</span></td>
                    <td class="td-right"><strong>${m.title}</strong></td>
                    <td class="td-center">
                      <select class="form-control" style="min-height:36px; padding:4px 8px; font-size:0.85rem; font-weight:700;"
                        onchange="HeidiApp.updateMilestoneField('${m.id}', 'status', this.value)">
                        ${statusOptions.map(o => `<option value="${o.val}" ${m.status === o.val ? 'selected' : ''}>${o.label}</option>`).join('')}
                      </select>
                    </td>
                    <td class="td-right">
                      <input type="text" class="form-control" style="min-height:36px; padding:4px 8px; font-size:0.85rem;"
                        value="${m.vetNotes || ''}" placeholder="תאריך ביצוע / הערת וטרינר..."
                        onchange="HeidiApp.updateMilestoneField('${m.id}', 'vetNotes', this.value)" />
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } else if (this.tasksSubTab === 'journal') {
      const unified = this.getUnifiedJournalEntries();
      innerContentHtml = `
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">📖 יומן מרכזי מאוחד — חיפוש וסינון (סעיפים 6 ו-10 באפיון)</h3>
              <p style="font-size:0.84rem; color:var(--text-muted);">
                מרכז את כל הרשומות במערכת (המלטה, שקילות, הנקה, תצפיות בריאות, היידי, סביבה והערות חופשיות)
              </p>
            </div>
            <button class="btn btn-primary" onclick="HeidiApp.openFreeJournalModal()">➕ כתיבת רשומה חופשית ביומן</button>
          </div>

          <div class="form-grid" style="margin-bottom:14px;">
            <div class="form-group" style="margin-bottom:0;">
              <label>🔍 חיפוש חופשי ביומן</label>
              <input type="text" class="form-control" value="${this.journalSearchQuery}" placeholder="חפשי לפי שם גור, צבע סרט, מילה, הערה..."
                oninput="HeidiApp.updateJournalFilter(this.value, null)" />
            </div>
            <div class="form-group" style="margin-bottom:0;">
              <label>📂 סינון לפי קטגוריה</label>
              <select class="form-control" onchange="HeidiApp.updateJournalFilter(null, this.value)">
                <option value="all" ${this.journalFilterType === 'all' ? 'selected' : ''}>כל סוגי הרשומות (${unified.length})</option>
                <option value="note" ${this.journalFilterType === 'note' ? 'selected' : ''}>📝 רשומות יומן חופשיות</option>
                <option value="labor" ${this.journalFilterType === 'labor' ? 'selected' : ''}>⏱️ אירועי המלטה</option>
                <option value="weight" ${this.journalFilterType === 'weight' ? 'selected' : ''}>⚖️ שקילות גורים</option>
                <option value="feeding" ${this.journalFilterType === 'feeding' ? 'selected' : ''}>🍼 הנקות והאכלות</option>
                <option value="health" ${this.journalFilterType === 'health' ? 'selected' : ''}>🩺 תצפיות בריאות גורים</option>
                <option value="dam" ${this.journalFilterType === 'dam' ? 'selected' : ''}>🦮 מעקב היידי (האם)</option>
                <option value="env" ${this.journalFilterType === 'env' ? 'selected' : ''}>🌡️ טמפרטורת סביבה</option>
              </select>
            </div>
          </div>

          <div id="unifiedJournalListContainer">
            ${this.renderUnifiedJournalListHtml(unified)}
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="card">
        <div class="card-header" style="margin-bottom:0;">
          <div>
            <h2 class="card-title">📋 הכנה להמלטה, סביבת הגורים, אבני דרך ויומן</h2>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button class="btn btn-sm ${this.tasksSubTab === 'checklist' ? 'btn-primary' : 'btn-secondary'}" onclick="HeidiApp.setTasksSubTab('checklist')">
              ✅ צ'קליסט ציוד (${doneCount}/${tasks.length})
            </button>
            <button class="btn btn-sm ${this.tasksSubTab === 'environment' ? 'btn-primary' : 'btn-secondary'}" onclick="HeidiApp.setTasksSubTab('environment')">
              🌡️ טמפרטורה וסביבה
            </button>
            <button class="btn btn-sm ${this.tasksSubTab === 'milestones' ? 'btn-primary' : 'btn-secondary'}" onclick="HeidiApp.setTasksSubTab('milestones')">
              🌱 אבני דרך להתפתחות
            </button>
            <button class="btn btn-sm ${this.tasksSubTab === 'journal' ? 'btn-primary' : 'btn-secondary'}" onclick="HeidiApp.setTasksSubTab('journal')">
              📖 יומן וחיפוש
            </button>
          </div>
        </div>
      </div>

      ${innerContentHtml}
    `;

    if (this.tasksSubTab === 'environment') {
      window.HeidiCharts.renderEnvironmentChart('envChartContainer');
    }
  },

  updateChecklistStatus(taskId, status) {
    window.HeidiStore.updateTaskItem(taskId, { status });
    this.renderTasksAndJournalView(document.getElementById('mainViewContainer'));
  },

  updateChecklistNote(taskId, notes) {
    window.HeidiStore.updateTaskItem(taskId, { notes });
  },

  updateMilestoneField(msId, field, value) {
    window.HeidiStore.updateMilestone(msId, { [field]: value });
  },

  openNewTaskModal() {
    const modalBody = document.getElementById('appModalContent');
    modalBody.innerHTML = `
      <div class="card-header">
        <h3 class="card-title">➕ הוספת משימה או פריט ציוד לצ'קליסט</h3>
        <button class="btn btn-sm btn-secondary" onclick="HeidiApp.closeModal()">✖ סגירה</button>
      </div>
      <form onsubmit="HeidiApp.submitNewTaskForm(event)">
        <div class="form-group">
          <label>קטגוריה</label>
          <select id="nt_cat" class="form-control">
            <option value="ציוד וסביבה">ציוד וסביבה</option>
            <option value="תיאום והיערכות">תיאום והיערכות</option>
            <option value="משימות ותזכורות">משימות ותזכורות</option>
          </select>
        </div>
        <div class="form-group">
          <label>תיאור המשימה / הציוד</label>
          <input type="text" id="nt_title" class="form-control" required placeholder="מה צריך להכין או לבצע?" />
        </div>
        <div class="form-group">
          <label>הערות</label>
          <input type="text" id="nt_notes" class="form-control" placeholder="אופציונלי" />
        </div>
        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:12px;">
          <button type="button" class="btn btn-secondary" onclick="HeidiApp.closeModal()">ביטול</button>
          <button type="submit" class="btn btn-primary">💾 הוספה לצ'קליסט</button>
        </div>
      </form>
    `;
    document.getElementById('appModalBackdrop').classList.add('open');
  },

  submitNewTaskForm(e) {
    e.preventDefault();
    window.HeidiStore.addTaskItem({
      category: document.getElementById('nt_cat').value,
      title: document.getElementById('nt_title').value,
      notes: document.getElementById('nt_notes').value,
      status: 'not_started'
    });
    this.closeModal();
    this.renderTasksAndJournalView(document.getElementById('mainViewContainer'));
  },

  openEnvLogModal() {
    const dtVal = this.nowLocalInputValue();
    const modalBody = document.getElementById('appModalContent');
    modalBody.innerHTML = `
      <div class="card-header">
        <h3 class="card-title">🌡️ תיעוד טמפרטורה ולחות באזור הגורים</h3>
        <button class="btn btn-sm btn-secondary" onclick="HeidiApp.closeModal()">✖ סגירה</button>
      </div>
      <form onsubmit="HeidiApp.submitEnvLogForm(event)">
        <div class="form-grid">
          <div class="form-group">
            <label>תאריך ושעה</label>
            <input type="datetime-local" id="env_eventAt" class="form-control" value="${dtVal}" required />
          </div>
          <div class="form-group">
            <label>טמפרטורה באזור הגורים (°C)</label>
            <input type="number" step="0.1" id="env_temp" class="form-control" placeholder="למשל: 30.2" required autofocus />
          </div>
          <div class="form-group">
            <label>לחות יחסית ב-% (אופציונלי)</label>
            <input type="number" step="1" min="0" max="100" id="env_hum" class="form-control" placeholder="למשל: 55" />
          </div>
        </div>
        <div class="form-group">
          <label>הערות (מיקום המדחום, התנהגות הגורים ביחס למקור החום)</label>
          <input type="text" id="env_notes" class="form-control" placeholder="למשל: הגורים ישנים רגועים באמצע הארגז" />
        </div>
        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:12px;">
          <button type="button" class="btn btn-secondary" onclick="HeidiApp.closeModal()">ביטול</button>
          <button type="submit" class="btn btn-primary">💾 שמירת מדידה</button>
        </div>
      </form>
    `;
    document.getElementById('appModalBackdrop').classList.add('open');
  },

  submitEnvLogForm(e) {
    e.preventDefault();
    try {
      window.HeidiStore.addEnvironmentLog({
        eventAt: document.getElementById('env_eventAt').value,
        tempC: document.getElementById('env_temp').value,
        humidityPct: document.getElementById('env_hum').value,
        notes: document.getElementById('env_notes').value
      });
      this.closeModal();
      this.renderTasksAndJournalView(document.getElementById('mainViewContainer'));
    } catch (err) {
      alert(err.message);
    }
  },

  confirmDeleteEnvLog(envId) {
    if (!confirm('⚠️ למחוק מדידת טמפרטורה זו?')) return;
    window.HeidiStore.deleteEnvironmentLog(envId);
    this.renderTasksAndJournalView(document.getElementById('mainViewContainer'));
  },

  openFreeJournalModal() {
    const dtVal = this.nowLocalInputValue();
    const modalBody = document.getElementById('appModalContent');
    modalBody.innerHTML = `
      <div class="card-header">
        <h3 class="card-title">📝 כתיבת רשומה חופשית ביומן</h3>
        <button class="btn btn-sm btn-secondary" onclick="HeidiApp.closeModal()">✖ סגירה</button>
      </div>
      <form onsubmit="HeidiApp.submitFreeJournalForm(event)">
        <div class="form-grid">
          <div class="form-group">
            <label>כותרת קצרה</label>
            <input type="text" id="jrn_title" class="form-control" required placeholder="למשל: שיחה עם הווטרינרית / הערת לילה" />
          </div>
          <div class="form-group">
            <label>תאריך ושעה</label>
            <input type="datetime-local" id="jrn_eventAt" class="form-control" value="${dtVal}" required />
          </div>
        </div>
        <div class="form-group">
          <label>תוכן הרשומה</label>
          <textarea id="jrn_content" class="form-control" rows="3" required placeholder="תיעוד חופשי..."></textarea>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:12px;">
          <button type="button" class="btn btn-secondary" onclick="HeidiApp.closeModal()">ביטול</button>
          <button type="submit" class="btn btn-primary">💾 שמירה ביומן</button>
        </div>
      </form>
    `;
    document.getElementById('appModalBackdrop').classList.add('open');
  },

  submitFreeJournalForm(e) {
    e.preventDefault();
    window.HeidiStore.addFreeJournalNote({
      title: document.getElementById('jrn_title').value,
      eventAt: document.getElementById('jrn_eventAt').value,
      content: document.getElementById('jrn_content').value
    });
    this.closeModal();
    this.renderTasksAndJournalView(document.getElementById('mainViewContainer'));
  },

  confirmDeleteJournalNote(noteId) {
    if (!confirm('⚠️ למחוק רשומת יומן זו?')) return;
    window.HeidiStore.deleteFreeJournalNote(noteId);
    this.renderTasksAndJournalView(document.getElementById('mainViewContainer'));
  },

  getUnifiedJournalEntries() {
    const s = window.HeidiStore.state;
    const pupMap = new Map(s.puppies.map(p => [p.id, p]));
    const items = [];

    (s.journalNotes || []).forEach(n => {
      items.push({
        type: 'note',
        badge: '📝 יומן חופשי',
        eventAt: n.eventAt,
        title: n.title,
        text: n.content,
        deleteFn: `HeidiApp.confirmDeleteJournalNote('${n.id}')`
      });
    });

    (s.laborEvents || []).forEach(ev => {
      const tInfo = window.LABOR_EVENT_TYPES[ev.eventType] || { label: ev.eventType, icon: '⏱️' };
      items.push({
        type: 'labor',
        badge: `${tInfo.icon} המלטה`,
        eventAt: ev.eventAt,
        title: tInfo.label,
        text: ev.description || ''
      });
    });

    (s.weightEntries || []).forEach(w => {
      const p = pupMap.get(w.puppyId);
      const pName = p ? `${p.code} (${p.name} - סרט ${p.ribbonColorName})` : 'גור';
      items.push({
        type: 'weight',
        badge: '⚖️ שקילה',
        eventAt: w.eventAt,
        title: `${pName}: ${this.formatNum(w.weightG)} גרם`,
        text: w.notes || ''
      });
    });

    (s.feedingEntries || []).forEach(f => {
      const p = pupMap.get(f.puppyId);
      const pName = p ? `${p.code} (${p.name} - סרט ${p.ribbonColorName})` : 'גור';
      items.push({
        type: 'feeding',
        badge: '🍼 הנקה/האכלה',
        eventAt: f.eventAt,
        title: `${pName} · ${f.feedingType}`,
        text: `יניקה יעילה: ${f.effectiveLatch} ${f.durationMinutes ? `· ${f.durationMinutes} דק׳` : ''} ${f.notes ? `· ${f.notes}` : ''}`
      });
    });

    (s.healthObservations || []).forEach(h => {
      const p = pupMap.get(h.puppyId);
      const pName = p ? `${p.code} (${p.name} - סרט ${p.ribbonColorName})` : 'גור';
      items.push({
        type: 'health',
        badge: '🩺 בריאות גור',
        eventAt: h.eventAt,
        title: `${pName} · ${h.activityVitality}`,
        text: `יניקה: ${h.suckleReflex} | חום למגע: ${h.warmthToTouch} ${h.vetExamDiagnosisTreatment ? `| וטרינר: ${h.vetExamDiagnosisTreatment}` : ''} ${h.notes ? `| ${h.notes}` : ''}`
      });
    });

    (s.damDailyLogs || []).forEach(d => {
      items.push({
        type: 'dam',
        badge: '🦮 מעקב היידי',
        eventAt: d.eventAt,
        title: `תיאבון: ${d.appetite} · עטינים: ${d.mammaryState}`,
        text: `הפרשות: ${d.dischargeSmell} (${d.dischargeTrend}) ${d.temperatureC ? `· חום: ${d.temperatureC}°C` : ''} ${d.notes ? `· ${d.notes}` : ''}`
      });
    });

    (s.environmentLogs || []).forEach(e => {
      items.push({
        type: 'env',
        badge: '🌡️ סביבה',
        eventAt: e.eventAt,
        title: `טמפרטורה: ${e.tempC}°C ${e.humidityPct !== null ? `· לחות: ${e.humidityPct}%` : ''}`,
        text: e.notes || ''
      });
    });

    return items.sort((a, b) => new Date(b.eventAt).getTime() - new Date(a.eventAt).getTime());
  },

  updateJournalFilter(query, type) {
    if (query !== null) this.journalSearchQuery = query;
    if (type !== null) this.journalFilterType = type;
    const listEl = document.getElementById('unifiedJournalListContainer');
    if (listEl) {
      listEl.innerHTML = this.renderUnifiedJournalListHtml(this.getUnifiedJournalEntries());
    }
  },

  renderUnifiedJournalListHtml(allItems) {
    const q = (this.journalSearchQuery || '').trim().toLowerCase();
    const filtered = allItems.filter(item => {
      if (this.journalFilterType !== 'all' && item.type !== this.journalFilterType) return false;
      if (q) {
        const hay = `${item.badge} ${item.title} ${item.text} ${this.formatDateTimeIL(item.eventAt)}`.toLowerCase();
        return hay.includes(q);
      }
      return true;
    });

    if (filtered.length === 0) {
      return `<div style="padding:24px; text-align:center; color:var(--text-muted);">לא נמצאו רשומות התואמות לחיפוש או לסינון הנוכחי.</div>`;
    }

    return `
      <div class="timeline-list">
        ${filtered.map(item => `
          <div class="timeline-item">
            <div style="flex:1;">
              <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                <span class="puppy-id-badge">${item.badge}</span>
                <strong>${item.title}</strong>
                <span style="color:var(--text-muted); font-size:0.84rem;">${this.formatDateTimeIL(item.eventAt)}</span>
              </div>
              ${item.text ? `<div style="margin-top:4px; font-size:0.9rem;">${item.text}</div>` : ''}
            </div>
            ${item.deleteFn ? `<button class="btn btn-sm btn-danger" onclick="${item.deleteFn}">🗑️</button>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  },

  // ========================================================================
  // 8. שלב ד': לשונית "📚 ידע והנחיות וטרינריות" (סעיף 15 במסמך האפיון)
  // ========================================================================
  renderKnowledgeView(container) {
    const dam = window.HeidiStore.state.dam;
    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">📚 מדריך ידע והנחיות וטרינריות להמלטה ולטיפול בגורים</h2>
            <p style="font-size:0.86rem; color:var(--text-muted);">
              <strong>תאריך עדכון מדריך הידע ומועד גישה למקורות:</strong> 08.11.2026 · מבוסס על בתי ספר לרפואה וטרינרית וספרי רפואה וטרינרית (Cornell, Merck Veterinary Manual, VCA)
            </p>
          </div>
        </div>

        <div class="alert-box alert-danger" style="margin-bottom:0; font-size:0.88rem;">
          <div>
            <strong>⚠️ הבהרה רפואית מחייבת (סעיפים 1 ו-15 באפיון):</strong>
            המידע בעמוד זה מוצג כמידע כללי בלבד ואינו מהווה תחליף לייעוץ, אבחון או טיפול וטרינרי פרטני.
            <strong>הנחיות הווטרינר/ית המטפל/ת בהיידי גוברות תמיד על כל ברירת מחדל במערכת.</strong>
            המערכת אינה מייצרת אבחנה רפואית על סמך משקל, תמונה או תיאור.
          </div>
        </div>

        ${dam.vetInstructions ? `
          <div class="alert-box alert-info" style="margin-top:12px; margin-bottom:0; font-size:0.88rem;">
            <div>
              <strong>🩺 הנחיות הווטרינר/ית האישיות שהוזנו להיידי (גוברות על ברירות המחדל):</strong><br/>
              ${dam.vetInstructions}
            </div>
          </div>
        ` : ''}
      </div>

      <div class="knowledge-grid">
        <!-- כרטיס ידע 1: שלבי ההמלטה וסימנים מקדימים -->
        <div class="card" style="margin-bottom:0;">
          <h3 class="card-title" style="margin-bottom:10px; color:var(--primary-dark);">1. סימנים מקדימים ושלבי ההמלטה</h3>
          <ul style="padding-right:18px; font-size:0.9rem; display:flex; flex-direction:column; gap:8px;">
            <li><strong>ירידת חום מקדימה (לפי Cornell ו-Merck):</strong> חום גוף רקטלי תקין של כלבה נע סביב <code>37.8°C עד 39.2°C</code>. כ-8 עד 24 שעות לפני תחילת ההמלטה (עקב ירידת פרוגסטרון), חום הגוף צונח לרוב מתחת ל-<code>37.2°C</code> (סביב <code>36.7°C עד 37.2°C</code> / מתחת ל-<code>99°F</code>). מדידת חום להיידי תתבצע רק אם הווטרינר/ית הנחה/תה לכך.</li>
            <li><strong>שלב ראשון (פתיחת צוואר הרחם והכנה):</strong> נמשך לרוב 6 עד 12 שעות (ובממליטות בפעם הראשונה כמו היידי עשוי להימשך עד 24 עד 36 שעות לפי Cornell). מופיעים אי-שקט, קינון, התנשפות, רעד, ירידה בתיאבון ולעיתים הקאה או הפרשה שקופה/רירית, ללא לחיצות בטן חיצוניות חזקות.</li>
            <li><strong>שלב שני (יציאת הגורים):</strong> התכווצויות ולחיצות בטן נראות לעין ולידת הגורים. גם מצג קדמי (ראש וכפות קדמיות) וגם מצג אחורי (רגליים אחוריות) נחשבים תקינים בכלבים כל עוד הגפיים ישרות.</li>
            <li><strong>שלב שלישי (יציאת השליות):</strong> מתרחש במקביל לשלב השני — שליה יוצאת לרוב אחרי כל גור (או שתי שליות יחד אחרי זוג גורים). האם נוטה לאכול את השליות, ולכן אי-ראיית שליה אינה מוכיחה בוודאות שנותרה שליה ברחם; הווטרינר/ית יאמת זאת בסיום.</li>
          </ul>
        </div>

        <!-- כרטיס ידע 2: מרווחים בין גורים וסתירות/הבדלים בין מקורות -->
        <div class="card" style="margin-bottom:0;">
          <h3 class="card-title" style="margin-bottom:10px; color:var(--danger);">2. מרווחים בין גורים וסימני חירום (כולל הבדלים בין מקורות)</h3>
          <ul style="padding-right:18px; font-size:0.9rem; display:flex; flex-direction:column; gap:8px;">
            <li><strong>לחיצות פעילות ללא יציאת גור:</strong> הן לפי <strong>Cornell</strong>, הן לפי <strong>Merck</strong> והן לפי <strong>VCA</strong> — לחיצות חזקות ורצופות במשך <strong>מעל 20 עד 30 דקות</strong> ללא הולדת גור (או גור/שק שנראה תקוע בתעלת הלידה במשך 8 עד 10 דקות) מחייבות פנייה מיידית לווטרינר/ית.</li>
            <li><strong>שקיפות לגבי הבדלים בין מקורות במנוחה בין גורים:</strong>
              <br/>• <strong>Cornell ו-Merck Veterinary Manual:</strong> מציינים שמנוחה בין גורים נמשכת לרוב עד שעתיים, וכי הפסקה של <strong>מעל שעתיים (2 שעות)</strong> כאשר ידוע או משוער שנותרו גורים ברחם מחייבת פנייה לווטרינר/ית.
              <br/>• <strong>VCA Animal Hospitals:</strong> מציין כי הפסקה של <strong>מעל 4 שעות</strong> בין גורים (ללא לחיצות) כאשר ידוע שיש עוד גורים מחייבת פנייה לווטרינר/ית.
              <br/>• <strong>כלל הברזל להיידי:</strong> לא מסתמכים על מספר שרירותי יחיד — פועלים לפי ספי הזמן שסוכמו עם הווטרינר/ית של היידי, ובכל ספק או מצוקה מתקשרים מיד.</li>
            <li><strong>הפרשות ודימום חריגים:</strong> הפרשה ירוקה כהה או מסריחה <em>לפני</em> יציאת הגור הראשון (המעידה על היפרדות שליה מוקדמת), או דימום טרי משמעותי שנמשך מעל 10 דקות — מחייבים חירום וטרינרי.</li>
          </ul>
        </div>

        <!-- כרטיס ידע 3: ויסות חום וסביבת הגורים -->
        <div class="card" style="margin-bottom:0;">
          <h3 class="card-title" style="margin-bottom:10px; color:var(--primary-dark);">3. טמפרטורת סביבת הגורים ואיסור האכלת גור קר</h3>
          <ul style="padding-right:18px; font-size:0.9rem; display:flex; flex-direction:column; gap:8px;">
            <li><strong>חוסר יכולת לווסת חום:</strong> בשבועיים הראשונים גורים אינם מווסתים את חום גופם ותלויים בחום של היידי ובמקור חימום חיצוני בטוח.</li>
            <li><strong>טווחי טמפרטורה באזור הגורים (השוואת מקורות):</strong>
              <br/>• <strong>Merck Veterinary Manual:</strong> שבוע 1: <code>28.9°C עד 31.7°C</code> (<code>84°F–89°F</code>) · שבועות 2 עד 3: סביב <code>26.7°C</code> (<code>80°F</code>) · שבוע 4: <code>20.6°C עד 23.9°C</code>.
              <br/>• <strong>VCA Animal Hospitals:</strong> ימים 1 עד 4: <code>29.5°C עד 32°C</code> (<code>85°F–90°F</code>) · ימים 7 עד 10: ירידה הדרגתית ל-<code>26.7°C</code> · סוף שבוע 4: סביב <code>22.2°C</code>.
              <br/>• יש ליצור בארגז ההמלטה <strong>אזור חם ואזור קריר יותר</strong> כדי שהיידי והגורים יוכלו לבחור, ולהימנע ממגע ישיר עם משטח חימום.</li>
            <li><strong>🚨 אזהרה קריטית (Merck ו-VCA):</strong> חום גוף תקין של גור בשבוע הראשון הוא <code>35.0°C עד 37.2°C</code>. כאשר חום גופו של גור יורד מתחת ל-<code>34.5°C</code> (<code>94°F</code>), תנועתיות המעיים נעצרת ומתפתח שיתוק מעיים (<code>ileus</code>). <strong>אסור בשום אופן להאכיל גור קר</strong> (סכנת פליטה, שאיפה לריאות ודלקת ריאות קטלנית) — יש להתייעץ מיד עם וטרינר/ית לחימום הדרגתי ובטוח תחילה.</li>
          </ul>
        </div>

        <!-- כרטיס ידע 4: קולוסטרום, מעקב משקל והאם לאחר ההמלטה -->
        <div class="card" style="margin-bottom:0;">
          <h3 class="card-title" style="margin-bottom:10px; color:var(--primary-dark);">4. קולוסטרום, קצב עלייה במשקל ומעקב אחר היידי</h3>
          <ul style="padding-right:18px; font-size:0.9rem; display:flex; flex-direction:column; gap:8px;">
            <li><strong>חשיבות הקולוסטרום (Merck):</strong> גורים נולדים ללא הגנה חיסונית מספקת וחייבים לינוק חלב ראשוני (קולוסטרום) מהיידי ב-<strong>12 עד 24 השעות הראשונות לחייהם</strong> (יכולת ספיגת הנוגדנים במעי יורדת בחדות אחרי 12 השעות הראשונות).</li>
            <li><strong>מעקב משקל יומי (Merck ו-VCA):</strong>
              <br/>• ביממה הראשונה (24 שעות) תיתכן ירידה קלה או התייצבות במשקל (עד כ-5% עד 10% ממשקל הלידה לפי Merck).
              <br/>• לאחר היממה הראשונה מצופה עלייה עקבית מדי יום — מקורות מציינים כנקודת ייחוס עלייה של <strong>כ-5% עד 10% ממשקל הגוף ליום</strong>, והכפלת משקל הלידה סביב גיל <strong>7 עד 10 ימים</strong>.
              <br/>• חוסר עלייה במשקל או ירידה אחרי 24 שעות הם לרוב הסימן המוקדם ביותר למצוקה ומחייבים פנייה לווטרינר/ית.</li>
            <li><strong>מעקב אחר היידי לאחר הלידה:</strong> הפרשה רחמית (לוכיה) בצבע אדום-חום/כהה וללא ריח רע צפויה ופוחתת בהדרגה. ריח רע, חום, אפתיה, רעד/נוקשות שרירים (חשד לירידת סידן — אקלמפסיה) או עטין חם/אדום/כואב מחייבים בדיקה וטרינרית מיידית.</li>
          </ul>
        </div>
      </div>

      <!-- רשימת 6 המקורות הווטרינריים עם קישורים ישירים ותאריך גישה -->
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">🔗 מקורות וטרינריים שנבדקו ואומתו (גישה אחרונה: 08.11.2026)</h3>
            <p style="font-size:0.84rem; color:var(--text-muted);">
              לפי סעיף 15 במסמך האפיון — לחצי על כל קישור לפתיחת המאמר המקורי בחלון חדש
            </p>
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:10px;">
          <div class="source-item">
            <strong>1. Cornell University College of Veterinary Medicine — The Normal Whelping Process</strong>
            <span style="font-size:0.86rem; color:var(--text-secondary);">מידע על משך היריון, ירידת חום מקדימה, שלבי ההמלטה (1 עד 3), מרווחים בין גורים, סימני חירום והפרשות לאחר לידה. (תאריך גישה: 08.11.2026)</span>
            <a class="source-link" href="https://www.vet.cornell.edu/departments-centers-and-institutes/riney-canine-health-center/canine-health-topics/normal-whelping-process" target="_blank" rel="noopener noreferrer">
              https://www.vet.cornell.edu/departments-centers-and-institutes/riney-canine-health-center/canine-health-topics/normal-whelping-process
            </a>
          </div>

          <div class="source-item">
            <strong>2. Merck Veterinary Manual — Whelping and Queening in Bitches and Queens</strong>
            <span style="font-size:0.86rem; color:var(--text-secondary);">מידע מקצועי על שלבי הלידה, מעקב רפואי, מצבי קושי בהמלטה (דיסטוקיה) וטיפול באם לאחר הלידה. (תאריך גישה: 08.11.2026)</span>
            <a class="source-link" href="https://www.merckvetmanual.com/management-of-reproduction-dogs-and-cats/whelping-and-queening-in-bitches-and-queens" target="_blank" rel="noopener noreferrer">
              https://www.merckvetmanual.com/management-of-reproduction-dogs-and-cats/whelping-and-queening-in-bitches-and-queens
            </a>
          </div>

          <div class="source-item">
            <strong>3. Merck Veterinary Manual — Management of the Neonate in Dogs and Cats</strong>
            <span style="font-size:0.86rem; color:var(--text-secondary);">מידע על טיפול בגורים יילודים, טבלת חום גוף וטמפרטורת סביבה לפי שבועות, סכנת שיתוק מעיים בגור קר מתחת ל-34.5°C, קולוסטרום ומעקב משקל (5% עד 10% ליום). (תאריך גישה: 08.11.2026)</span>
            <a class="source-link" href="https://www.merckvetmanual.com/management-and-nutrition/management-of-the-neonate/management-of-the-neonate-in-dogs-and-cats" target="_blank" rel="noopener noreferrer">
              https://www.merckvetmanual.com/management-and-nutrition/management-of-the-neonate/management-of-the-neonate-in-dogs-and-cats
            </a>
          </div>

          <div class="source-item">
            <strong>4. VCA Animal Hospitals — Caring for Newborn Puppies</strong>
            <span style="font-size:0.86rem; color:var(--text-secondary);">מידע לבעלי כלבים על סביבת הגורים, טווחי חימום מומלצים, חשיבות השקילה היומית בגרמים וזיהוי מוקדם של מצוקה. (תאריך גישה: 08.11.2026)</span>
            <a class="source-link" href="https://vcahospitals.com/hope/know-your-pet/breeding-for-dog-owners-caring-for-newborn-puppies" target="_blank" rel="noopener noreferrer">
              https://vcahospitals.com/hope/know-your-pet/breeding-for-dog-owners-caring-for-newborn-puppies
            </a>
          </div>

          <div class="source-item">
            <strong>5. VCA Animal Hospitals — Problems at Birth</strong>
            <span style="font-size:0.86rem; color:var(--text-secondary);">סימני אזהרה בזמן ההמלטה (דיסטוקיה), לחיצות ללא התקדמות, הפרשות חריגות ומתי לפנות בדחיפות לווטרינר. (תאריך גישה: 08.11.2026)</span>
            <a class="source-link" href="https://vcahospitals.com/know-your-pet/breeding-for-dog-owners---problems-at-birth" target="_blank" rel="noopener noreferrer">
              https://vcahospitals.com/know-your-pet/breeding-for-dog-owners---problems-at-birth
            </a>
          </div>

          <div class="source-item">
            <strong>6. Merck Veterinary Manual — Management of Reproduction in Dogs</strong>
            <span style="font-size:0.86rem; color:var(--text-secondary);">מידע כללי על היריון בכלבות, הערכת מועד לידה לפי ביוץ ופרוגסטרון, בדיקות אולטרסאונד/רנטגן ומעקב. (תאריך גישה: 08.11.2026)</span>
            <a class="source-link" href="https://www.merckvetmanual.com/dog-owners/reproductive-disorders-of-dogs/management-of-reproduction-in-dogs" target="_blank" rel="noopener noreferrer">
              https://www.merckvetmanual.com/dog-owners/reproductive-disorders-of-dogs/management-of-reproduction-in-dogs
            </a>
          </div>
        </div>
      </div>
    `;
  },

  // ========================================================================
  // 9. שלב ד': לשונית הגדרות, גיבוי, ייצוא ודוחות PDF לווטרינר (סעיף 13 באפיון)
  // ========================================================================
  renderSettingsView(container) {
    const s = window.HeidiStore.state;
    const vc = s.vetContact;
    const dam = s.dam;
    const preg = s.pregnancy;
    const puppies = s.puppies || [];
    const lastBackupStr = s.meta.lastBackupAt ? this.formatDateTimeIL(s.meta.lastBackupAt) : 'טרם בוצע ייצוא גיבוי לקובץ';

    container.innerHTML = `
      <!-- 1. מרכז גיבוי, ייצוא, ייבוא והפקת דוחות PDF לווטרינר (שלב ד') -->
      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">💾 גיבוי, ייצוא נתונים והפקת דוחות PDF לווטרינר</h2>
            <p style="font-size:0.86rem; color:var(--text-muted);">
              <strong>מועד גיבוי אחרון לקובץ:</strong> <span style="color:var(--primary-dark); font-weight:700;">${lastBackupStr}</span> ·
              כל הנתונים נשמרים מקומית במכשיר ואינם נשלחים לענן או לצד שלישי ללא פעולה מפורשת שלך
            </p>
          </div>
        </div>

        <div class="form-grid" style="grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px;">
          <!-- קובייה 1: גיבוי ושחזור JSON + CSV -->
          <div style="padding:14px; border-radius:12px; background:var(--surface-muted); border:1px solid var(--border-color); display:flex; flex-direction:column; gap:10px;">
            <h3 style="font-size:1.02rem; color:var(--primary-dark);">📦 גיבוי מלא וייצוא לאקסל (CSV)</h3>
            <p style="font-size:0.84rem; color:var(--text-muted);">ייצוא כל נתוני המערכת לקובץ JSON לשמירה בטוחה, או ייצוא כל השקילות והחישובים לטבלת CSV לאקסל.</p>
            <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:auto;">
              <button type="button" class="btn btn-sm btn-primary" onclick="HeidiApp.exportFullJsonFile()">⬇️ ייצוא גיבוי JSON מלא</button>
              <button type="button" class="btn btn-sm btn-secondary" onclick="HeidiApp.exportWeightsCsvFile()">📊 ייצוא שקילות ל-CSV</button>
            </div>
          </div>

          <!-- קובייה 2: דוחות PDF / הדפסה לווטרינר וייצוא גור בודד -->
          <div style="padding:14px; border-radius:12px; background:var(--surface-muted); border:1px solid var(--border-color); display:flex; flex-direction:column; gap:10px;">
            <h3 style="font-size:1.02rem; color:var(--primary-dark);">🖨️ דוחות PDF להדפסה / שליחה לווטרינר</h3>
            <p style="font-size:0.84rem; color:var(--text-muted);">הפקת דוח סיכום המלטה מלא או דוח רפואי מפורט לגור בודד (משקלים, תצפיות, הנקות וטיפולים).</p>
            <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
              <button type="button" class="btn btn-sm btn-primary" onclick="HeidiApp.printWhelpingSummaryReport()">🖨️ דוח PDF סיכום המלטה ושגר</button>
            </div>
            ${puppies.length > 0 ? `
              <div style="display:flex; gap:6px; align-items:center; margin-top:4px; flex-wrap:wrap;">
                <select id="exportSinglePupSelect" class="form-control" style="min-height:36px; padding:4px 8px; font-size:0.84rem; flex:1;">
                  ${puppies.map(p => `<option value="${p.id}">${p.code} · ${p.name} (סרט ${p.ribbonColorName})</option>`).join('')}
                </select>
                <button type="button" class="btn btn-sm btn-secondary" onclick="HeidiApp.printSinglePuppyVetReport(document.getElementById('exportSinglePupSelect').value)">🖨️ דוח PDF לגור</button>
                <button type="button" class="btn btn-sm btn-secondary" onclick="HeidiApp.exportSinglePuppyJsonFile(document.getElementById('exportSinglePupSelect').value)">⬇️ JSON גור</button>
              </div>
            ` : `<span style="font-size:0.8rem; color:var(--text-muted);">הפקת דוח לגור בודד תוצג לאחר הוספת גורים.</span>`}
          </div>

          <!-- קובייה 3: ייבוא ושחזור מקובץ גיבוי -->
          <div style="padding:14px; border-radius:12px; background:var(--surface-muted); border:1px solid var(--border-color); display:flex; flex-direction:column; gap:10px;">
            <h3 style="font-size:1.02rem; color:var(--amber-text);">🔄 ייבוא ושחזור מקובץ גיבוי (JSON)</h3>
            <p style="font-size:0.84rem; color:var(--text-muted);">שחזור מלא של הנתונים מקובץ JSON ששמרת בעבר (תוצג הודעת אזהרה ואישור לפני השחזור).</p>
            <input type="file" id="importJsonInput" accept=".json,application/json" class="form-control" style="min-height:38px; font-size:0.84rem;" onchange="HeidiApp.importJsonBackupFile(this)" />
          </div>
        </div>
      </div>

      <!-- 2. טופס פרטי וטרינר, חירום והשלמת שדות להיידי -->
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">⚙️ פרטי וטרינר, חירום והשלמת שדות להיידי</h2>
        </div>
        <form onsubmit="HeidiApp.saveSettingsForm(event)">
          <h3 style="margin-bottom:10px; font-size:1.05rem; color:var(--primary-dark);">🩺 1. פרטי וטרינר, מרפאת חירום ומלווה להמלטה</h3>
          <div class="form-grid">
            <div class="form-group">
              <label>שם הווטרינר/ית המטפל/ת</label>
              <input type="text" id="set_vetName" class="form-control" value="${vc.vetName || ''}" placeholder="למשל: ד״ר ..." />
            </div>
            <div class="form-group">
              <label>טלפון הווטרינר/ית</label>
              <input type="tel" id="set_vetPhone" class="form-control" value="${vc.vetPhone || ''}" placeholder="05X-XXXXXXX" />
            </div>
            <div class="form-group">
              <label>שם מרפאת חירום קרובה</label>
              <input type="text" id="set_emergName" class="form-control" value="${vc.emergencyClinicName || ''}" placeholder="שם מרפאת חירום 24/7" />
            </div>
            <div class="form-group">
              <label>טלפון מרפאת חירום</label>
              <input type="tel" id="set_emergPhone" class="form-control" value="${vc.emergencyClinicPhone || ''}" placeholder="טלפון חירום" />
            </div>
            <div class="form-group">
              <label>איש/אשת קשר לליווי ההמלטה וטלפון</label>
              <input type="text" id="set_helper" class="form-control" value="${vc.whelpingHelperName || ''}" placeholder="שם וטלפון מלווה" />
            </div>
            <div class="form-group">
              <label>כתובת ההמלטה</label>
              <input type="text" id="set_address" class="form-control" value="${vc.whelpingAddress || ''}" placeholder="כתובת מלאה להגעת חירום" />
            </div>
          </div>

          <hr style="border:none; border-top:1px solid var(--border-color); margin:16px 0;" />
          <h3 style="margin-bottom:10px; font-size:1.05rem; color:var(--primary-dark);">🐕 2. השלמת פרטים רפואיים והיריון של היידי</h3>
          <div class="form-grid">
            <div class="form-group">
              <label>תאריך המלטה בפועל (כאשר תתרחש בשעה טובה)</label>
              <input type="date" id="set_actualBirthDate" class="form-control" value="${s.litter.actualBirthDate || ''}" />
            </div>
            <div class="form-group">
              <label>תאריך המלטה משוער שאושר וטרינרית</label>
              <input type="text" id="set_vetDueDate" class="form-control" value="${preg.vetConfirmedDueDate || ''}" placeholder="להזנה לאחר אישור וטרינר/ית" />
            </div>
            <div class="form-group">
              <label>חלון המלטה משוער נוכחי</label>
              <input type="text" id="set_estWindow" class="form-control" value="${preg.estimatedWhelpingWindow || ''}" />
            </div>
            <div class="form-group">
              <label>משקל היידי העדכני (ק"ג)</label>
              <input type="text" id="set_damWeight" class="form-control" value="${dam.currentWeightKg || ''}" placeholder="למשל: 35.5" />
            </div>
            <div class="form-group">
              <label>מספר שבב של היידי</label>
              <input type="text" id="set_microchip" class="form-control" value="${dam.microchipNumber || ''}" placeholder="מספר שבב" />
            </div>
            <div class="form-group">
              <label>צילום רנטגן להערכת מספר עוברים (תאריך ותוצאה)</label>
              <input type="text" id="set_xray" class="form-control" value="${preg.xrayDateAndResult || ''}" placeholder="האם בוצע? תאריך ומספר עוברים" />
            </div>
          </div>
          <div class="form-group">
            <label>אלרגיות / רגישויות ידועות של היידי</label>
            <input type="text" id="set_allergies" class="form-control" value="${dam.knownAllergies || ''}" placeholder="להזנה ידנית" />
          </div>
          <div class="form-group">
            <label>תרופות / תוספים שנרשמו, מינון ותזמון (לפי מרשם וטרינר בלבד)</label>
            <textarea id="set_meds" class="form-control" rows="2" placeholder="להזנה ידנית לפי מרשם וטרינרי בלבד">${dam.prescribedMeds || ''}</textarea>
          </div>
          <div class="form-group">
            <label>הנחיות אישיות וספי חירום שסוכמו עם הווטרינר/ית (יוצגו בכרטיס האדום בהמלטה)</label>
            <textarea id="set_vetInst" class="form-control" rows="2" placeholder="הנחיות אישיות מהווטרינר/ית">${dam.vetInstructions || ''}</textarea>
          </div>

          <button type="submit" class="btn btn-primary" style="margin-top:8px;">💾 שמירת פרטים והגדרות</button>
        </form>
      </div>
    `;
  },

  saveSettingsForm(e) {
    e.preventDefault();
    const store = window.HeidiStore;
    const s = store.state;
    s.vetContact.vetName = document.getElementById('set_vetName').value.trim();
    s.vetContact.vetPhone = document.getElementById('set_vetPhone').value.trim();
    s.vetContact.emergencyClinicName = document.getElementById('set_emergName').value.trim();
    s.vetContact.emergencyClinicPhone = document.getElementById('set_emergPhone').value.trim();
    s.vetContact.whelpingHelperName = document.getElementById('set_helper').value.trim();
    s.vetContact.whelpingAddress = document.getElementById('set_address').value.trim();

    s.litter.actualBirthDate = document.getElementById('set_actualBirthDate').value;
    s.pregnancy.vetConfirmedDueDate = document.getElementById('set_vetDueDate').value.trim();
    s.pregnancy.estimatedWhelpingWindow = document.getElementById('set_estWindow').value.trim();
    s.pregnancy.xrayDateAndResult = document.getElementById('set_xray').value.trim();

    s.dam.currentWeightKg = document.getElementById('set_damWeight').value.trim();
    s.dam.microchipNumber = document.getElementById('set_microchip').value.trim();
    s.dam.knownAllergies = document.getElementById('set_allergies').value.trim();
    s.dam.prescribedMeds = document.getElementById('set_meds').value.trim();
    s.dam.vetInstructions = document.getElementById('set_vetInst').value.trim();

    store.save();
    this.renderVetEmergencyStrip();
    alert('הפרטים נשמרו בהצלחה במכשיר!');
  },

  // פונקציות הורדת קבצים (JSON / CSV) וייבוא
  triggerDownload(filename, contentStr, mimeType) {
    const blob = new Blob([contentStr], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);
  },

  exportFullJsonFile() {
    const jsonStr = window.HeidiStore.getExportJsonPayload();
    const datePart = new Date().toISOString().slice(0, 10);
    this.triggerDownload(`heidi_full_backup_${datePart}.json`, jsonStr, 'application/json;charset=utf-8');
    if (this.activeTab === 'settings') {
      this.renderSettingsView(document.getElementById('mainViewContainer'));
    }
  },

  exportSinglePuppyJsonFile(puppyId) {
    if (!puppyId) return;
    const p = window.HeidiStore.state.puppies.find(x => x.id === puppyId);
    const jsonStr = window.HeidiStore.getSinglePuppyExportJson(puppyId);
    if (!jsonStr || !p) return;
    const datePart = new Date().toISOString().slice(0, 10);
    this.triggerDownload(`heidi_puppy_${p.code}_${datePart}.json`, jsonStr, 'application/json;charset=utf-8');
    if (this.activeTab === 'settings') {
      this.renderSettingsView(document.getElementById('mainViewContainer'));
    }
  },

  exportWeightsCsvFile() {
    const csvStr = window.HeidiStore.getWeightsCsvString();
    const datePart = new Date().toISOString().slice(0, 10);
    this.triggerDownload(`heidi_weights_${datePart}.csv`, csvStr, 'text/csv;charset=utf-8');
    if (this.activeTab === 'settings') {
      this.renderSettingsView(document.getElementById('mainViewContainer'));
    }
  },

  importJsonBackupFile(inputEl) {
    const file = inputEl.files && inputEl.files[0];
    if (!file) return;
    const ok = confirm('⚠️ אזהרה לפני שחזור מגיבוי:\nייבוא קובץ גיבוי יחליף את הנתונים הנוכחיים במערכת בנתונים שבקובץ. האם להמשיך?');
    if (!ok) {
      inputEl.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        window.HeidiStore.importFromJsonString(e.target.result);
        this.renderVetEmergencyStrip();
        this.switchTab('dashboard');
        alert('✅ קובץ הגיבוי שוחזר בהצלחה!');
      } catch (err) {
        alert('❌ שגיאה בייבוא קובץ הגיבוי: ' + err.message);
      }
    };
    reader.readAsText(file, 'utf-8');
  },

  // הפקת דוח PDF / הדפסה לווטרינר: 1. סיכום ההמלטה והשגר
  printWhelpingSummaryReport() {
    const s = window.HeidiStore.state;
    const litter = s.litter;
    const stats = window.HeidiStore.getWhelpingLiveStats();
    const summaries = s.puppies.map(p => window.HeidiStore.getPuppySummary(p.id)).filter(Boolean);
    const eventsAsc = (s.laborEvents || []).slice().sort((a, b) => new Date(a.eventAt).getTime() - new Date(b.eventAt).getTime());

    const win = window.open('', '_blank');
    if (!win) {
      alert('הדפדפן חסם פתיחת חלון הדפסה. אנא אשרי חלונות קופצים עבור האפליקציה.');
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html lang="he" dir="rtl">
      <head>
        <meta charset="UTF-8" />
        <title>דוח סיכום המלטה ושגר — היידי (${new Date().toLocaleDateString('he-IL')})</title>
        <style>
          body { font-family: Arial, sans-serif; direction: rtl; text-align: right; color: #0f172a; padding: 24px; line-height: 1.5; }
          h1, h2, h3 { color: #047857; margin-bottom: 8px; }
          .header-box { border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center; }
          .section { border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px; margin-bottom: 16px; break-inside: avoid; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: center; }
          th { background: #f1f5f9; font-weight: bold; }
          .td-right { text-align: right; }
          .print-btn { background: #059669; color: #fff; border: none; padding: 10px 18px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 14px; }
          @media print { .no-print { display: none !important; } body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom:16px; display:flex; gap:10px;">
          <button class="print-btn" onclick="window.print()">🖨️ הדפסה / שמירה כ-PDF</button>
          <button class="print-btn" style="background:#475569;" onclick="window.close()">✖ סגירת חלון</button>
        </div>

        <div class="header-box">
          <div>
            <h1>דוח סיכום המלטה ומעקב שגר — היידי (Heidi)</h1>
            <div>בעלים: תכלת · הופק בתאריך: ${this.formatDateTimeIL(new Date().toISOString())}</div>
          </div>
          <div style="text-align:left; font-size:13px;">
            <div><strong>ווטרינר/ית מטפל/ת:</strong> ${s.vetContact.vetName || '—'} (${s.vetContact.vetPhone || '—'})</div>
            <div><strong>מרפאת חירום:</strong> ${s.vetContact.emergencyClinicName || '—'} (${s.vetContact.emergencyClinicPhone || '—'})</div>
          </div>
        </div>

        <div class="section">
          <h2>1. פרטי האם (היידי) וסיכום ההמלטה</h2>
          <p><strong>גזע וצבע:</strong> ${s.dam.breed}, ${s.dam.color} · <strong>שגר:</strong> המלטה ראשונה (הזרעה ממרטי: 14.09.2026, 15.09.2026)</p>
          <p><strong>תחילת המלטה:</strong> ${this.formatDateTimeIL(litter.laborStartTime)} · <strong>סיום המלטה:</strong> ${this.formatDateTimeIL(litter.laborEndTime)}</p>
          <p><strong>מספר גורים חיים:</strong> ${litter.liveBornCount !== '' ? litter.liveBornCount : s.puppies.length} · <strong>ללא רוח חיים:</strong> ${litter.stillbornCount !== '' ? litter.stillbornCount : 0} · <strong>שליות שנצפו:</strong> ${stats.totalObservedPlacentas}</p>
          <p><strong>התערבות וטרינרית:</strong> ${litter.vetInterventionRequired || 'לא צוין'} · <strong>אימות וטרינרי לריקון הרחם:</strong> ${litter.vetVerifiedEmptyUterus || 'טרם הוזן'}</p>
          <p><strong>בדיקת אם לאחר ההמלטה:</strong> ${litter.postPartumDamCheck || '—'}</p>
          ${litter.notes ? `<p><strong>הערות סיכום:</strong> ${litter.notes}</p>` : ''}
        </div>

        <div class="section">
          <h2>2. טבלת ריכוז הגורים והשקילות האחרונות (${summaries.length} גורים)</h2>
          ${summaries.length === 0 ? `<p>טרם הוזנו גורים.</p>` : `
            <table>
              <thead>
                <tr>
                  <th>מס"ד</th>
                  <th>מזהה ושם</th>
                  <th>צבע סרט</th>
                  <th>מין</th>
                  <th>מועד לידה</th>
                  <th>משקל לידה</th>
                  <th>משקל נוכחי</th>
                  <th>שינוי מלידה (%)</th>
                  <th>שליה בלידה</th>
                  <th>סטטוס</th>
                </tr>
              </thead>
              <tbody>
                ${summaries.map((sum, idx) => {
                  const p = sum.puppy;
                  const bd = p.birthDetails || {};
                  const pct = sum.latestEntry && sum.latestEntry.changeFromBirthPercent !== null
                    ? `${sum.latestEntry.changeFromBirthPercent > 0 ? '+' : ''}${this.formatNum(sum.latestEntry.changeFromBirthPercent, 1)}%`
                    : '—';
                  return `
                    <tr>
                      <td>${idx + 1}</td>
                      <td class="td-right"><strong>${p.code} · ${p.name}</strong></td>
                      <td>${p.ribbonColorName || 'ללא סרט'}</td>
                      <td>${window.SEX_LABELS[p.sex] || p.sex}</td>
                      <td>${this.formatDateTimeIL(p.birthDateTime)}</td>
                      <td>${p.birthWeightG ? `${this.formatNum(p.birthWeightG)} ג׳` : '—'}</td>
                      <td><strong>${sum.currentWeightG ? `${this.formatNum(sum.currentWeightG)} ג׳` : '—'}</strong></td>
                      <td>${pct}</td>
                      <td>${bd.placentaObserved || '—'}</td>
                      <td>${window.STATUS_LABELS[p.status] || p.status}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          `}
        </div>

        <div class="section">
          <h2>3. יומן אירועי ההמלטה הכרונולוגי (${eventsAsc.length} אירועים)</h2>
          ${eventsAsc.length === 0 ? `<p>לא נרשמו אירועים ביומן ההמלטה.</p>` : `
            <table>
              <thead>
                <tr>
                  <th>מס"ד</th>
                  <th>שעה</th>
                  <th>סוג אירוע</th>
                  <th>פירוט ותצפיות</th>
                  <th>התערבות</th>
                </tr>
              </thead>
              <tbody>
                ${eventsAsc.map((ev, idx) => {
                  const tInfo = window.LABOR_EVENT_TYPES[ev.eventType] || { label: ev.eventType };
                  return `
                    <tr>
                      <td>${idx + 1}</td>
                      <td>${this.formatDateTimeIL(ev.eventAt)}</td>
                      <td><strong>${tInfo.label}</strong></td>
                      <td class="td-right">${ev.description || '—'}</td>
                      <td>${ev.interventionRequired ? `כן (${ev.interventionDetails || ''})` : 'לא'}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          `}
        </div>
      </body>
      </html>
    `;

    win.document.open();
    win.document.write(html);
    win.document.close();
  },

  // הפקת דוח PDF / הדפסה לווטרינר: 2. דוח גור בודד
  printSinglePuppyVetReport(puppyId) {
    const s = window.HeidiStore.state;
    const p = s.puppies.find(x => x.id === puppyId);
    if (!p) {
      alert('לא נמצא גור להפקת הדוח.');
      return;
    }

    const sum = window.HeidiStore.getPuppySummary(p.id);
    const calcWeights = window.HeidiStore.getCalculatedWeightsForPuppy(p.id);
    const feedings = s.feedingEntries.filter(f => f.puppyId === p.id).slice().sort((a, b) => new Date(b.eventAt).getTime() - new Date(a.eventAt).getTime());
    const healthObs = s.healthObservations.filter(h => h.puppyId === p.id).slice().sort((a, b) => new Date(b.eventAt).getTime() - new Date(a.eventAt).getTime());
    const bd = p.birthDetails || {};

    const win = window.open('', '_blank');
    if (!win) {
      alert('הדפדפן חסם פתיחת חלון הדפסה. אנא אשרי חלונות קופצים עבור האפליקציה.');
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html lang="he" dir="rtl">
      <head>
        <meta charset="UTF-8" />
        <title>דוח גור לווטרינר — ${p.code} (${p.name})</title>
        <style>
          body { font-family: Arial, sans-serif; direction: rtl; text-align: right; color: #0f172a; padding: 24px; line-height: 1.5; }
          h1, h2, h3 { color: #047857; margin-bottom: 8px; }
          .header-box { border-bottom: 3px solid ${p.ribbonColorHex || '#059669'}; padding-bottom: 12px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center; }
          .section { border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px; margin-bottom: 16px; break-inside: avoid; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: center; }
          th { background: #f1f5f9; font-weight: bold; }
          .td-right { text-align: right; }
          .print-btn { background: #059669; color: #fff; border: none; padding: 10px 18px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 14px; }
          @media print { .no-print { display: none !important; } body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom:16px; display:flex; gap:10px;">
          <button class="print-btn" onclick="window.print()">🖨️ הדפסה / שמירה כ-PDF לווטרינר</button>
          <button class="print-btn" style="background:#475569;" onclick="window.close()">✖ סגירת חלון</button>
        </div>

        <div class="header-box">
          <div>
            <h1>דוח מעקב גור לווטרינר — ${p.code} · ${p.name}</h1>
            <div><strong>צבע סרט זיהוי:</strong> ${p.ribbonColorName || 'ללא סרט'} · <strong>מין:</strong> ${window.SEX_LABELS[p.sex]} · <strong>סטטוס:</strong> ${window.STATUS_LABELS[p.status]}</div>
          </div>
          <div style="text-align:left; font-size:13px;">
            <div><strong>האם:</strong> היידי (לברדורית) · <strong>בעלים:</strong> תכלת</div>
            <div><strong>תאריך הפקת הדוח:</strong> ${this.formatDateTimeIL(new Date().toISOString())}</div>
          </div>
        </div>

        <div class="section">
          <h2>1. פרטי לידה וזיהוי</h2>
          <p><strong>תאריך ושעת לידה:</strong> ${this.formatDateTimeIL(p.birthDateTime)} · <strong>משקל לידה:</strong> ${p.birthWeightG ? `${this.formatNum(p.birthWeightG)} גרם` : 'לא הוזן'}</p>
          <p><strong>צבע פרווה וסימנים מזהים:</strong> ${p.coatColor || '—'} | ${p.markings || 'ללא סימנים מיוחדים'}</p>
          <p><strong>נתוני לידה (תיעוד תצפיתי):</strong> מצג: ${bd.presentation || '—'} · נולד בשק: ${bd.bornInSac || '—'} · סיוע בלידה: ${bd.assistanceRequired || 'לא'} · חבל טבור: ${bd.cordHandledBy || 'האם'} · שליה נצפתה: ${bd.placentaObserved || '—'}</p>
          <p><strong>משקל נוכחי:</strong> ${sum.currentWeightG ? `${this.formatNum(sum.currentWeightG)} גרם` : '—'} · <strong>ממוצע עלייה יומי מלידה:</strong> ${sum.avgDailyGainFromBirthG !== null ? `${this.formatNum(sum.avgDailyGainFromBirthG, 1)} גרם/יום` : 'אין מספיק נתונים'}</p>
          ${p.notes ? `<p><strong>הערות כלליות:</strong> ${p.notes}</p>` : ''}
        </div>

        <div class="section">
          <h2>2. טבלת שקילות ומדדי גדילה לאורך זמן (${calcWeights.length} שקילות)</h2>
          ${calcWeights.length === 0 ? `<p>טרם תועדו שקילות לגור זה.</p>` : `
            <table>
              <thead>
                <tr>
                  <th>מס"ד</th>
                  <th>תאריך ושעה</th>
                  <th>גיל בשקילה</th>
                  <th>משקל (גרם)</th>
                  <th>הפרש מקודמת</th>
                  <th>% מקודמת</th>
                  <th>% מלידה</th>
                  <th>קצב יומי</th>
                  <th>הערות</th>
                </tr>
              </thead>
              <tbody>
                ${calcWeights.map((w, idx) => `
                  <tr>
                    <td>${idx + 1}</td>
                    <td>${this.formatDateTimeIL(w.eventAt)}</td>
                    <td>${w.ageDisplay}</td>
                    <td><strong>${this.formatNum(w.weightG)} ג׳</strong></td>
                    <td>${w.deltaG !== null ? `${w.deltaG > 0 ? '+' : ''}${this.formatNum(w.deltaG)} ג׳` : '—'}</td>
                    <td>${w.deltaPercent !== null ? `${w.deltaPercent > 0 ? '+' : ''}${this.formatNum(w.deltaPercent, 1)}%` : '—'}</td>
                    <td>${w.changeFromBirthPercent !== null ? `${w.changeFromBirthPercent > 0 ? '+' : ''}${this.formatNum(w.changeFromBirthPercent, 1)}%` : '—'}</td>
                    <td>${w.dailyGainG !== null ? `${this.formatNum(w.dailyGainG, 1)} ג׳/יום` : '—'}</td>
                    <td class="td-right">${w.notes || '—'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}
        </div>

        <div class="section">
          <h2>3. תצפיות בריאות, בדיקות וטיפולים וטרינריים (${healthObs.length})</h2>
          ${healthObs.length === 0 ? `<p>לא נרשמו תצפיות בריאות חריגות לגור זה.</p>` : `
            <table>
              <thead>
                <tr>
                  <th>מס"ד</th>
                  <th>תאריך ושעה</th>
                  <th>פעילות ויניקה</th>
                  <th>חום למגע ונשימה</th>
                  <th>בדיקה/אבחנה/טיפול וטרינרי והערות</th>
                </tr>
              </thead>
              <tbody>
                ${healthObs.map((h, idx) => `
                  <tr>
                    <td>${idx + 1}</td>
                    <td>${this.formatDateTimeIL(h.eventAt)}</td>
                    <td>${h.activityVitality} · יניקה: ${h.suckleReflex}</td>
                    <td>${h.warmthToTouch} · נשימה: ${h.breathingObs}</td>
                    <td class="td-right">${h.vetExamDiagnosisTreatment ? `<strong>וטרינר:</strong> ${h.vetExamDiagnosisTreatment} ` : ''}${h.notes || ''}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}
        </div>

        <div class="section">
          <h2>4. תיעוד הנקה והאכלה (${feedings.length})</h2>
          ${s.litter.vetSupplementalFeedingPlan ? `<p><strong>תוכנית האכלה משלימה בהנחיית וטרינר:</strong> ${s.litter.vetSupplementalFeedingPlan}</p>` : ''}
          ${feedings.length === 0 ? `<p>לא נרשמו רשומות הנקה פרטניות.</p>` : `
            <table>
              <thead>
                <tr>
                  <th>מס"ד</th>
                  <th>תאריך ושעה</th>
                  <th>סוג האכלה</th>
                  <th>יניקה יעילה</th>
                  <th>משך (דק׳)</th>
                  <th>הערות</th>
                </tr>
              </thead>
              <tbody>
                ${feedings.map((f, idx) => `
                  <tr>
                    <td>${idx + 1}</td>
                    <td>${this.formatDateTimeIL(f.eventAt)}</td>
                    <td>${f.feedingType}</td>
                    <td>${f.effectiveLatch}</td>
                    <td>${f.durationMinutes || '—'}</td>
                    <td class="td-right">${f.notes || '—'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}
        </div>
      </body>
      </html>
    `;

    win.document.open();
    win.document.write(html);
    win.document.close();
  },

  // ========================================================================
  // 9. מודאלים של גור ושקילות
  // ========================================================================
  closeModal() {
    const modal = document.getElementById('appModalBackdrop');
    if (modal) modal.classList.remove('open');
  },

  openVetContactModal() {
    this.switchTab('settings');
  },

  openPuppyModal(puppyId = null) {
    const store = window.HeidiStore;
    const existing = puppyId ? store.state.puppies.find(p => p.id === puppyId) : null;
    const isEdit = Boolean(existing);
    const bd = existing && existing.birthDetails ? existing.birthDetails : {};

    const currentRibbonName = existing ? existing.ribbonColorName : 'אדום';
    const currentRibbonHex = existing ? existing.ribbonColorHex : '#ef4444';
    const birthDtVal = existing && existing.birthDateTime ? existing.birthDateTime.slice(0, 16) : this.nowLocalInputValue();

    const modalBody = document.getElementById('appModalContent');
    modalBody.innerHTML = `
      <div class="card-header">
        <h3 class="card-title">${isEdit ? `✏️ עריכת כרטיס גור (${existing.code})` : '🐶 הוספת גור חדש לשגר של היידי'}</h3>
        <button class="btn btn-sm btn-secondary" onclick="HeidiApp.closeModal()">✖ סגירה</button>
      </div>
      <form onsubmit="HeidiApp.submitPuppyForm(event, '${puppyId || ''}')">
        <div class="form-group">
          <label>🎀 צבע סרט זיהוי על הגור (בחירה מהירה או הקלדה חופשית)</label>
          <div class="ribbon-picker" id="ribbonPresetContainer">
            ${window.RIBBON_PRESETS.map(r => `
              <button type="button" class="ribbon-choice ${r.name === currentRibbonName ? 'selected' : ''}"
                onclick="HeidiApp.selectRibbonPreset('${r.name}', '${r.hex}', this)">
                <span class="ribbon-dot" style="background-color: ${r.hex};"></span>
                <span>${r.name}</span>
              </button>
            `).join('')}
          </div>
          <div style="display:flex; gap:8px; margin-top:8px; align-items:center;">
            <input type="text" id="pup_ribbonName" class="form-control" style="flex:1;" value="${currentRibbonName}" placeholder="שם צבע הסרט (למשל: אדום / תכלת / פסים)" required />
            <input type="color" id="pup_ribbonHex" value="${currentRibbonHex}" style="width:48px; height:44px; border:1px solid var(--border-strong); border-radius:8px; cursor:pointer; background:var(--surface);" title="בחירת גוון צבע מדויק" />
          </div>
        </div>

        <div class="form-grid">
          <div class="form-group">
            <label>שם זמני / קבוע של הגור</label>
            <input type="text" id="pup_name" class="form-control" value="${existing ? existing.name : `גור ${store.state.puppies.length + 1}`}" placeholder="למשל: גור 1 או שם" required />
          </div>
          <div class="form-group">
            <label>מין הגור</label>
            <select id="pup_sex" class="form-control">
              <option value="unknown" ${existing && existing.sex === 'unknown' ? 'selected' : ''}>לא ידוע עדיין</option>
              <option value="female" ${existing && existing.sex === 'female' ? 'selected' : ''}>נקבה ♀</option>
              <option value="male" ${existing && existing.sex === 'male' ? 'selected' : ''}>זכר ♂</option>
            </select>
          </div>
          <div class="form-group">
            <label>תאריך ושעת לידה בפועל</label>
            <input type="datetime-local" id="pup_birthDt" class="form-control" value="${birthDtVal}" />
          </div>
          <div class="form-group">
            <label>משקל לידה (בגרמים)</label>
            <input type="number" step="1" min="1" id="pup_birthWeight" class="form-control" value="${existing && existing.birthWeightG ? existing.birthWeightG : ''}" placeholder="למשל: 420" />
          </div>
          <div class="form-group">
            <label>צבע פרווה</label>
            <input type="text" id="pup_coatColor" class="form-control" value="${existing ? existing.coatColor : ''}" placeholder="למשל: צהבהב בהיר / שחור" />
          </div>
          <div class="form-group">
            <label>סטטוס מעקב</label>
            <select id="pup_status" class="form-control">
              <option value="with_dam" ${!existing || existing.status === 'with_dam' ? 'selected' : ''}>עם האם</option>
              <option value="watch" ${existing && existing.status === 'watch' ? 'selected' : ''}>במעקב מוגבר</option>
              <option value="vet_care" ${existing && existing.status === 'vet_care' ? 'selected' : ''}>בטיפול וטרינרי</option>
              <option value="homed" ${existing && existing.status === 'homed' ? 'selected' : ''}>נמסר</option>
            </select>
          </div>
        </div>

        <div class="form-grid">
          <div class="form-group">
            <label>סימנים מזהים בגוף הגור</label>
            <input type="text" id="pup_markings" class="form-control" value="${existing ? existing.markings : ''}" placeholder="למשל: כתם לבן קטן בחזה" />
          </div>
          <div class="form-group">
            <label>שליה נצפתה בלידה?</label>
            <select id="pup_placenta" class="form-control">
              <option value="לא ידוע" ${bd.placentaObserved === 'לא ידוע' ? 'selected' : ''}>לא ידוע</option>
              <option value="כן" ${bd.placentaObserved === 'כן' ? 'selected' : ''}>כן</option>
              <option value="לא" ${bd.placentaObserved === 'לא' ? 'selected' : ''}>לא</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>📷 תמונת פרופיל של הגור (אופציונלי — נשמרת מקומית)</label>
          <input type="file" id="pup_photoInput" accept="image/*" class="form-control" onchange="HeidiApp.handlePhotoPreview(this)" />
          <input type="hidden" id="pup_photoDataUrl" value="${existing && existing.photoDataUrl ? existing.photoDataUrl : ''}" />
          <div id="pup_photoPreviewBox" style="margin-top:6px;">
            ${existing && existing.photoDataUrl ? `<img src="${existing.photoDataUrl}" style="width:72px; height:72px; object-fit:cover; border-radius:10px;" />` : ''}
          </div>
        </div>

        <div class="form-group">
          <label>הערות כלליות והנחיות וטרינריות</label>
          <textarea id="pup_notes" class="form-control" rows="2" placeholder="תיעוד תצפיתי בלידה או הערות חופשיות">${existing ? existing.notes : ''}</textarea>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:14px;">
          <button type="button" class="btn btn-secondary" onclick="HeidiApp.closeModal()">ביטול</button>
          <button type="submit" class="btn btn-primary">💾 ${isEdit ? 'שמירת שינויים' : 'יצירת כרטיס גור'}</button>
        </div>
      </form>
    `;
    document.getElementById('appModalBackdrop').classList.add('open');
  },

  selectRibbonPreset(name, hex, btnEl) {
    document.getElementById('pup_ribbonName').value = name;
    document.getElementById('pup_ribbonHex').value = hex;
    document.querySelectorAll('#ribbonPresetContainer .ribbon-choice').forEach(b => b.classList.remove('selected'));
    if (btnEl) btnEl.classList.add('selected');
  },

  handlePhotoPreview(inputEl) {
    this.handleGenericPhotoUpload(inputEl, 'pup_photoDataUrl', 'pup_photoPreviewBox');
  },

  submitPuppyForm(e, puppyId) {
    e.preventDefault();
    const placentaObserved = document.getElementById('pup_placenta').value;
    const payload = {
      name: document.getElementById('pup_name').value,
      sex: document.getElementById('pup_sex').value,
      ribbonColorName: document.getElementById('pup_ribbonName').value,
      ribbonColorHex: document.getElementById('pup_ribbonHex').value,
      birthDateTime: document.getElementById('pup_birthDt').value,
      birthWeightG: document.getElementById('pup_birthWeight').value,
      coatColor: document.getElementById('pup_coatColor').value,
      status: document.getElementById('pup_status').value,
      markings: document.getElementById('pup_markings').value,
      placentaObserved,
      birthDetails: { placentaObserved },
      photoDataUrl: document.getElementById('pup_photoDataUrl').value,
      notes: document.getElementById('pup_notes').value
    };

    if (puppyId) {
      window.HeidiStore.updatePuppy(puppyId, payload);
    } else {
      window.HeidiStore.addPuppy(payload);
    }
    this.closeModal();
    this.switchTab(this.activeTab);
  },

  confirmDeletePuppy(puppyId) {
    const p = window.HeidiStore.state.puppies.find(x => x.id === puppyId);
    if (!p) return;
    const ok = confirm(`⚠️ אזהרה לפני מחיקה:\nהאם את בטוחה שברצונך למחוק את כרטיס הגור ${p.code} (${p.name} - סרט ${p.ribbonColorName}) וכל היסטוריית השקילות שלו?`);
    if (!ok) return;
    window.HeidiStore.deletePuppy(puppyId);
    this.selectedPuppyDetailId = null;
    this.switchTab(this.activeTab);
  },

  openWeightModal(defaultPuppyId = '', editEntryId = '') {
    const store = window.HeidiStore;
    const puppies = store.state.puppies;
    if (puppies.length === 0) {
      alert('יש להוסיף תחילה לפחות גור אחד לפני הזנת שקילה.');
      this.openPuppyModal();
      return;
    }

    const existingEntry = editEntryId ? store.state.weightEntries.find(w => w.id === editEntryId) : null;
    const selectedPupId = existingEntry ? existingEntry.puppyId : (defaultPuppyId || puppies[0].id);
    const dtVal = existingEntry && existingEntry.eventAt ? existingEntry.eventAt.slice(0, 16) : this.nowLocalInputValue();

    const modalBody = document.getElementById('appModalContent');
    modalBody.innerHTML = `
      <div class="card-header">
        <h3 class="card-title">${existingEntry ? '✏️ עריכת שקילה קיימת' : '⚖️ תיעוד שקילה חדשה'}</h3>
        <button class="btn btn-sm btn-secondary" onclick="HeidiApp.closeModal()">✖ סגירה</button>
      </div>
      <form onsubmit="HeidiApp.submitWeightForm(event, '${editEntryId}')">
        <div class="form-group">
          <label>בחירת גור (לפי מזהה וצבע סרט)</label>
          <select id="w_puppyId" class="form-control" ${existingEntry ? 'disabled' : ''} required>
            ${puppies.map(p => `
              <option value="${p.id}" ${p.id === selectedPupId ? 'selected' : ''}>
                ${p.code} · ${p.name} (סרט: ${p.ribbonColorName || 'ללא סרט'})
              </option>
            `).join('')}
          </select>
        </div>

        <div class="form-grid">
          <div class="form-group">
            <label>משקל בגרמים (ג׳)</label>
            <input type="number" step="1" min="1" id="w_weightG" class="form-control" value="${existingEntry ? existingEntry.weightG : ''}" placeholder="למשל: 465" required autofocus />
          </div>
          <div class="form-group">
            <label>תאריך ושעת השקילה בפועל</label>
            <input type="datetime-local" id="w_eventAt" class="form-control" value="${dtVal}" required />
          </div>
        </div>

        <div class="form-grid">
          <div class="form-group">
            <label>מי שקל/ה?</label>
            <input type="text" id="w_weighedBy" class="form-control" value="${existingEntry ? existingEntry.weighedBy : 'תכלת'}" placeholder="תכלת" />
          </div>
          <div class="form-group">
            <label>הערה (למשל: לפני/אחרי הנקה)</label>
            <input type="text" id="w_notes" class="form-control" value="${existingEntry ? existingEntry.notes : ''}" placeholder="אופציונלי" />
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:12px;">
          <button type="button" class="btn btn-secondary" onclick="HeidiApp.closeModal()">ביטול</button>
          <button type="submit" class="btn btn-primary">💾 שמירת שקילה</button>
        </div>
      </form>
    `;
    document.getElementById('appModalBackdrop').classList.add('open');
  },

  submitWeightForm(e, editEntryId) {
    e.preventDefault();
    try {
      const puppyId = document.getElementById('w_puppyId').value;
      const weightG = document.getElementById('w_weightG').value;
      const eventAt = document.getElementById('w_eventAt').value;
      const weighedBy = document.getElementById('w_weighedBy').value;
      const notes = document.getElementById('w_notes').value;

      if (editEntryId) {
        window.HeidiStore.updateWeightEntry(editEntryId, { weightG, eventAt, weighedBy, notes });
      } else {
        window.HeidiStore.addWeightEntry({ puppyId, weightG, eventAt, weighedBy, notes });
      }
      this.closeModal();
      this.switchTab(this.activeTab);
    } catch (err) {
      alert(err.message);
    }
  },

  confirmDeleteWeight(entryId) {
    const ok = confirm('⚠️ האם את בטוחה שברצונך למחוק רשומת שקילה זו?');
    if (!ok) return;
    window.HeidiStore.deleteWeightEntry(entryId);
    this.switchTab(this.activeTab);
  },

  openBatchWeightModal() {
    const store = window.HeidiStore;
    const activePuppies = store.state.puppies.filter(p => p.status !== 'homed');
    if (activePuppies.length === 0) {
      alert('אין כרגע גורים פעילים לשקילה קבוצתית. הוסיפי תחילה גורים למערכת.');
      this.openPuppyModal();
      return;
    }

    const dtVal = this.nowLocalInputValue();
    const modalBody = document.getElementById('appModalContent');
    modalBody.innerHTML = `
      <div class="card-header">
        <div>
          <h3 class="card-title">📋 שקילה קבוצתית מהירה לכל השגר</h3>
          <p style="font-size:0.84rem; color:var(--text-muted);">הזיני משקל בגרמים לכל גור שנשקל כעת (שדה ריק ידולג ולא יישמר)</p>
        </div>
        <button class="btn btn-sm btn-secondary" onclick="HeidiApp.closeModal()">✖ סגירה</button>
      </div>
      <form onsubmit="HeidiApp.submitBatchWeightForm(event)">
        <div class="form-grid" style="margin-bottom:12px;">
          <div class="form-group" style="margin-bottom:0;">
            <label>מועד השקילה הקבוצתית</label>
            <input type="datetime-local" id="batch_eventAt" class="form-control" value="${dtVal}" required />
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label>מי שקל/ה?</label>
            <input type="text" id="batch_weighedBy" class="form-control" value="תכלת" />
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:10px; max-height:46vh; overflow-y:auto; padding:4px;">
          ${activePuppies.map(p => {
            const sum = store.getPuppySummary(p.id);
            return `
              <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px 12px; background:var(--surface-muted); border:1px solid var(--border-color); border-radius:10px; flex-wrap:wrap;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <span class="puppy-id-badge">${p.code}</span>
                  <strong>${p.name}</strong>
                  <span class="ribbon-pill" style="border-color:${p.ribbonColorHex};">
                    <span class="ribbon-dot" style="background-color:${p.ribbonColorHex};"></span>
                    <span>${p.ribbonColorName}</span>
                  </span>
                  <span style="font-size:0.8rem; color:var(--text-muted);">
                    (אחרון: ${sum.currentWeightG ? `${this.formatNum(sum.currentWeightG)} ג׳` : 'טרם נשקל'})
                  </span>
                </div>
                <div style="display:flex; align-items:center; gap:6px;">
                  <input type="number" step="1" min="1" class="form-control batch-weight-input" data-puppy-id="${p.id}" style="width:120px; min-height:40px;" placeholder="גרמים..." />
                  <input type="text" class="form-control batch-note-input" data-puppy-id="${p.id}" style="width:130px; min-height:40px;" placeholder="הערה..." />
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:14px;">
          <button type="button" class="btn btn-secondary" onclick="HeidiApp.closeModal()">ביטול</button>
          <button type="submit" class="btn btn-primary">💾 שמירת כל השקילות שהוזנו</button>
        </div>
      </form>
    `;
    document.getElementById('appModalBackdrop').classList.add('open');
  },

  submitBatchWeightForm(e) {
    e.preventDefault();
    const eventAt = document.getElementById('batch_eventAt').value;
    const weighedBy = document.getElementById('batch_weighedBy').value;
    const weightInputs = document.querySelectorAll('.batch-weight-input');
    let savedCount = 0;

    weightInputs.forEach(inp => {
      const val = inp.value.trim();
      if (val !== '' && Number(val) > 0) {
        const puppyId = inp.dataset.puppyId;
        const noteEl = document.querySelector(`.batch-note-input[data-puppy-id="${puppyId}"]`);
        const notes = noteEl ? noteEl.value.trim() : '';
        window.HeidiStore.addWeightEntry({
          puppyId,
          weightG: Number(val),
          eventAt,
          weighedBy,
          notes
        });
        savedCount++;
      }
    });

    if (savedCount === 0) {
      alert('לא הוזן משקל לאף גור.');
      return;
    }
    this.closeModal();
    this.switchTab(this.activeTab);
  }
};

window.HeidiApp = HeidiApp;
window.addEventListener('DOMContentLoaded', () => HeidiApp.init());
