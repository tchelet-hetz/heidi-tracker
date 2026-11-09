/* ==========================================================================
   Heidi Whelping & Puppy Growth Tracker — Data Model, Storage & Math (data.js)
   שמירה מקומית מתמשכת ומאומתת (LocalStorage) + שלבים א', ב' ו-ג' מלאים
   ========================================================================== */

const STORAGE_KEY = 'heidi_whelping_tracker_v1';
const CLOUD_SYNC_TOPIC = 'heidi_family_sync_tchelet_2026_9f8a7b6c5d_v2';


// צבעי סרט זיהוי מובנים לבחירה מהירה (ניתן גם להקליד כל צבע חופשי)
const RIBBON_PRESETS = [
  { name: 'אדום', hex: '#ef4444' },
  { name: 'כחול', hex: '#3b82f6' },
  { name: 'ירוק', hex: '#10b981' },
  { name: 'צהוב', hex: '#eab308' },
  { name: 'סגול', hex: '#8b5cf6' },
  { name: 'ורוד', hex: '#ec4899' },
  { name: 'כתום', hex: '#f97316' },
  { name: 'תכלת', hex: '#06b6d4' },
  { name: 'חום', hex: '#78350f' },
  { name: 'אפור / כסף', hex: '#64748b' },
  { name: 'לבן', hex: '#e2e8f0' },
  { name: 'שחור', hex: '#1e293b' },
  { name: 'ללא סרט', hex: '#94a3b8' }
];

const STATUS_LABELS = {
  with_dam: 'עם האם',
  watch: 'במעקב מוגבר',
  vet_care: 'בטיפול וטרינרי',
  homed: 'נמסר'
};

const SEX_LABELS = {
  male: 'זכר',
  female: 'נקבה',
  unknown: 'לא ידוע'
};

// סוגי אירועים בזמן ההמלטה (סעיף 5 במסמך האפיון)
const LABOR_EVENT_TYPES = {
  stage1_start: { label: 'התחלת שלב ראשון (הכנה / קינון)', icon: '🟢' },
  contractions_start: { label: 'תחילת לחיצות (שלב שני)', icon: '⚡' },
  puppy_born: { label: 'נולד גור', icon: '🐶' },
  placenta_delivered: { label: 'יצאה שליה', icon: '🟣' },
  rest_break: { label: 'הפסקה / מנוחה', icon: '🛋️' },
  vet_contact: { label: 'התקשרות לווטרינר', icon: '📞' },
  free_note: { label: 'הערה חופשית', icon: '📝' }
};

// רשימת כל 20 פריטי הציוד, הסביבה והתיאום להמלטה לפי סעיף 3 במסמך האפיון
function getDefaultChecklistTasks(nowIso) {
  return [
    { id: 'chk-1', category: 'ציוד וסביבה', title: 'ארגז המלטה מתאים, יציב וקל לניקוי', status: 'not_started', notes: '', createdAt: nowIso, updatedAt: nowIso },
    { id: 'chk-2', category: 'ציוד וסביבה', title: 'מצע/מגבות נקיות רבות ומגבות יבשות להחלפה', status: 'not_started', notes: '', createdAt: nowIso, updatedAt: nowIso },
    { id: 'chk-3', category: 'ציוד וסביבה', title: 'משטחי ספיגה ושקיות אשפה', status: 'not_started', notes: '', createdAt: nowIso, updatedAt: nowIso },
    { id: 'chk-4', category: 'ציוד וסביבה', title: 'משקל דיגיטלי מדויק לגרמים, עם קערה/מגש יציב', status: 'not_started', notes: '', createdAt: nowIso, updatedAt: nowIso },
    { id: 'chk-5', category: 'ציוד וסביבה', title: 'מדחום סביבתי ומדחום לכלבה, אם הווטרינר הנחה להשתמש', status: 'not_started', notes: '', createdAt: nowIso, updatedAt: nowIso },
    { id: 'chk-6', category: 'ציוד וסביבה', title: 'שעון/טיימר למדידת מרווחים בין גורים וצירים', status: 'done', notes: 'מובנה כאן באפליקציה במסך ההמלטה', createdAt: nowIso, updatedAt: nowIso },
    { id: 'chk-7', category: 'ציוד וסביבה', title: 'כפפות חד-פעמיות, חומר חיטוי מתאים וסבון לשטיפת ידיים', status: 'not_started', notes: '', createdAt: nowIso, updatedAt: nowIso },
    { id: 'chk-8', category: 'ציוד וסביבה', title: 'תאורה טובה ופנס', status: 'not_started', notes: '', createdAt: nowIso, updatedAt: nowIso },
    { id: 'chk-9', category: 'ציוד וסביבה', title: 'מחברת/טלפון טעון ומטען', status: 'not_started', notes: '', createdAt: nowIso, updatedAt: nowIso },
    { id: 'chk-10', category: 'ציוד וסביבה', title: 'אמצעי חימום בטוח עם אפשרות לגורים להתרחק ממנו (ללא מגע ישיר שעלול לגרום לכוויה)', status: 'not_started', notes: '', createdAt: nowIso, updatedAt: nowIso },
    { id: 'chk-11', category: 'ציוד וסביבה', title: 'קופסה/אזור חמים ובטוח להנחת גורים לזמן קצר, רק בהתאם להנחיות המלווה', status: 'not_started', notes: '', createdAt: nowIso, updatedAt: nowIso },
    { id: 'chk-12', category: 'ציוד וסביבה', title: 'אמצעי זיהוי זמניים לגורים (סרטים/קולרים ייעודיים רכים ובטיחותיים, רק בהנחיית איש מקצוע)', status: 'not_started', notes: '', createdAt: nowIso, updatedAt: nowIso },
    { id: 'chk-13', category: 'ציוד וסביבה', title: 'מזון ומים זמינים להיידי', status: 'not_started', notes: '', createdAt: nowIso, updatedAt: nowIso },
    { id: 'chk-14', category: 'ציוד וסביבה', title: 'פרטי קשר של הווטרינר/ית ומרפאת חירום במקום נגיש', status: 'not_started', notes: '', createdAt: nowIso, updatedAt: nowIso },
    { id: 'chk-15', category: 'תיאום והיערכות', title: 'לוודא עם הווטרינר/ית מהו מועד ההגעה/התקשרות בכל שלב', status: 'not_started', notes: '', createdAt: nowIso, updatedAt: nowIso },
    { id: 'chk-16', category: 'תיאום והיערכות', title: 'לוודא מי זמין להגיע פיזית אם יש צורך', status: 'not_started', notes: '', createdAt: nowIso, updatedAt: nowIso },
    { id: 'chk-17', category: 'תיאום והיערכות', title: 'לברר מראש מה נחשב מצב חירום לפי הווטרינר/ית המטפל/ת', status: 'not_started', notes: '', createdAt: nowIso, updatedAt: nowIso },
    { id: 'chk-18', category: 'תיאום והיערכות', title: 'לוודא שיש רכב זמין ותוכנית הגעה למרפאה', status: 'not_started', notes: '', createdAt: nowIso, updatedAt: nowIso },
    { id: 'chk-19', category: 'תיאום והיערכות', title: 'לתאם מי מתעד ומי מסייע, כדי לא להעמיס על אדם אחד', status: 'not_started', notes: '', createdAt: nowIso, updatedAt: nowIso },
    { id: 'chk-20', category: 'תיאום והיערכות', title: 'להכין טופס רישום גורים מודפס כגיבוי', status: 'not_started', notes: '', createdAt: nowIso, updatedAt: nowIso }
  ];
}

// אבני דרך להתפתחות השגר והגורים לפי סעיף 6 במסמך האפיון
function getDefaultMilestones(nowIso) {
  return [
    { id: 'ms-1', timeframe: 'יום 0', title: 'לידה, שקילה ראשונה לאחר ייבוש, זיהוי בסרט וצילום', status: 'not_started', actualDate: '', vetNotes: '', updatedAt: nowIso },
    { id: 'ms-2', timeframe: 'ימים 1 עד 14', title: 'שקילה תכופה (מדי יום או לפי הנחיית הווטרינר/ית; מעקב צפוף במיוחד בימים הראשונים)', status: 'not_started', actualDate: '', vetNotes: '', updatedAt: nowIso },
    { id: 'ms-3', timeframe: 'סביב ימים 10 עד 14', title: 'תחילת פתיחת עיניים עשויה להתרחש (עם שונות בין גורים)', status: 'not_started', actualDate: '', vetNotes: '', updatedAt: nowIso },
    { id: 'ms-4', timeframe: 'שבועות 2 עד 3', title: 'התפתחות שמיעה, תנועה ותגובה לסביבה; תיעוד אבני דרך בפועל', status: 'not_started', actualDate: '', vetNotes: '', updatedAt: nowIso },
    { id: 'ms-5', timeframe: 'שבועות 3 עד 4', title: 'התחלת הליכה/משחק וחשיפה הדרגתית לסביבה בטוחה (בהתאם להתפתחות ולהנחיות מקצועיות)', status: 'not_started', actualDate: '', vetNotes: '', updatedAt: nowIso },
    { id: 'ms-6', timeframe: 'שבועות 3 עד 4 ואילך', title: 'גמילה הדרגתית ומעבר למזון גורים רק בתוכנית מתאימה', status: 'not_started', actualDate: '', vetNotes: '', updatedAt: nowIso },
    { id: 'ms-7', timeframe: 'סביב 6 עד 8 שבועות', title: 'תכנון בדיקות, חיסונים, תילוע, שבב ומסירה לפי הווטרינר/ית והדין המקומי (ללא קביעה אוטומטית בלי אישור וטרינרי)', status: 'not_started', actualDate: '', vetNotes: '', updatedAt: nowIso }
  ];
}

function createInitialState() {
  const nowIso = new Date().toISOString();
  return {
    meta: {
      version: '1.2.0',
      createdAt: nowIso,
      updatedAt: nowIso,
      lastBackupAt: null,
      darkMode: false
    },
    dam: {
      id: 'dam-heidi',
      name: 'היידי (Heidi)',
      breed: 'לברדור רטריבר',
      sex: 'נקבה',
      color: 'לבן / צהבהב בהיר',
      reportedPastWeightKg: '32 עד 33 ק"ג (⚠️ לא אומת כנתון עדכני)',
      currentWeightKg: '',
      microchipNumber: '',
      knownAllergies: '',
      prescribedMeds: '',
      vetInstructions: '',
      temperament: 'עדינה, חברותית, חכמה, אוהבת מים ואוכל. המלטה ראשונה.',
      sireInfo: 'מרטי — לברדור שחור (חבר ילדות; בוצעה הזרעה מלאכותית בזרע טרי)',
      updatedAt: nowIso
    },
    pregnancy: {
      id: 'preg-1',
      estHeatStart: '2026-09-02',
      heatDay4Report: '2026-09-06',
      progesteroneDay6: '0.24 (יחידות ושעה לא נמסרו)',
      progesteroneDay12: 'מעל 20 (יחידות ושעה לא נמסרו)',
      inseminationDates: ['2026-09-14', '2026-09-15'],
      ultrasoundDate: '2026-10-11',
      ultrasoundResult: 'אושר היריון (כ-27 ימים מהזרעה שנייה); נצפו כ-6 שקי היריון/מבנים עובריים, ייתכן יותר עקב חפיפה. מספר סופי לא ידוע.',
      estimatedWhelpingWindow: 'בין רביעי לשבת השבוע (11.11.2026 עד 14.11.2026) — ⚠️ הערכה לא מאומתת וטרינרית',
      vetConfirmedDueDate: '2026-11-14',
      xrayPerformed: 'לא ידוע / טרם הוזן',
      xrayDateAndResult: '11/10/26 ראו כ-6 גורים',
      updatedAt: nowIso
    },
    vetContact: {
      vetName: 'ד"ר מור פימה',
      vetPhone: '0547674785',
      emergencyClinicName: 'פמילי ווט',
      emergencyClinicPhone: '0772053303',
      whelpingHelperName: 'אלה',
      whelpingHelperPhone: '0507936043',
      whelpingAddress: 'אסתר רבין 39, חיפה',
      agreedEmergencyThresholds: '',
      updatedAt: nowIso
    },
    litter: {
      id: 'litter-1',
      actualBirthDate: '',
      laborStartTime: '',
      laborEndTime: '',
      liveBornCount: '',
      stillbornCount: '',
      placentasObservedCount: '',
      vetInterventionRequired: '',
      postPartumDamCheck: '',
      vetVerifiedEmptyUterus: '',
      vetSupplementalFeedingPlan: '', // תוכנית האכלה משלימה בהנחיית וטרינר בלבד
      notes: '',
      nextPuppySeq: 1,
      updatedAt: nowIso
    },
    puppies: [],
    weightEntries: [],
    feedingEntries: [],
    healthObservations: [],
    laborEvents: [],
    damDailyLogs: [],
    tasks: getDefaultChecklistTasks(nowIso),
    milestones: getDefaultMilestones(nowIso),
    environmentLogs: [],
    journalNotes: []
  };
}

class HeidiDataStore {
  constructor() {
    this.state = null;
    this.deviceId = 'dev_' + Math.random().toString(36).slice(2, 9);
    this.pushTimer = null;
    this.isPushing = false;
    this.lastProcessedMsgId = null;
    this.eventSource = null;
    this.lastSaveStatus = { ok: true, timeStr: '', message: 'מוכן' };
    this.load();
    this.initCloudSync();
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const initial = createInitialState();
        this.state = {
          ...initial,
          ...parsed,
          meta: { ...initial.meta, ...(parsed.meta || {}) },
          dam: { ...initial.dam, ...(parsed.dam || {}) },
          pregnancy: { ...initial.pregnancy, ...(parsed.pregnancy || {}) },
          vetContact: { ...initial.vetContact, ...(parsed.vetContact || {}) },
          litter: { ...initial.litter, ...(parsed.litter || {}) }
        };

        // השלמת פרטי הווטרינר וההיריון שהוזנו על ידי המשפחה אם השדות במכשיר היו ריקים
        Object.keys(initial.vetContact).forEach(k => {
          if (!this.state.vetContact[k] && initial.vetContact[k]) {
            this.state.vetContact[k] = initial.vetContact[k];
          }
        });
        if (this.state.vetContact.whelpingHelperName === 'אלה 0507936043' && !this.state.vetContact.whelpingHelperPhone) {
          this.state.vetContact.whelpingHelperName = 'אלה';
          this.state.vetContact.whelpingHelperPhone = '0507936043';
        }
        Object.keys(initial.pregnancy).forEach(k => {
          if (!this.state.pregnancy[k] && initial.pregnancy[k]) {
            this.state.pregnancy[k] = initial.pregnancy[k];
          }
        });
        this.save();

        // אם רשימת המשימות הייתה הרשימה הקצרה משלב א' (5 פריטים), נשדרג לרשימת 20 פריטי הציוד המלאה
        if (!this.state.tasks || this.state.tasks.length < 10) {
          this.state.tasks = getDefaultChecklistTasks(new Date().toISOString());
        }
        // נרמול סטטוס ישן 'pending' ל-'not_started'
        this.state.tasks.forEach(t => {
          if (t.status === 'pending') t.status = 'not_started';
        });

        if (!this.state.milestones || this.state.milestones.length === 0) {
          this.state.milestones = getDefaultMilestones(new Date().toISOString());
        }
        if (!this.state.journalNotes) {
          this.state.journalNotes = [];
        }
        if (!Array.isArray(this.state.meta.deletedIds)) {
          this.state.meta.deletedIds = [];
        }
        this.save(true);
      } else {
        this.state = createInitialState();
        this.state.meta.deletedIds = [];
        this.save(true);
      }
      this.updateSaveIndicator(true);
    } catch (err) {
      console.error('שגיאה בטעינת נתונים מ-LocalStorage:', err);
      this.state = createInitialState();
      this.state.meta.deletedIds = [];
      this.updateSaveIndicator(false, 'שגיאה בטעינת נתונים מקומיים');
    }
  }

  recordDeletedId(id) {
    if (!id) return;
    if (!Array.isArray(this.state.meta.deletedIds)) {
      this.state.meta.deletedIds = [];
    }
    if (!this.state.meta.deletedIds.includes(id)) {
      this.state.meta.deletedIds.push(id);
    }
  }

  save(skipCloudPush = false) {
    try {
      if (!skipCloudPush) {
        this.state.meta.updatedAt = new Date().toISOString();
      }
      const serialized = JSON.stringify(this.state);
      localStorage.setItem(STORAGE_KEY, serialized);
      const verify = localStorage.getItem(STORAGE_KEY);
      if (verify !== serialized) {
        throw new Error('אימות כתיבה לזיכרון המקומי נכשל');
      }
      this.updateSaveIndicator(true, '', skipCloudPush ? '☁️ מסונכרן למשפחה' : '☁️ מסנכרן למשפחה...');
      if (!skipCloudPush) {
        this.scheduleCloudPush();
      }
      return true;
    } catch (err) {
      console.error('שגיאה בשמירת נתונים:', err);
      this.updateSaveIndicator(false, err.message || 'שגיאת שמירה (ייתכן שהנפח מלא)');
      return false;
    }
  }

  updateSaveIndicator(ok, errorMsg = '', cloudLabel = '☁️ מסונכרן למשפחה') {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    this.lastSaveStatus = {
      ok,
      timeStr: `${hh}:${mm}`,
      message: ok ? `${cloudLabel} (${hh}:${mm})` : `⚠ השמירה נכשלה: ${errorMsg}`
    };
    const pill = document.getElementById('saveStatusPill');
    if (pill) {
      pill.textContent = this.lastSaveStatus.message;
      pill.className = ok ? 'save-pill' : 'save-pill error';
    }
  }

  // ========================================================================
  // סנכרון ענן חי בזמן אמת לכל המשפחה (תכלת, בעלה וההורים באייפון ובמחשב)
  // ========================================================================
  initCloudSync() {
    if (typeof window === 'undefined') return;
    setTimeout(() => {
      this.pullFromCloud(true);
      this.connectLiveStream();
    }, 300);

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.pullFromCloud(false);
      }
    });
    window.addEventListener('focus', () => {
      this.pullFromCloud(false);
    });
    setInterval(() => {
      if (document.visibilityState === 'visible' && !this.isPushing) {
        this.pullFromCloud(false);
      }
    }, 20000);
  }

  scheduleCloudPush() {
    if (this.pushTimer) clearTimeout(this.pushTimer);
    this.pushTimer = setTimeout(() => {
      this.pushToCloud();
    }, 650);
  }

  async pushToCloud() {
    if (this.isPushing) return;
    this.isPushing = true;
    try {
      const envelope = {
        _syncType: 'heidi_family_state_v2',
        _senderDevice: this.deviceId,
        _sentAt: new Date().toISOString(),
        state: this.state
      };
      const resp = await fetch(`https://ntfy.sh/${CLOUD_SYNC_TOPIC}`, {
        method: 'POST',
        body: JSON.stringify(envelope)
      });
      if (resp.ok) {
        const resJson = await resp.json().catch(() => ({}));
        if (resJson && resJson.id) {
          this.lastProcessedMsgId = resJson.id;
        }
        this.updateSaveIndicator(true, '', '☁️ מסונכרן לכל המשפחה');
      }
    } catch (e) {
      console.warn('Cloud push warning (saved locally):', e);
      this.updateSaveIndicator(true, '', '✓ שמור במכשיר (ממתין לרשת)');
    } finally {
      this.isPushing = false;
    }
  }

  async pullFromCloud(isInitial = false) {
    try {
      const resp = await fetch(`https://ntfy.sh/${CLOUD_SYNC_TOPIC}/json?poll=1&since=all`);
      if (!resp.ok) return;
      const text = await resp.text();
      const lines = text.trim().split('\n').filter(Boolean);
      if (lines.length === 0) {
        if (isInitial) {
          this.pushToCloud();
        }
        return;
      }
      // ניקח את ההודעה העדכנית ביותר מסוג message
      const msgLines = [];
      for (const line of lines) {
        try {
          const parsedLine = JSON.parse(line);
          if (parsedLine && parsedLine.event === 'message') {
            msgLines.push(parsedLine);
          }
        } catch (e) {}
      }
      if (msgLines.length === 0) {
        if (isInitial) this.pushToCloud();
        return;
      }
      // עיבוד 3 ההודעות האחרונות לפי סדר כדי להבטיח מיזוג מלא אם שניים שלחו יחד
      const recentMsgs = msgLines.slice(-3);
      let anyChanged = false;
      for (const msg of recentMsgs) {
        const changed = await this.processCloudMessage(msg, true);
        if (changed) anyChanged = true;
      }
      if (anyChanged && window.HeidiApp) {
        this.refreshAppViewSafely();
      }
    } catch (e) {
      console.warn('Cloud pull warning:', e);
    }
  }

  connectLiveStream() {
    if (typeof EventSource === 'undefined') return;
    try {
      if (this.eventSource) {
        this.eventSource.close();
      }
      this.eventSource = new EventSource(`https://ntfy.sh/${CLOUD_SYNC_TOPIC}/sse`);
      this.eventSource.onmessage = async (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg && msg.event === 'message') {
            const changed = await this.processCloudMessage(msg, false);
            if (changed && window.HeidiApp) {
              this.refreshAppViewSafely();
            }
          }
        } catch (e) {}
      };
    } catch (e) {
      console.warn('SSE stream warning:', e);
    }
  }

  async processCloudMessage(msg, allowSameDeviceOnInit = false) {
    if (!msg || !msg.id) return false;
    if (msg.id === this.lastProcessedMsgId) return false;

    let payloadText = msg.message || '';
    if (msg.attachment && msg.attachment.url) {
      try {
        const attResp = await fetch(msg.attachment.url);
        if (attResp.ok) {
          payloadText = await attResp.text();
        }
      } catch (e) {
        return false;
      }
    }
    if (!payloadText || !payloadText.startsWith('{')) return false;

    try {
      const parsed = JSON.parse(payloadText);
      const remoteState = parsed._syncType === 'heidi_family_state_v2' ? parsed.state : (parsed.dam ? parsed : null);
      if (!remoteState) return false;
      if (!allowSameDeviceOnInit && parsed._senderDevice && parsed._senderDevice === this.deviceId) {
        this.lastProcessedMsgId = msg.id;
        return false;
      }
      this.lastProcessedMsgId = msg.id;
      return this.mergeRemoteState(remoteState);
    } catch (e) {
      return false;
    }
  }

  mergeRemoteState(remote) {
    if (!remote || typeof remote !== 'object') return false;
    const beforeJson = JSON.stringify(this.state);

    // 1. איחוד רשימת מזהים שנמחקו
    const localDel = Array.isArray(this.state.meta?.deletedIds) ? this.state.meta.deletedIds : [];
    const remoteDel = Array.isArray(remote.meta?.deletedIds) ? remote.meta.deletedIds : [];
    const deletedSet = new Set([...localDel, ...remoteDel]);
    this.state.meta.deletedIds = Array.from(deletedSet);

    // 2. פונקציית עזר למיזוג מערכים לפי id ו-updatedAt (ללא דריסת הזנות קיימות באף מכשיר!)
    let localHasExtraOrNewer = false;
    const mergeArrayById = (localArr = [], remoteArr = []) => {
      const remoteIds = new Set((remoteArr || []).map(x => x && x.id).filter(Boolean));
      const map = new Map();
      localArr.forEach(item => {
        if (item && item.id && !deletedSet.has(item.id)) {
          map.set(item.id, item);
          if (!remoteIds.has(item.id)) {
            localHasExtraOrNewer = true;
          }
        }
      });
      remoteArr.forEach(rItem => {
        if (!rItem || !rItem.id || deletedSet.has(rItem.id)) return;
        const lItem = map.get(rItem.id);
        if (!lItem) {
          map.set(rItem.id, rItem);
        } else {
          const lTime = new Date(lItem.updatedAt || lItem.createdAt || 0).getTime() || 0;
          const rTime = new Date(rItem.updatedAt || rItem.createdAt || 0).getTime() || 0;
          if (rTime >= lTime) {
            map.set(rItem.id, rItem);
          } else {
            localHasExtraOrNewer = true;
          }
        }
      });
      return Array.from(map.values());
    };

    this.state.puppies = mergeArrayById(this.state.puppies, remote.puppies).sort((a, b) => (a.birthOrder || 0) - (b.birthOrder || 0));
    // הסרת רשומות משויכות לגור שנמחק
    this.state.weightEntries = mergeArrayById(this.state.weightEntries, remote.weightEntries).filter(w => !deletedSet.has(w.puppyId));
    this.state.feedingEntries = mergeArrayById(this.state.feedingEntries, remote.feedingEntries).filter(f => !deletedSet.has(f.puppyId));
    this.state.healthObservations = mergeArrayById(this.state.healthObservations, remote.healthObservations).filter(h => !deletedSet.has(h.puppyId));
    this.state.laborEvents = mergeArrayById(this.state.laborEvents, remote.laborEvents);
    this.state.damDailyLogs = mergeArrayById(this.state.damDailyLogs, remote.damDailyLogs);
    this.state.environmentLogs = mergeArrayById(this.state.environmentLogs, remote.environmentLogs);
    this.state.journalNotes = mergeArrayById(this.state.journalNotes, remote.journalNotes);
    this.state.tasks = mergeArrayById(this.state.tasks, remote.tasks);
    this.state.milestones = mergeArrayById(this.state.milestones, remote.milestones);

    // 3. מיזוג אובייקטים יחידים (dam, pregnancy, vetContact, litter) לפי updatedAt והשלמת שדות
    const mergeSingleObj = (localObj = {}, remoteObj = {}) => {
      const lTime = new Date(localObj.updatedAt || 0).getTime() || 0;
      const rTime = new Date(remoteObj.updatedAt || 0).getTime() || 0;
      const newer = rTime >= lTime ? remoteObj : localObj;
      const older = rTime >= lTime ? localObj : remoteObj;
      const merged = { ...older, ...newer };
      Object.keys(older).forEach(k => {
        if ((merged[k] === '' || merged[k] === null || merged[k] === undefined) && older[k]) {
          merged[k] = older[k];
        }
      });
      return merged;
    };

    if (remote.dam) this.state.dam = mergeSingleObj(this.state.dam, remote.dam);
    if (remote.pregnancy) this.state.pregnancy = mergeSingleObj(this.state.pregnancy, remote.pregnancy);
    if (remote.vetContact) this.state.vetContact = mergeSingleObj(this.state.vetContact, remote.vetContact);
    if (remote.litter) {
      const maxSeq = Math.max(
        Number(this.state.litter?.nextPuppySeq || 1),
        Number(remote.litter?.nextPuppySeq || 1),
        this.state.puppies.length + 1
      );
      this.state.litter = mergeSingleObj(this.state.litter, remote.litter);
      this.state.litter.nextPuppySeq = maxSeq;
    }

    const afterJson = JSON.stringify(this.state);
    if (localHasExtraOrNewer) {
      this.scheduleCloudPush();
    }
    if (afterJson !== beforeJson) {
      this.save(true);
      this.updateSaveIndicator(true, '', '☁️ התעדכן מהמשפחה');
      return true;
    }
    this.updateSaveIndicator(true, '', '☁️ מסונכרן לכל המשפחה');
    return false;
  }

  refreshAppViewSafely() {
    if (!window.HeidiApp) return;
    window.HeidiApp.renderEmergencyStrip();
    const modalBackdrop = document.getElementById('appModalBackdrop');
    // אם אין כרגע חלון טופס פתוח באמצע הקלדה — נרענן את המסך מיד
    if (!modalBackdrop || !modalBackdrop.classList.contains('open')) {
      window.HeidiApp.switchTab(window.HeidiApp.activeTab || 'dashboard');
    }
  }

  generatePuppyCode() {
    const seq = this.state.litter.nextPuppySeq || (this.state.puppies.length + 1);
    const code = `H-${String(seq).padStart(2, '0')}`;
    this.state.litter.nextPuppySeq = seq + 1;
    return code;
  }

  addPuppy(data) {
    const nowIso = new Date().toISOString();
    const code = this.generatePuppyCode();
    const id = 'pup_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const birthOrderNum = data.birthOrder || this.state.puppies.length + 1;
    const birthWeightNum = data.birthWeightG !== '' && data.birthWeightG !== null && !isNaN(Number(data.birthWeightG))
      ? Number(data.birthWeightG)
      : null;

    const newPuppy = {
      id,
      code,
      birthOrder: birthOrderNum,
      name: (data.name || '').trim() || `גור ${birthOrderNum}`,
      sex: data.sex || 'unknown',
      ribbonColorName: (data.ribbonColorName || 'ללא סרט').trim(),
      ribbonColorHex: data.ribbonColorHex || '#94a3b8',
      coatColor: (data.coatColor || '').trim(),
      markings: (data.markings || '').trim(),
      birthDateTime: data.birthDateTime || '',
      birthWeightG: birthWeightNum,
      status: data.status || 'with_dam',
      birthDetails: {
        presentation: data.presentation || 'לא ידוע',
        bornInSac: data.bornInSac || 'לא ידוע',
        assistanceRequired: data.assistanceRequired || 'לא',
        obsBreathing: Boolean(data.obsBreathing ?? true),
        obsActive: Boolean(data.obsActive ?? true),
        obsWarm: Boolean(data.obsWarm ?? true),
        obsResponsive: Boolean(data.obsResponsive ?? true),
        obsNursing: Boolean(data.obsNursing ?? false),
        cordHandledBy: data.cordHandledBy || 'האם (היידי)',
        placentaObserved: data.placentaObserved || 'לא ידוע',
        vetBirthNotes: (data.vetBirthNotes || '').trim()
      },
      photoDataUrl: data.photoDataUrl || '',
      notes: (data.notes || '').trim(),
      createdAt: nowIso,
      updatedAt: nowIso
    };

    this.state.puppies.push(newPuppy);

    if (birthWeightNum !== null && birthWeightNum > 0) {
      const eventAt = newPuppy.birthDateTime || nowIso;
      this.state.weightEntries.push({
        id: 'w_' + Date.now() + '_birth',
        puppyId: id,
        eventAt,
        weightG: birthWeightNum,
        isBirthWeight: true,
        weighedBy: data.weighedBy || '',
        notes: 'משקל לידה ראשוני',
        createdAt: nowIso,
        updatedAt: nowIso
      });
    }

    if (!this.state.litter.actualBirthDate && newPuppy.birthDateTime) {
      this.state.litter.actualBirthDate = newPuppy.birthDateTime.slice(0, 10);
    }

    this.save();
    return newPuppy;
  }

  updatePuppy(puppyId, updates) {
    const idx = this.state.puppies.findIndex(p => p.id === puppyId);
    if (idx === -1) return null;
    const nowIso = new Date().toISOString();
    const existing = this.state.puppies[idx];

    const birthWeightNum = updates.birthWeightG !== '' && updates.birthWeightG !== null && !isNaN(Number(updates.birthWeightG))
      ? Number(updates.birthWeightG)
      : null;

    const existingBirthDetails = existing.birthDetails || {};
    const updatedBirthDetails = updates.birthDetails
      ? { ...existingBirthDetails, ...updates.birthDetails }
      : existingBirthDetails;

    this.state.puppies[idx] = {
      ...existing,
      name: (updates.name || '').trim() || existing.name,
      sex: updates.sex || existing.sex,
      ribbonColorName: (updates.ribbonColorName || '').trim() || 'ללא סרט',
      ribbonColorHex: updates.ribbonColorHex || existing.ribbonColorHex || '#94a3b8',
      coatColor: (updates.coatColor ?? existing.coatColor).trim(),
      markings: (updates.markings ?? existing.markings).trim(),
      birthDateTime: updates.birthDateTime ?? existing.birthDateTime,
      birthWeightG: birthWeightNum,
      status: updates.status || existing.status,
      birthDetails: updatedBirthDetails,
      photoDataUrl: updates.photoDataUrl !== undefined ? updates.photoDataUrl : existing.photoDataUrl,
      notes: (updates.notes ?? existing.notes).trim(),
      updatedAt: nowIso
    };

    const birthEntryIdx = this.state.weightEntries.findIndex(w => w.puppyId === puppyId && w.isBirthWeight);
    if (birthWeightNum !== null && birthWeightNum > 0) {
      if (birthEntryIdx !== -1) {
        this.state.weightEntries[birthEntryIdx].weightG = birthWeightNum;
        if (updates.birthDateTime) {
          this.state.weightEntries[birthEntryIdx].eventAt = updates.birthDateTime;
        }
        this.state.weightEntries[birthEntryIdx].updatedAt = nowIso;
      } else {
        this.state.weightEntries.push({
          id: 'w_' + Date.now() + '_birth',
          puppyId,
          eventAt: updates.birthDateTime || nowIso,
          weightG: birthWeightNum,
          isBirthWeight: true,
          weighedBy: '',
          notes: 'משקל לידה ראשוני',
          createdAt: nowIso,
          updatedAt: nowIso
        });
      }
    }

    this.save();
    return this.state.puppies[idx];
  }

  deletePuppy(puppyId) {
    this.recordDeletedId(puppyId);
    this.state.weightEntries.filter(w => w.puppyId === puppyId).forEach(w => this.recordDeletedId(w.id));
    this.state.feedingEntries.filter(f => f.puppyId === puppyId).forEach(f => this.recordDeletedId(f.id));
    this.state.healthObservations.filter(h => h.puppyId === puppyId).forEach(h => this.recordDeletedId(h.id));
    this.state.puppies = this.state.puppies.filter(p => p.id !== puppyId);
    this.state.weightEntries = this.state.weightEntries.filter(w => w.puppyId !== puppyId);
    this.state.feedingEntries = this.state.feedingEntries.filter(f => f.puppyId !== puppyId);
    this.state.healthObservations = this.state.healthObservations.filter(h => h.puppyId !== puppyId);
    this.save();
  }

  // ========================================================================
  // שלב ב': אירועי המלטה וסיכום המלטה
  // ========================================================================
  addLaborEvent(data) {
    const nowIso = new Date().toISOString();
    const eventAt = data.eventAt || nowIso;
    const ev = {
      id: 'lev_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      eventType: data.eventType || 'free_note',
      eventAt,
      description: (data.description || '').trim(),
      recordedBy: (data.recordedBy || 'תכלת').trim(),
      interventionRequired: Boolean(data.interventionRequired),
      interventionDetails: (data.interventionDetails || '').trim(),
      relatedPuppyId: data.relatedPuppyId || null,
      relatedPuppyCode: data.relatedPuppyCode || null,
      placentaCountDelta: Number(data.placentaCountDelta || 0),
      photoDataUrl: data.photoDataUrl || '',
      createdAt: nowIso,
      updatedAt: nowIso,
      editHistory: []
    };

    this.state.laborEvents.push(ev);

    if (!this.state.litter.laborStartTime && (ev.eventType === 'stage1_start' || ev.eventType === 'contractions_start' || ev.eventType === 'puppy_born')) {
      this.state.litter.laborStartTime = eventAt;
    }

    this.save();
    return ev;
  }

  updateLaborEvent(eventId, updates) {
    const idx = this.state.laborEvents.findIndex(e => e.id === eventId);
    if (idx === -1) return null;
    const nowIso = new Date().toISOString();
    const existing = this.state.laborEvents[idx];

    const editHistory = existing.editHistory || [];
    editHistory.push({
      previousEventAt: existing.eventAt,
      previousDescription: existing.description,
      editedAt: nowIso
    });

    this.state.laborEvents[idx] = {
      ...existing,
      eventType: updates.eventType || existing.eventType,
      eventAt: updates.eventAt || existing.eventAt,
      description: (updates.description ?? existing.description).trim(),
      recordedBy: (updates.recordedBy ?? existing.recordedBy).trim(),
      interventionRequired: updates.interventionRequired !== undefined ? Boolean(updates.interventionRequired) : existing.interventionRequired,
      interventionDetails: (updates.interventionDetails ?? existing.interventionDetails).trim(),
      photoDataUrl: updates.photoDataUrl !== undefined ? updates.photoDataUrl : existing.photoDataUrl,
      updatedAt: nowIso,
      editHistory
    };

    this.save();
    return this.state.laborEvents[idx];
  }

  deleteLaborEvent(eventId) {
    this.recordDeletedId(eventId);
    this.state.laborEvents = this.state.laborEvents.filter(e => e.id !== eventId);
    this.save();
  }

  updateLitterSummary(summaryData) {
    const nowIso = new Date().toISOString();
    this.state.litter = {
      ...this.state.litter,
      ...summaryData,
      updatedAt: nowIso
    };
    this.save();
  }

  getWhelpingLiveStats() {
    const events = this.state.laborEvents.slice().sort((a, b) => new Date(a.eventAt).getTime() - new Date(b.eventAt).getTime());
    const puppies = this.state.puppies;
    const nowMs = Date.now();

    const formatElapsed = (fromIso) => {
      if (!fromIso) return null;
      const tMs = new Date(fromIso).getTime();
      if (isNaN(tMs)) return null;
      const diffMin = Math.max(0, Math.floor((nowMs - tMs) / 60000));
      const hours = Math.floor(diffMin / 60);
      const mins = diffMin % 60;
      if (hours === 0) return `${mins} דקות`;
      return `${hours} שעות ו-${mins} דק׳`;
    };

    const stage1Ev = events.find(e => e.eventType === 'stage1_start');
    const lastContractionEv = [...events].reverse().find(e => e.eventType === 'contractions_start');
    const lastPuppyEv = [...events].reverse().find(e => e.eventType === 'puppy_born');

    let lastPuppyTimeIso = lastPuppyEv ? lastPuppyEv.eventAt : null;
    if (!lastPuppyTimeIso && puppies.length > 0) {
      const sortedPups = puppies.filter(p => p.birthDateTime).sort((a, b) => new Date(b.birthDateTime).getTime() - new Date(a.birthDateTime).getTime());
      if (sortedPups.length > 0) lastPuppyTimeIso = sortedPups[0].birthDateTime;
    }

    const placentaEventsCount = events.filter(e => e.eventType === 'placenta_delivered').length;
    const puppyPlacentasCount = puppies.filter(p => p.birthDetails && p.birthDetails.placentaObserved === 'כן').length;
    const totalObservedPlacentas = this.state.litter.placentasObservedCount !== ''
      ? Number(this.state.litter.placentasObservedCount)
      : (placentaEventsCount + puppyPlacentasCount);

    return {
      totalEvents: events.length,
      puppiesBornCount: puppies.length,
      totalObservedPlacentas,
      stage1StartIso: stage1Ev ? stage1Ev.eventAt : this.state.litter.laborStartTime,
      elapsedSinceStage1: formatElapsed(stage1Ev ? stage1Ev.eventAt : this.state.litter.laborStartTime),
      lastContractionIso: lastContractionEv ? lastContractionEv.eventAt : null,
      elapsedSinceContractions: formatElapsed(lastContractionEv ? lastContractionEv.eventAt : null),
      lastPuppyIso: lastPuppyTimeIso,
      elapsedSinceLastPuppy: formatElapsed(lastPuppyTimeIso)
    };
  }

  // ========================================================================
  // שלב ג': 1. מעקב יומי אחר היידי — האם (לפני ההמלטה: חום בוקר/ערב + אחרי ההמלטה)
  // ========================================================================
  addDamDailyLog(data) {
    const nowIso = new Date().toISOString();
    const stage = data.stage || (this.state.puppies.length === 0 ? 'pre_whelping' : 'post_whelping');
    const isPre = stage === 'pre_whelping';
    const tempVal = (data.temperatureC || '').trim();
    const tempNum = tempVal !== '' && !isNaN(Number(tempVal)) ? Number(tempVal) : null;
    const isTempDrop = Boolean(isPre && tempNum !== null && tempNum > 34 && tempNum < 37.8);

    const hasRedFlag = Boolean(
      data.appetite === 'חוסר תיאבון משמעותי' ||
      data.mood === 'אפטית / חלשה מאוד' ||
      (!isPre && (
        data.dischargeSmell === 'ריח רע / חריג' ||
        data.dischargeTrend === 'מתגברת / דימום טרי' ||
        data.mammaryState === 'אודם / חום / כאב / קושי' ||
        data.maternalBehavior === 'התנהגות חריגה / דחייה'
      )) ||
      (tempNum !== null && tempNum >= 39.5)
    );

    const entry = {
      id: 'dlog_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      stage,
      checkShift: data.checkShift || '',
      preWhelpingSigns: data.preWhelpingSigns || 'רגילה — ללא סימנים מקדימים',
      isTempDrop,
      eventAt: data.eventAt || nowIso,
      weightKg: (data.weightKg || '').trim(),
      appetite: data.appetite || 'תקין / אוכלת בתיאבון',
      drinking: data.drinking || 'תקינה',
      elimination: data.elimination || 'תקין',
      mood: data.mood || 'ערנית ורגועה',
      temperatureC: tempVal,
      dischargeColorQty: isPre ? '' : (data.dischargeColorQty || '').trim(),
      dischargeSmell: isPre ? '' : (data.dischargeSmell || 'ללא ריח רע (תקין)'),
      dischargeTrend: isPre ? '' : (data.dischargeTrend || 'במגמת ירידה / רגילה'),
      mammaryState: data.mammaryState || 'רכים ותקינים',
      maternalBehavior: isPre ? '' : (data.maternalBehavior || 'מניקה ומטפלת היטב'),
      medsGiven: (data.medsGiven || '').trim(),
      recordedBy: (data.recordedBy || 'משפחת היידי').trim(),
      notes: (data.notes || '').trim(),
      photoDataUrl: data.photoDataUrl || '',
      hasRedFlag,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    this.state.damDailyLogs.push(entry);
    if (entry.weightKg) {
      this.state.dam.currentWeightKg = entry.weightKg;
    }
    this.save();
    return entry;
  }

  updateDamDailyLog(logId, data) {
    const idx = this.state.damDailyLogs.findIndex(x => x.id === logId);
    if (idx === -1) return null;
    const existing = this.state.damDailyLogs[idx];
    const nowIso = new Date().toISOString();
    const stage = data.stage || existing.stage || (this.state.puppies.length === 0 ? 'pre_whelping' : 'post_whelping');
    const isPre = stage === 'pre_whelping';
    const tempVal = (data.temperatureC ?? existing.temperatureC ?? '').trim();
    const tempNum = tempVal !== '' && !isNaN(Number(tempVal)) ? Number(tempVal) : null;
    const isTempDrop = Boolean(isPre && tempNum !== null && tempNum > 34 && tempNum < 37.8);

    const hasRedFlag = Boolean(
      data.appetite === 'חוסר תיאבון משמעותי' ||
      data.mood === 'אפטית / חלשה מאוד' ||
      (!isPre && (
        data.dischargeSmell === 'ריח רע / חריג' ||
        data.dischargeTrend === 'מתגברת / דימום טרי' ||
        data.mammaryState === 'אודם / חום / כאב / קושי' ||
        data.maternalBehavior === 'התנהגות חריגה / דחייה'
      )) ||
      (tempNum !== null && tempNum >= 39.5)
    );

    this.state.damDailyLogs[idx] = {
      ...existing,
      stage,
      checkShift: data.checkShift ?? existing.checkShift ?? '',
      preWhelpingSigns: data.preWhelpingSigns ?? existing.preWhelpingSigns ?? 'רגילה — ללא סימנים מקדימים',
      isTempDrop,
      eventAt: data.eventAt || existing.eventAt,
      weightKg: (data.weightKg ?? existing.weightKg ?? '').trim(),
      appetite: data.appetite || existing.appetite,
      drinking: data.drinking || existing.drinking,
      elimination: data.elimination || existing.elimination,
      mood: data.mood || existing.mood,
      temperatureC: tempVal,
      dischargeColorQty: isPre ? '' : (data.dischargeColorQty ?? existing.dischargeColorQty ?? '').trim(),
      dischargeSmell: isPre ? '' : (data.dischargeSmell || existing.dischargeSmell || 'ללא ריח רע (תקין)'),
      dischargeTrend: isPre ? '' : (data.dischargeTrend || existing.dischargeTrend || 'במגמת ירידה / רגילה'),
      mammaryState: data.mammaryState || existing.mammaryState || 'רכים ותקינים',
      maternalBehavior: isPre ? '' : (data.maternalBehavior || existing.maternalBehavior || 'מניקה ומטפלת היטב'),
      medsGiven: (data.medsGiven ?? existing.medsGiven ?? '').trim(),
      recordedBy: (data.recordedBy ?? existing.recordedBy ?? 'משפחת היידי').trim(),
      notes: (data.notes ?? existing.notes ?? '').trim(),
      photoDataUrl: data.photoDataUrl !== undefined && data.photoDataUrl !== '' ? data.photoDataUrl : existing.photoDataUrl,
      hasRedFlag,
      updatedAt: nowIso
    };
    if (this.state.damDailyLogs[idx].weightKg) {
      this.state.dam.currentWeightKg = this.state.damDailyLogs[idx].weightKg;
    }
    this.save();
    return this.state.damDailyLogs[idx];
  }

  deleteDamDailyLog(logId) {
    this.recordDeletedId(logId);
    this.state.damDailyLogs = this.state.damDailyLogs.filter(x => x.id !== logId);
    this.save();
  }

  // ========================================================================
  // שלב ג': 2. מעקב הנקה והאכלה לגורים (FeedingEntry)
  // ========================================================================
  addFeedingEntry(data) {
    const nowIso = new Date().toISOString();
    const entry = {
      id: 'feed_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      puppyId: data.puppyId,
      eventAt: data.eventAt || nowIso,
      feedingType: data.feedingType || 'הנקה מהאם',
      durationMinutes: (data.durationMinutes || '').trim(),
      effectiveLatch: data.effectiveLatch || 'כן',
      recordedBy: (data.recordedBy || 'תכלת').trim(),
      notes: (data.notes || '').trim(),
      createdAt: nowIso,
      updatedAt: nowIso
    };
    this.state.feedingEntries.push(entry);
    this.save();
    return entry;
  }

  deleteFeedingEntry(entryId) {
    this.recordDeletedId(entryId);
    this.state.feedingEntries = this.state.feedingEntries.filter(x => x.id !== entryId);
    this.save();
  }

  // ========================================================================
  // שלב ג': 3. תצפיות בריאות לכל גור (HealthObservation)
  // ========================================================================
  addHealthObservation(data) {
    const nowIso = new Date().toISOString();
    const entry = {
      id: 'hobs_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      puppyId: data.puppyId,
      eventAt: data.eventAt || nowIso,
      activityVitality: data.activityVitality || 'פעיל וחיוני',
      suckleReflex: data.suckleReflex || 'תקין וחזק',
      cryingRestlessness: data.cryingRestlessness || 'רגוע וישן היטב',
      warmthToTouch: data.warmthToTouch || 'חמים ונעים למגע',
      generalAppearance: (data.generalAppearance || '').trim(),
      urineStool: data.urineStool || 'נצפה תקין',
      breathingObs: data.breathingObs || 'רגועה וסדירה',
      vetExamDiagnosisTreatment: (data.vetExamDiagnosisTreatment || '').trim(),
      photoDataUrl: data.photoDataUrl || '',
      notes: (data.notes || '').trim(),
      createdAt: nowIso,
      updatedAt: nowIso
    };
    this.state.healthObservations.push(entry);
    this.save();
    return entry;
  }

  deleteHealthObservation(obsId) {
    this.recordDeletedId(obsId);
    this.state.healthObservations = this.state.healthObservations.filter(x => x.id !== obsId);
    this.save();
  }

  // ========================================================================
  // שלב ג': 4. סביבת הגורים (טמפרטורה ולחות), צ'קליסט, אבני דרך ויומן חופשי
  // ========================================================================
  addEnvironmentLog(data) {
    const nowIso = new Date().toISOString();
    const tempNum = Number(data.tempC);
    if (isNaN(tempNum)) {
      throw new Error('יש להזין טמפרטורה תקינה במעלות צלזיוס');
    }
    const humNum = data.humidityPct !== '' && data.humidityPct !== null && !isNaN(Number(data.humidityPct))
      ? Number(data.humidityPct)
      : null;

    const entry = {
      id: 'env_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      eventAt: data.eventAt || nowIso,
      tempC: tempNum,
      humidityPct: humNum,
      heatSourceNotes: (data.heatSourceNotes || '').trim(),
      recordedBy: (data.recordedBy || 'תכלת').trim(),
      notes: (data.notes || '').trim(),
      createdAt: nowIso,
      updatedAt: nowIso
    };
    this.state.environmentLogs.push(entry);
    this.save();
    return entry;
  }

  deleteEnvironmentLog(envId) {
    this.recordDeletedId(envId);
    this.state.environmentLogs = this.state.environmentLogs.filter(x => x.id !== envId);
    this.save();
  }

  updateTaskItem(taskId, updates) {
    const idx = this.state.tasks.findIndex(t => t.id === taskId);
    if (idx === -1) return null;
    this.state.tasks[idx] = {
      ...this.state.tasks[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.save();
    return this.state.tasks[idx];
  }

  addTaskItem(data) {
    const nowIso = new Date().toISOString();
    const item = {
      id: 'chk_' + Date.now(),
      category: data.category || 'משימות ותזכורות',
      title: (data.title || '').trim(),
      status: data.status || 'not_started',
      notes: (data.notes || '').trim(),
      createdAt: nowIso,
      updatedAt: nowIso
    };
    this.state.tasks.push(item);
    this.save();
    return item;
  }

  deleteTaskItem(taskId) {
    this.recordDeletedId(taskId);
    this.state.tasks = this.state.tasks.filter(t => t.id !== taskId);
    this.save();
  }

  updateMilestone(msId, updates) {
    const idx = this.state.milestones.findIndex(m => m.id === msId);
    if (idx === -1) return null;
    this.state.milestones[idx] = {
      ...this.state.milestones[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.save();
    return this.state.milestones[idx];
  }

  addFreeJournalNote(data) {
    const nowIso = new Date().toISOString();
    const note = {
      id: 'jrn_' + Date.now(),
      eventAt: data.eventAt || nowIso,
      title: (data.title || '').trim(),
      content: (data.content || '').trim(),
      recordedBy: (data.recordedBy || 'תכלת').trim(),
      createdAt: nowIso,
      updatedAt: nowIso
    };
    this.state.journalNotes.push(note);
    this.save();
    return note;
  }

  deleteFreeJournalNote(noteId) {
    this.recordDeletedId(noteId);
    this.state.journalNotes = this.state.journalNotes.filter(n => n.id !== noteId);
    this.save();
  }

  // ========================================================================
  // שקילות וחישובי גדילה (שלב א')
  // ========================================================================
  addWeightEntry(data) {
    const nowIso = new Date().toISOString();
    const weightNum = Number(data.weightG);
    if (isNaN(weightNum) || weightNum <= 0) {
      throw new Error('יש להזין משקל תקין בגרמים (גדול מ-0)');
    }
    const entry = {
      id: 'w_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      puppyId: data.puppyId,
      eventAt: data.eventAt || nowIso,
      weightG: weightNum,
      isBirthWeight: Boolean(data.isBirthWeight),
      weighedBy: (data.weighedBy || '').trim(),
      notes: (data.notes || '').trim(),
      createdAt: nowIso,
      updatedAt: nowIso
    };
    this.state.weightEntries.push(entry);
    this.save();
    return entry;
  }

  updateWeightEntry(entryId, updates) {
    const idx = this.state.weightEntries.findIndex(w => w.id === entryId);
    if (idx === -1) return null;
    const weightNum = Number(updates.weightG);
    if (isNaN(weightNum) || weightNum <= 0) {
      throw new Error('יש להזין משקל תקין בגרמים (גדול מ-0)');
    }
    const nowIso = new Date().toISOString();
    const existing = this.state.weightEntries[idx];

    const editHistory = existing.editHistory || [];
    editHistory.push({
      previousWeightG: existing.weightG,
      previousEventAt: existing.eventAt,
      editedAt: nowIso
    });

    this.state.weightEntries[idx] = {
      ...existing,
      eventAt: updates.eventAt || existing.eventAt,
      weightG: weightNum,
      weighedBy: (updates.weighedBy ?? existing.weighedBy).trim(),
      notes: (updates.notes ?? existing.notes).trim(),
      updatedAt: nowIso,
      editHistory
    };

    if (existing.isBirthWeight) {
      const pup = this.state.puppies.find(p => p.id === existing.puppyId);
      if (pup) pup.birthWeightG = weightNum;
    }

    this.save();
    return this.state.weightEntries[idx];
  }

  deleteWeightEntry(entryId) {
    this.recordDeletedId(entryId);
    this.state.weightEntries = this.state.weightEntries.filter(w => w.id !== entryId);
    this.save();
  }

  getCalculatedWeightsForPuppy(puppyId) {
    const puppy = this.state.puppies.find(p => p.id === puppyId);
    if (!puppy) return [];

    const rawEntries = this.state.weightEntries
      .filter(w => w.puppyId === puppyId)
      .slice()
      .sort((a, b) => new Date(a.eventAt).getTime() - new Date(b.eventAt).getTime());

    const birthWeightG = (puppy.birthWeightG && puppy.birthWeightG > 0)
      ? puppy.birthWeightG
      : (rawEntries.length > 0 && rawEntries[0].isBirthWeight ? rawEntries[0].weightG : null);

    const birthTimeMs = puppy.birthDateTime ? new Date(puppy.birthDateTime).getTime() : null;

    return rawEntries.map((entry, idx) => {
      const currentW = entry.weightG;
      const entryTimeMs = new Date(entry.eventAt).getTime();

      let ageHours = null;
      let ageDaysDecimal = null;
      let ageDisplay = 'חסרה שעת לידה';

      if (birthTimeMs && !isNaN(birthTimeMs) && !isNaN(entryTimeMs)) {
        const diffMs = Math.max(0, entryTimeMs - birthTimeMs);
        ageHours = diffMs / (1000 * 60 * 60);
        ageDaysDecimal = ageHours / 24;
        const fullDays = Math.floor(ageHours / 24);
        const remHours = Math.round(ageHours % 24);
        ageDisplay = fullDays === 0 ? `${remHours} שעות` : `יום ${fullDays} (${remHours} ש')`;
      }

      let deltaG = null;
      let deltaPercent = null;
      let dailyGainG = null;

      if (idx > 0) {
        const prev = rawEntries[idx - 1];
        const prevW = prev.weightG;
        const prevTimeMs = new Date(prev.eventAt).getTime();

        if (prevW > 0) {
          deltaG = currentW - prevW;
          deltaPercent = (deltaG / prevW) * 100;
        }

        const elapsedMs = entryTimeMs - prevTimeMs;
        const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
        if (elapsedDays >= (1 / 24) && deltaG !== null) {
          dailyGainG = deltaG / elapsedDays;
        }
      }

      let changeFromBirthPercent = null;
      let changeFromBirthG = null;
      if (birthWeightG && birthWeightG > 0) {
        changeFromBirthG = currentW - birthWeightG;
        changeFromBirthPercent = ((currentW - birthWeightG) / birthWeightG) * 100;
      }

      let alertMessage = null;
      if (idx > 0 && deltaG !== null) {
        if (ageHours !== null && ageHours > 24 && deltaG < 0) {
          alertMessage = 'ירידה במשקל לאחר 24 השעות הראשונות — יש ליצור קשר עם הווטרינר/ית להערכה';
        } else if (ageHours !== null && ageHours <= 24 && changeFromBirthPercent !== null && changeFromBirthPercent <= -10) {
          alertMessage = 'ירידה של 10% או יותר ביממה הראשונה — יש ליצור קשר עם הווטרינר/ית להערכה';
        } else if (ageHours !== null && ageHours > 48 && deltaG === 0) {
          alertMessage = 'היעדר עלייה במשקל — יש ליצור קשר עם הווטרינר/ית להערכה';
        }
      }

      return {
        ...entry,
        ageHours,
        ageDaysDecimal,
        ageDisplay,
        deltaG,
        deltaPercent,
        changeFromBirthG,
        changeFromBirthPercent,
        dailyGainG,
        alertMessage
      };
    });
  }

  getPuppySummary(puppyId) {
    const puppy = this.state.puppies.find(p => p.id === puppyId);
    if (!puppy) return null;
    const calcEntries = this.getCalculatedWeightsForPuppy(puppyId);
    const latest = calcEntries.length > 0 ? calcEntries[calcEntries.length - 1] : null;

    const todayStr = new Date().toISOString().slice(0, 10);
    const weighedToday = calcEntries.some(e => e.eventAt && e.eventAt.slice(0, 10) === todayStr);

    let avgDailyGainFromBirthG = null;
    if (latest && puppy.birthWeightG && puppy.birthWeightG > 0 && latest.ageDaysDecimal && latest.ageDaysDecimal >= 0.25) {
      avgDailyGainFromBirthG = (latest.weightG - puppy.birthWeightG) / latest.ageDaysDecimal;
    }

    const feedingsCount = this.state.feedingEntries.filter(f => f.puppyId === puppyId).length;
    const healthObsCount = this.state.healthObservations.filter(h => h.puppyId === puppyId).length;

    return {
      puppy,
      entriesCount: calcEntries.length,
      feedingsCount,
      healthObsCount,
      latestEntry: latest,
      currentWeightG: latest ? latest.weightG : puppy.birthWeightG,
      weighedToday,
      avgDailyGainFromBirthG,
      hasVetAlert: Boolean(latest && latest.alertMessage),
      vetAlertText: latest ? latest.alertMessage : null
    };
  }

  // ========================================================================
  // שלב ד': ייצוא, גיבוי ושחזור נתונים (JSON / CSV)
  // ========================================================================
  recordBackupTimestamp() {
    this.state.meta.lastBackupAt = new Date().toISOString();
    this.save();
  }

  getExportJsonPayload() {
    this.recordBackupTimestamp();
    return JSON.stringify(this.state, null, 2);
  }

  getSinglePuppyExportJson(puppyId) {
    const puppy = this.state.puppies.find(p => p.id === puppyId);
    if (!puppy) return null;
    this.recordBackupTimestamp();
    const payload = {
      exportedAt: new Date().toISOString(),
      damName: this.state.dam.name,
      puppy,
      calculatedWeights: this.getCalculatedWeightsForPuppy(puppyId),
      feedings: this.state.feedingEntries.filter(f => f.puppyId === puppyId),
      healthObservations: this.state.healthObservations.filter(h => h.puppyId === puppyId)
    };
    return JSON.stringify(payload, null, 2);
  }

  importFromJsonString(jsonStr) {
    const parsed = JSON.parse(jsonStr);
    if (!parsed || typeof parsed !== 'object' || (!parsed.dam && !parsed.puppies)) {
      throw new Error('קובץ הגיבוי אינו תקין או אינו שייך למערכת המעקב של היידי');
    }
    const initial = createInitialState();
    this.state = {
      ...initial,
      ...parsed,
      meta: { ...initial.meta, ...(parsed.meta || {}), updatedAt: new Date().toISOString() },
      dam: { ...initial.dam, ...(parsed.dam || {}) },
      pregnancy: { ...initial.pregnancy, ...(parsed.pregnancy || {}) },
      vetContact: { ...initial.vetContact, ...(parsed.vetContact || {}) },
      litter: { ...initial.litter, ...(parsed.litter || {}) }
    };
    this.save();
    return true;
  }

  getWeightsCsvString() {
    this.recordBackupTimestamp();
    const headers = [
      'מס"ד',
      'מזהה גור',
      'שם גור',
      'צבע סרט זיהוי',
      'מין',
      'מועד שקילה',
      'גיל בשקילה',
      'משקל (גרם)',
      'שינוי משקילה קודמת (גרם)',
      'שינוי משקילה קודמת (%)',
      'שינוי ממשקל לידה (%)',
      'קצב יומי (גרם/יום)',
      'שוקל/ת',
      'הערות'
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const s = String(val).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = [headers.map(escapeCsv).join(',')];
    let rowCounter = 1;

    this.state.puppies.forEach(p => {
      const calc = this.getCalculatedWeightsForPuppy(p.id);
      calc.forEach(w => {
        const line = [
          rowCounter++,
          p.code,
          p.name,
          p.ribbonColorName || 'ללא סרט',
          SEX_LABELS[p.sex] || p.sex,
          w.eventAt,
          w.ageDisplay,
          w.weightG,
          w.deltaG !== null ? w.deltaG : '',
          w.deltaPercent !== null ? w.deltaPercent.toFixed(1) : '',
          w.changeFromBirthPercent !== null ? w.changeFromBirthPercent.toFixed(1) : '',
          w.dailyGainG !== null ? w.dailyGainG.toFixed(1) : '',
          w.weighedBy || '',
          w.notes || ''
        ];
        rows.push(line.map(escapeCsv).join(','));
      });
    });

    // הוספת BOM של UTF-8 לפתיחה תקינה בעברית באקסל
    return '\uFEFF' + rows.join('\r\n');
  }
}

window.HeidiStore = new HeidiDataStore();
window.RIBBON_PRESETS = RIBBON_PRESETS;
window.STATUS_LABELS = STATUS_LABELS;
window.SEX_LABELS = SEX_LABELS;
window.LABOR_EVENT_TYPES = LABOR_EVENT_TYPES;


