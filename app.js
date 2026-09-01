  /* ── Theme Engine (Light / Dark / System Auto) ── */
  const THEME_KEY = 'paisa-hisaab-theme';
  let currentThemeSetting = localStorage.getItem(THEME_KEY) || 'light';

  function applyTheme(mode, save = true){
    currentThemeSetting = mode;
    if(save){
      try{ localStorage.setItem(THEME_KEY, mode); }catch(e){}
    }

    let isDark = false;
    if(mode === 'dark'){
      isDark = true;
    } else if(mode === 'light'){
      isDark = false;
    } else { // 'auto'
      isDark = Boolean(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }

    document.body.classList.toggle('dark-mode', isDark);

    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if(metaThemeColor){
      metaThemeColor.setAttribute('content', isDark ? '#0B0D18' : '#5B3DF5');
    }

    const quickThemeIcon = document.getElementById('quickThemeIcon');
    if(quickThemeIcon){
      quickThemeIcon.textContent = isDark ? '☀️' : '🌙';
    }

    document.querySelectorAll('.theme-chip').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === mode);
    });
  }

  const quickThemeBtnEl = document.getElementById('quickThemeBtn');
  if(quickThemeBtnEl){
    quickThemeBtnEl.addEventListener('click', () => {
      const isCurrentlyDark = document.body.classList.contains('dark-mode');
      applyTheme(isCurrentlyDark ? 'light' : 'dark', true);
    });
  }

  document.querySelectorAll('.theme-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      applyTheme(btn.dataset.theme, true);
    });
  });

  if(window.matchMedia){
    try{
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if(currentThemeSetting === 'auto'){
          applyTheme('auto', false);
        }
      });
    }catch(e){}
  }

  applyTheme(currentThemeSetting, false);

  let entries = [];
  let currentType = 'received';
  let editingId = null;
  const STORAGE_KEY = 'paisa-hisaab-entries';

  const entriesEl = document.getElementById('entries');
  const emptyEl = document.getElementById('emptyState');
  const btnReceived = document.getElementById('btnReceived');
  const btnSpent = document.getElementById('btnSpent');
  const reasonField = document.getElementById('reasonField');
  const overlay = document.getElementById('overlay');
  const formTitle = document.getElementById('formTitle');
  const saveBtn = document.getElementById('saveBtn');
  const PIN_HASH_KEY = 'paisa-hisaab-pin-hash';
  async function hashPin(pin){
    const data = new TextEncoder().encode(pin + 'paisa-hisaab-salt');
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
  }
  function getStoredPinHash(){ return localStorage.getItem(PIN_HASH_KEY); }
  function setStoredPinHash(hash){ localStorage.setItem(PIN_HASH_KEY, hash); }
  let currentFilter = 'all';

  const dateFilterChip = document.getElementById('dateFilterChip');
  const inlineDateBar = document.getElementById('inlineDateBar');
  const calDateInput = document.getElementById('calDate');
  const calSummary = document.getElementById('calSummary');
  const dateClear = document.getElementById('dateClear');

  let currentReasonTags = [];
  const reasonTagsBox = document.getElementById('reasonTagsBox');
  const reasonTagsList = document.getElementById('reasonTagsList');
  const reasonTagInput = document.getElementById('reasonTagInput');

  function renderReasonTags(){
    if(!reasonTagsList) return;
    reasonTagsList.innerHTML = '';
    currentReasonTags.forEach((tag, idx) => {
      const chip = document.createElement('span');
      chip.className = 'reason-tag-chip';
      chip.innerHTML = `
        <span class="rtc-text">${escapeHtml(tag)}</span>
        <button type="button" class="rtc-remove" data-idx="${idx}" title="Remove tag">✕</button>
      `;
      reasonTagsList.appendChild(chip);
    });

    reasonTagsList.querySelectorAll('.rtc-remove').forEach(btn => {
      // Prevent focus from leaving reasonTagInput when tapping or clicking the remove button
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
      });
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
      });

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const idx = Number(btn.dataset.idx);
        currentReasonTags.splice(idx, 1);
        renderReasonTags();
        if(reasonTagInput){
          reasonTagInput.focus({ preventScroll: true });
        }
      });
    });
  }

  function addReasonTag(rawText){
    if(!rawText) return;
    const parts = rawText.split(',').map(s => s.trim()).filter(Boolean);
    parts.forEach(part => {
      if(part && !currentReasonTags.includes(part)){
        currentReasonTags.push(part);
      }
    });
    renderReasonTags();
  }

  if(reasonTagsBox && reasonTagInput){
    reasonTagsBox.addEventListener('click', () => {
      reasonTagInput.focus();
    });

    reasonTagInput.addEventListener('keydown', (e) => {
      if(e.key === ',' || e.key === 'Enter'){
        e.preventDefault();
        const val = reasonTagInput.value.trim();
        if(val){
          addReasonTag(val);
          reasonTagInput.value = '';
        }
      } else if(e.key === 'Backspace' && reasonTagInput.value === '' && currentReasonTags.length > 0){
        currentReasonTags.pop();
        renderReasonTags();
      }
    });

    reasonTagInput.addEventListener('input', () => {
      if(reasonTagInput.value.includes(',')){
        const val = reasonTagInput.value;
        const parts = val.split(',');
        const lastPart = parts.pop();
        parts.forEach(p => addReasonTag(p));
        reasonTagInput.value = lastPart.trimStart();
      }
    });

    reasonTagInput.addEventListener('blur', () => {
      const val = reasonTagInput.value.trim();
      if(val){
        addReasonTag(val);
        reasonTagInput.value = '';
      }
    });
  }

  function resetToAddMode(){
    editingId = null;
    formTitle.textContent = 'Add entry';
    saveBtn.textContent = 'Save entry';
    document.getElementById('entryForm').reset();
    currentReasonTags = [];
    renderReasonTags();
    if(reasonTagInput) reasonTagInput.value = '';
    setType('received');
  }

  document.getElementById('openSheet').addEventListener('click', () => {
    resetToAddMode();
    overlay.classList.add('show');
    ensureNavHistory();
  });
  overlay.addEventListener('click', (e) => {
    if(e.target === overlay){
      overlay.classList.remove('show');
      resetToAddMode();
    }
  });

  document.querySelectorAll('.filter-chip[data-filter]').forEach(chip => {
    chip.addEventListener('click', () => {
      currentFilter = chip.dataset.filter;
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      inlineDateBar.classList.remove('show');
      calSummary.classList.remove('show');
      render();
    });
  });

  /* ── In-App Custom Calendar Engine ── */
  const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  let calendarCallback = null;
  let currentCalYear = new Date().getFullYear();
  let currentCalMonth = new Date().getMonth();
  let currentSelectedCalDate = null;

  function formatDatePillText(isoDateStr){
    if(!isoDateStr) return 'Select Date';
    const todayStr = toLocalDateStr(new Date().toISOString());
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    const yestStr = toLocalDateStr(yest.toISOString());

    const parts = isoDateStr.split('-');
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const dateText = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    if(isoDateStr === todayStr) return `Today · ${dateText}`;
    if(isoDateStr === yestStr) return `Yesterday · ${dateText}`;
    const weekday = d.toLocaleDateString('en-IN', { weekday: 'short' });
    return `${weekday}, ${dateText}`;
  }

  function renderCustomCalendarGrid(){
    const labelEl = document.getElementById('calMonthYearLabel');
    const gridEl = document.getElementById('calDaysGrid');
    if(!labelEl || !gridEl) return;

    labelEl.textContent = `${MONTH_NAMES[currentCalMonth]} ${currentCalYear}`;
    gridEl.innerHTML = '';

    const firstDayIndex = new Date(currentCalYear, currentCalMonth, 1).getDay();
    const daysInMonth = new Date(currentCalYear, currentCalMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentCalYear, currentCalMonth, 0).getDate();

    const todayStr = toLocalDateStr(new Date().toISOString());

    // Gather transaction dots per date
    const txnDotsMap = new Map();
    entries.forEach(e => {
      const dStr = toLocalDateStr(e.when);
      if(!txnDotsMap.has(dStr)){
        txnDotsMap.set(dStr, e.type === 'received' ? 'income' : 'expense');
      } else {
        const prev = txnDotsMap.get(dStr);
        if((prev === 'income' && e.type === 'spent') || (prev === 'expense' && e.type === 'received')){
          txnDotsMap.set(dStr, 'both');
        }
      }
    });

    // 1. Previous month trailing days
    for(let i = firstDayIndex - 1; i >= 0; i--){
      const dayNum = daysInPrevMonth - i;
      const prevMonth = currentCalMonth === 0 ? 11 : currentCalMonth - 1;
      const prevYear = currentCalMonth === 0 ? currentCalYear - 1 : currentCalYear;
      const mm = String(prevMonth + 1).padStart(2, '0');
      const dd = String(dayNum).padStart(2, '0');
      const dateStr = `${prevYear}-${mm}-${dd}`;

      const cell = document.createElement('div');
      cell.className = 'cal-day-cell other-month';
      cell.textContent = dayNum;
      cell.addEventListener('click', () => {
        currentCalMonth = prevMonth;
        currentCalYear = prevYear;
        selectCalendarDate(dateStr);
      });
      gridEl.appendChild(cell);
    }

    // 2. Current month days
    for(let d = 1; d <= daysInMonth; d++){
      const mm = String(currentCalMonth + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      const dateStr = `${currentCalYear}-${mm}-${dd}`;

      const cell = document.createElement('div');
      let classes = 'cal-day-cell';
      if(dateStr === todayStr) classes += ' is-today';
      if(dateStr === currentSelectedCalDate) classes += ' is-selected';
      cell.className = classes;

      let dotsHtml = '';
      if(txnDotsMap.has(dateStr)){
        const dotKind = txnDotsMap.get(dateStr);
        dotsHtml = `<div class="cal-day-dots"><span class="cal-dot ${dotKind}"></span></div>`;
      }

      cell.innerHTML = `<span>${d}</span>${dotsHtml}`;
      cell.addEventListener('click', () => {
        selectCalendarDate(dateStr);
      });
      gridEl.appendChild(cell);
    }

    // 3. Next month leading days to complete grid
    const totalCells = firstDayIndex + daysInMonth;
    const remaining = (7 - (totalCells % 7)) % 7;
    for(let d = 1; d <= remaining; d++){
      const nextMonth = currentCalMonth === 11 ? 0 : currentCalMonth + 1;
      const nextYear = currentCalMonth === 11 ? currentCalYear + 1 : currentCalYear;
      const mm = String(nextMonth + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      const dateStr = `${nextYear}-${mm}-${dd}`;

      const cell = document.createElement('div');
      cell.className = 'cal-day-cell other-month';
      cell.textContent = d;
      cell.addEventListener('click', () => {
        currentCalMonth = nextMonth;
        currentCalYear = nextYear;
        selectCalendarDate(dateStr);
      });
      gridEl.appendChild(cell);
    }
  }

  function openCustomCalendar({ selectedDate, onSelect, title = 'Select Date' }){
    currentSelectedCalDate = selectedDate ? selectedDate.slice(0, 10) : null;
    const d = currentSelectedCalDate ? new Date(currentSelectedCalDate) : new Date();
    currentCalYear = isNaN(d.getFullYear()) ? new Date().getFullYear() : d.getFullYear();
    currentCalMonth = isNaN(d.getMonth()) ? new Date().getMonth() : d.getMonth();
    calendarCallback = onSelect;

    const titleEl = document.getElementById('calModalTitle');
    if(titleEl) titleEl.textContent = title;
    renderCustomCalendarGrid();
    document.getElementById('customCalendarOverlay').classList.add('show');
    ensureNavHistory();
  }

  function selectCalendarDate(isoDateStr){
    if(calendarCallback){
      calendarCallback(isoDateStr);
    }
    document.getElementById('customCalendarOverlay').classList.remove('show');
  }

  document.getElementById('calPrevMonthBtn').addEventListener('click', () => {
    currentCalMonth--;
    if(currentCalMonth < 0){
      currentCalMonth = 11;
      currentCalYear--;
    }
    renderCustomCalendarGrid();
  });

  document.getElementById('calNextMonthBtn').addEventListener('click', () => {
    currentCalMonth++;
    if(currentCalMonth > 11){
      currentCalMonth = 0;
      currentCalYear++;
    }
    renderCustomCalendarGrid();
  });

  document.getElementById('calShortcutToday').addEventListener('click', () => {
    selectCalendarDate(toLocalDateStr(new Date().toISOString()));
  });

  document.getElementById('calShortcutYesterday').addEventListener('click', () => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    selectCalendarDate(toLocalDateStr(y.toISOString()));
  });

  document.getElementById('closeCalModalBtn').addEventListener('click', () => {
    document.getElementById('customCalendarOverlay').classList.remove('show');
  });
  document.getElementById('customCalendarOverlay').addEventListener('click', (e) => {
    if(e.target === document.getElementById('customCalendarOverlay')){
      document.getElementById('customCalendarOverlay').classList.remove('show');
    }
  });

  function updateHomeDatePillLabel(){
    const labelEl = document.getElementById('customDatePillLabel');
    if(labelEl) labelEl.textContent = formatDatePillText(calDateInput.value);
  }

  function toLocalDateStr(iso){
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  dateFilterChip.addEventListener('click', () => {
    openCustomCalendar({
      selectedDate: calDateInput.value || toLocalDateStr(new Date().toISOString()),
      title: 'Filter by Date',
      onSelect: (chosenDate) => {
        calDateInput.value = chosenDate;
        updateHomeDatePillLabel();
        currentFilter = 'date';
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        dateFilterChip.classList.add('active');
        inlineDateBar.classList.add('show');
        calSummary.classList.add('show');
        render();
      }
    });
  });

  const customDatePillBtn = document.getElementById('customDatePillBtn');
  if(customDatePillBtn){
    customDatePillBtn.addEventListener('click', () => {
      openCustomCalendar({
        selectedDate: calDateInput.value || toLocalDateStr(new Date().toISOString()),
        title: 'Filter by Date',
        onSelect: (chosenDate) => {
          calDateInput.value = chosenDate;
          updateHomeDatePillLabel();
          render();
        }
      });
    });
  }

  calDateInput.addEventListener('change', () => {
    updateHomeDatePillLabel();
    render();
  });

  dateClear.addEventListener('click', () => {
    currentFilter = 'all';
    calDateInput.value = '';
    updateHomeDatePillLabel();
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    document.querySelector('.filter-chip[data-filter="all"]').classList.add('active');
    inlineDateBar.classList.remove('show');
    calSummary.classList.remove('show');
    render();
  });

  btnReceived.addEventListener('click', () => setType('received'));
  btnSpent.addEventListener('click', () => setType('spent'));

  function setType(type){
    currentType = type;
    btnReceived.classList.toggle('active', type === 'received');
    btnSpent.classList.toggle('active', type === 'spent');
    const reasonLabel = document.getElementById('reasonLabel');
    if(type === 'received'){
      if(reasonLabel) reasonLabel.textContent = 'Reason (what was it received for)';
      if(reasonTagInput) reasonTagInput.placeholder = 'Add items (e.g. Salary, Gift, Bonus)...';
    } else {
      if(reasonLabel) reasonLabel.textContent = 'Reason (what was it spent on)';
      if(reasonTagInput) reasonTagInput.placeholder = 'Add items (e.g. Chai, Samosa, Taxi)...';
    }
  }

  function formatRupee(n){
    return '₹' + Number(n).toLocaleString('en-IN', {maximumFractionDigits: 2});
  }

  function formatWhen(iso){
    const d = new Date(iso);
    const datePart = d.toLocaleDateString('en-IN', {day:'2-digit', month:'short'});
    const timePart = d.toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit'});
    return datePart + ' · ' + timePart;
  }

  const avatarColors = ['#5B3DF5','#12A454','#E3483F','#F5A623','#0EA5B7','#C0399C','#3E6BFF'];
  function colorFor(name){
    let hash = 0;
    for(let i=0;i<name.length;i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return avatarColors[Math.abs(hash) % avatarColors.length];
  }
  function initials(name){
    return name.trim().split(/\s+/).slice(0,2).map(w => w[0].toUpperCase()).join('');
  }

  function escapeHtml(str){
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function getDateGroupLabel(isoDateStr){
    const todayStr = toLocalDateStr(new Date().toISOString());
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    const yestStr = toLocalDateStr(yest.toISOString());

    const parts = isoDateStr.split('-');
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const dateText = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    if(isoDateStr === todayStr) return `Today · ${dateText}`;
    if(isoDateStr === yestStr) return `Yesterday · ${dateText}`;
    const weekday = d.toLocaleDateString('en-IN', { weekday: 'short' });
    return `${weekday}, ${dateText}`;
  }

  function render(){
    entriesEl.innerHTML = '';

    let filtered;
    if(currentFilter === 'date'){
      filtered = calDateInput.value ? entries.filter(e => toLocalDateStr(e.when) === calDateInput.value) : [];
    } else if(currentFilter === 'all'){
      filtered = entries;
    } else {
      filtered = entries.filter(e => e.type === currentFilter);
    }
    emptyEl.style.display = filtered.length ? 'none' : 'block';

    let received = 0, spent = 0;
    entries.forEach(e => { if(e.type === 'received') received += Number(e.amount); else spent += Number(e.amount); });

    document.getElementById('totalReceived').textContent = formatRupee(received);
    document.getElementById('totalSpent').textContent = formatRupee(spent);
    document.getElementById('totalBalance').textContent = formatRupee(received - spent);

    if(currentFilter === 'date'){
      let dR = 0, dS = 0;
      filtered.forEach(e => { if(e.type === 'received') dR += Number(e.amount); else dS += Number(e.amount); });
      document.getElementById('calReceived').textContent = formatRupee(dR);
      document.getElementById('calSpent').textContent = formatRupee(dS);
      document.getElementById('calNet').textContent = formatRupee(dR - dS);
    }

    const sorted = [...filtered].sort((a,b) => new Date(b.when) - new Date(a.when));
    let lastDate = null;

    sorted.forEach((e) => {
      const entryDate = toLocalDateStr(e.when);
      if(entryDate !== lastDate){
        lastDate = entryDate;
        const divider = document.createElement('div');
        divider.className = 'txn-date-divider';
        divider.innerHTML = `<span>${getDateGroupLabel(entryDate)}</span>`;
        entriesEl.appendChild(divider);
      }

      const row = document.createElement('div');
      row.className = 'entry';
      row.dataset.id = e.id;
      row.innerHTML = `
        <div class="avatar" style="background:${colorFor(e.name)}">${initials(e.name)}</div>
        <div class="mid">
          <div class="name">${escapeHtml(e.name)}</div>
          <div class="meta">${e.reason ? escapeHtml(e.reason) : (e.type === 'received' ? 'Received' : 'Spent')}</div>
        </div>
        <div class="right">
          <div class="amt ${e.type}">${e.type === 'received' ? '+' : '−'} ${formatRupee(e.amount)}</div>
          <div class="when">${formatWhen(e.when)}</div>
        </div>
      `;
      entriesEl.appendChild(row);
    });

    document.querySelectorAll('.entries .entry').forEach(row => {
      const id = row.dataset.id;
      attachLongPress(
        row,
        () => openDetail(id),
        () => openDateTimeEditor(id)
      );
    });

    const clearFab = document.getElementById('clearAllFab');
    if(clearFab){
      clearFab.style.display = (entries.length > 0 && activeTab === 'settings') ? 'flex' : 'none';
    }

    if(typeof renderTxnList === 'function' && document.getElementById('txnListOverlay') && document.getElementById('txnListOverlay').classList.contains('show')){
      renderTxnList();
    }
  }

  function loadEntries(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      const list = raw ? JSON.parse(raw) : [];
      entries = Array.isArray(list) ? list.map(normalizeImportedEntry) : [];
    }catch(err){
      entries = [];
    }
    render();
  }

  function saveEntries(skipSync = false){
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    }catch(err){
      console.error('Could not save entries', err);
    }
    if(!skipSync){
      markLocalModified();
    }
  }

  document.getElementById('entryForm').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const name = document.getElementById('name').value.trim();
    const amount = document.getElementById('amount').value;
    
    // Commit any trailing text in reason tag input
    if(reasonTagInput && reasonTagInput.value.trim()){
      addReasonTag(reasonTagInput.value.trim());
      reasonTagInput.value = '';
    }
    const reason = currentReasonTags.join(', ').trim();
    if(!name || !amount) return;

    if(editingId){
      // EDIT MODE — password was already confirmed to enter edit mode, so just save.
      const idx = entries.findIndex(e => e.id === editingId);
      if(idx !== -1){
        entries[idx] = {
          ...entries[idx],
          name,
          amount: Number(amount),
          type: currentType,
          reason: reason,
          updatedAt: new Date().toISOString()
        };
      }
      render();
      saveEntries();
      overlay.classList.remove('show');
      resetToAddMode();
      return;
    }

    const newEntry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2,7),
      name,
      amount: Number(amount),
      type: currentType,
      reason: reason,
      when: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    requestPassword({
      title: 'Enter security password',
      sub: currentType === 'spent' ? 'Confirm this expense to save it' : 'Confirm to save this entry',
      onSuccess: () => {
        entries.push(newEntry);
        overlay.classList.remove('show');
        resetToAddMode();
        render();
        saveEntries();
      },
      onCancel: () => {
        // Overlay was kept open underneath, so inputs stay preserved!
      }
    });
  });

  const DELETED_KEY = 'paisa-hisaab-deleted';

  function loadDeletedIds(){
    try{
      const raw = localStorage.getItem(DELETED_KEY);
      return raw ? JSON.parse(raw) : [];
    }catch(err){ return []; }
  }

  function saveDeletedIds(ids){
    try{ localStorage.setItem(DELETED_KEY, JSON.stringify(ids)); }
    catch(err){ console.error('Could not save deleted-ids', err); }
  }

  function markDeleted(ids){
    const deleted = loadDeletedIds();
    ids.forEach(id => { if(!deleted.includes(id)) deleted.push(id); });
    saveDeletedIds(deleted);
  }

  function deleteEntry(id){
    entries = entries.filter(e => e.id !== id);
    markDeleted([id]);
    render();
    saveEntries();
  }

  async function promptDeleteEntry(id){
    const e = entries.find(en => en.id === id);
    if(!e) return;

    const confirmed = await showCustomConfirm({
      icon: '🗑️',
      title: 'Delete transaction?',
      msg: `Are you sure you want to delete this ${e.type === 'received' ? 'income' : 'expense'} entry for ${escapeHtml(e.name)} (${formatRupee(e.amount)})?`,
      okText: 'Yes, Delete',
      cancelText: 'Cancel',
      isDanger: true
    });

    if(confirmed){
      requestPassword({
        title: 'Enter security password',
        sub: 'Confirm to delete this transaction',
        onSuccess: () => {
          deleteEntry(id);
        }
      });
    }
  }

  const clearAllFabEl = document.getElementById('clearAllFab');
  if(clearAllFabEl){
    clearAllFabEl.addEventListener('click', async () => {
      if(!entries.length) return;
      const count = entries.length;

      const confirmed = await showCustomConfirm({
        icon: '🗑️',
        title: 'Clear all transactions?',
        msg: `Are you sure you want to permanently delete all ${count} ${count === 1 ? 'entry' : 'entries'}? This will also sync and clear on all connected devices.`,
        okText: 'Yes, Clear All',
        cancelText: 'Cancel',
        isDanger: true
      });

      if(confirmed){
        requestPassword({
          title: 'Enter security password',
          sub: 'Confirm to clear all transactions',
          onSuccess: () => {
            markDeleted(entries.map(e => e.id));
            entries = [];
            render();
            saveEntries();
            if(typeof renderTxnList === 'function' && document.getElementById('txnListOverlay') && document.getElementById('txnListOverlay').classList.contains('show')){
              renderTxnList();
            }
          }
        });
      }
    });
  }

  /* PIN pad engine */
  const pinOverlay = document.getElementById('pinOverlay');
  const pinTitle = document.getElementById('pinTitle');
  const pinSub = document.getElementById('pinSub');
  const pinDotsWrap = document.getElementById('pinDots');
  const pinDots = pinDotsWrap.querySelectorAll('.pd');
  const pinError = document.getElementById('pinError');
  let pinValue = '';
  let pinCallbacks = null;
  let pinMode = 'verify';
  let pendingNewPin = '';

  function requestPassword({title, sub, onSuccess, onCancel}){
    if(!getStoredPinHash()){
      if(onSuccess) onSuccess();
      return;
    }
    pinCallbacks = {onSuccess, onCancel};
    pinMode = 'verify';
    pinTitle.textContent = title || 'Enter security password';
    pinSub.textContent = sub || 'Confirm to continue';
    pinValue = '';
    pinError.textContent = '';
    pendingNewPin = '';
    updatePinDots();
    pinOverlay.classList.add('show');
    ensureNavHistory();
  }

  function startSetPin(){
    pinCallbacks = {
      onSuccess: () => {
        updateSecuritySettingsUI();
      },
      onCancel: () => {}
    };
    pinMode = 'set';
    pinTitle.textContent = 'Set your password';
    pinSub.textContent = 'Choose a 4-digit password';
    pinValue = '';
    pinError.textContent = '';
    pendingNewPin = '';
    updatePinDots();
    pinOverlay.classList.add('show');
    ensureNavHistory();
  }

  function startChangePin(){
    pinCallbacks = {
      onSuccess: () => {
        updateSecuritySettingsUI();
      },
      onCancel: () => {}
    };
    pinMode = 'change-verify';
    pinTitle.textContent = 'Enter current password';
    pinSub.textContent = 'Verify your identity first';
    pinValue = '';
    pinError.textContent = '';
    pendingNewPin = '';
    updatePinDots();
    pinOverlay.classList.add('show');
    ensureNavHistory();
  }

  function startRemovePin(){
    pinCallbacks = {
      onSuccess: () => {
        updateSecuritySettingsUI();
      },
      onCancel: () => {}
    };
    pinMode = 'remove-verify';
    pinTitle.textContent = 'Enter current password';
    pinSub.textContent = 'Confirm to remove PIN protection';
    pinValue = '';
    pinError.textContent = '';
    pendingNewPin = '';
    updatePinDots();
    pinOverlay.classList.add('show');
    ensureNavHistory();
  }

  function updateSecuritySettingsUI(){
    const setBtn = document.getElementById('setPinBtn');
    const activeGroup = document.getElementById('pinActiveGroup');
    const hasPin = Boolean(getStoredPinHash());

    if(setBtn) setBtn.style.display = hasPin ? 'none' : 'flex';
    if(activeGroup) activeGroup.style.display = hasPin ? 'block' : 'none';
  }

  function updatePinDots(){
    pinDots.forEach((d, i) => d.classList.toggle('filled', i < pinValue.length));
  }

  async function checkPin(){
    if(pinMode === 'set'){
      pendingNewPin = pinValue;
      pinMode = 'set-confirm';
      pinTitle.textContent = 'Confirm your password';
      pinSub.textContent = 'Re-enter the same 4-digit password';
      pinValue = '';
      pinError.textContent = '';
      updatePinDots();
      return;
    }
    if(pinMode === 'set-confirm'){
      if(pinValue === pendingNewPin){
        var hash = await hashPin(pinValue);
        setStoredPinHash(hash);
        pinOverlay.classList.remove('show');
        pinValue = '';
        pendingNewPin = '';
        updatePinDots();
        updateSecuritySettingsUI();
        var cb = pinCallbacks;
        pinCallbacks = null;
        if(cb && cb.onSuccess) cb.onSuccess();
      } else {
        pinError.textContent = "Passwords don't match. Start over.";
        pinDotsWrap.classList.add('shake');
        setTimeout(function(){
          pinDotsWrap.classList.remove('shake');
          pinMode = 'set';
          pinTitle.textContent = 'Set your password';
          pinSub.textContent = 'Choose a 4-digit password';
          pinValue = '';
          pinError.textContent = '';
          pendingNewPin = '';
          updatePinDots();
        }, 400);
      }
      return;
    }
    if(pinMode === 'verify'){
      var hash = await hashPin(pinValue);
      if(hash === getStoredPinHash()){
        pinOverlay.classList.remove('show');
        var cb = pinCallbacks;
        pinCallbacks = null;
        pinValue = '';
        updatePinDots();
        if(cb && cb.onSuccess) cb.onSuccess();
      } else {
        pinError.textContent = 'Invalid password. Try again.';
        pinDotsWrap.classList.add('shake');
        setTimeout(function(){
          pinDotsWrap.classList.remove('shake');
          pinValue = '';
          updatePinDots();
        }, 350);
      }
      return;
    }
    if(pinMode === 'remove-verify'){
      var hash = await hashPin(pinValue);
      if(hash === getStoredPinHash()){
        localStorage.removeItem(PIN_HASH_KEY);
        pinOverlay.classList.remove('show');
        pinValue = '';
        pendingNewPin = '';
        updatePinDots();
        updateSecuritySettingsUI();
        var cb = pinCallbacks;
        pinCallbacks = null;
        if(cb && cb.onSuccess) cb.onSuccess();
      } else {
        pinError.textContent = 'Invalid password. Try again.';
        pinDotsWrap.classList.add('shake');
        setTimeout(function(){
          pinDotsWrap.classList.remove('shake');
          pinValue = '';
          updatePinDots();
        }, 350);
      }
      return;
    }
    if(pinMode === 'change-verify'){
      var hash = await hashPin(pinValue);
      if(hash === getStoredPinHash()){
        pinMode = 'change-new';
        pinTitle.textContent = 'Enter new password';
        pinSub.textContent = 'Choose a new 4-digit password';
        pinValue = '';
        pinError.textContent = '';
        updatePinDots();
      } else {
        pinError.textContent = 'Invalid password. Try again.';
        pinDotsWrap.classList.add('shake');
        setTimeout(function(){
          pinDotsWrap.classList.remove('shake');
          pinValue = '';
          updatePinDots();
        }, 350);
      }
      return;
    }
    if(pinMode === 'change-new'){
      pendingNewPin = pinValue;
      pinMode = 'change-confirm';
      pinTitle.textContent = 'Confirm new password';
      pinSub.textContent = 'Re-enter the new password';
      pinValue = '';
      pinError.textContent = '';
      updatePinDots();
      return;
    }
    if(pinMode === 'change-confirm'){
      if(pinValue === pendingNewPin){
        var hash = await hashPin(pinValue);
        setStoredPinHash(hash);
        pinOverlay.classList.remove('show');
        pinValue = '';
        pendingNewPin = '';
        updatePinDots();
        updateSecuritySettingsUI();
        var cb = pinCallbacks;
        pinCallbacks = null;
        if(cb && cb.onSuccess) cb.onSuccess();
      } else {
        pinError.textContent = "Passwords don't match. Try again.";
        pinDotsWrap.classList.add('shake');
        setTimeout(function(){
          pinDotsWrap.classList.remove('shake');
          pinMode = 'change-new';
          pinTitle.textContent = 'Enter new password';
          pinSub.textContent = 'Choose a new 4-digit password';
          pinValue = '';
          pinError.textContent = '';
          pendingNewPin = '';
          updatePinDots();
        }, 400);
      }
      return;
    }
  }

  document.getElementById('pinKeypad').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if(!btn) return;
    if(btn.id === 'pinBackspace'){
      pinValue = pinValue.slice(0, -1);
      updatePinDots();
      return;
    }
    if(btn.dataset.k === undefined) return;
    if(pinValue.length >= 4) return;
    pinValue += btn.dataset.k;
    updatePinDots();
    if(pinValue.length === 4){
      setTimeout(checkPin, 120);
    }
  });

  document.getElementById('pinCancel').addEventListener('click', () => {
    pinOverlay.classList.remove('show');
    pinValue = '';
    pendingNewPin = '';
    updatePinDots();
    const cb = pinCallbacks;
    pinCallbacks = null;
    if(cb && cb.onCancel) cb.onCancel();
  });

  const setPinBtnEl = document.getElementById('setPinBtn');
  if(setPinBtnEl) setPinBtnEl.addEventListener('click', startSetPin);

  const changePinBtnEl = document.getElementById('changePinBtn');
  if(changePinBtnEl) changePinBtnEl.addEventListener('click', startChangePin);

  const removePinBtnEl = document.getElementById('removePinBtn');
  if(removePinBtnEl) removePinBtnEl.addEventListener('click', startRemovePin);

  /* Entry detail sheet */
  const detailOverlay = document.getElementById('detailOverlay');
  let currentDetailId = null;

  function openDetail(id){
    const e = entries.find(en => en.id === id);
    if(!e) return;
    currentDetailId = id;

    document.getElementById('detailAvatar').style.background = colorFor(e.name);
    document.getElementById('detailAvatar').textContent = initials(e.name);
    document.getElementById('detailName').textContent = e.name;

    const badge = document.getElementById('detailBadge');
    badge.textContent = e.type === 'received' ? 'Money Received' : 'Money Spent';
    badge.className = 'detail-badge ' + e.type;

    const amt = document.getElementById('detailAmt');
    amt.textContent = (e.type === 'received' ? '+ ' : '− ') + formatRupee(e.amount);
    amt.className = 'amt ' + e.type;

    const detailReasonEl = document.getElementById('detailReason');
    if(e.reason && e.reason.trim()){
      const parts = e.reason.split(',').map(s => s.trim()).filter(Boolean);
      if(parts.length > 1){
        detailReasonEl.innerHTML = `<div class="detail-tags-wrap">${parts.map(t => `<span class="detail-tag-chip">${escapeHtml(t)}</span>`).join('')}</div>`;
      } else {
        detailReasonEl.textContent = e.reason;
      }
    } else {
      detailReasonEl.textContent = '—';
    }

    const d = new Date(e.when);
    document.getElementById('detailDate').textContent = d.toLocaleDateString('en-IN', {weekday:'short', day:'2-digit', month:'short', year:'numeric'});
    document.getElementById('detailTime').textContent = d.toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit', second:'2-digit'});

    detailOverlay.classList.add('show');
    ensureNavHistory();
  }

  detailOverlay.addEventListener('click', (e) => {
    if(e.target === detailOverlay){
      detailOverlay.classList.remove('show');
    }
  });

  document.getElementById('detailDelete').addEventListener('click', async () => {
    if(!currentDetailId) return;
    const e = entries.find(en => en.id === currentDetailId);
    if(!e) return;

    const confirmed = await showCustomConfirm({
      icon: '🗑️',
      title: 'Delete transaction?',
      msg: `Are you sure you want to delete this ${e.type === 'received' ? 'income' : 'expense'} entry for ${escapeHtml(e.name)} (${formatRupee(e.amount)})?`,
      okText: 'Yes, Delete',
      cancelText: 'Cancel',
      isDanger: true
    });

    if(confirmed){
      requestPassword({
        title: 'Enter security password',
        sub: 'Confirm to delete this transaction',
        onSuccess: () => {
          deleteEntry(currentDetailId);
          detailOverlay.classList.remove('show');
        }
      });
    }
  });

  document.getElementById('detailEdit').addEventListener('click', () => {
    const e = entries.find(en => en.id === currentDetailId);
    if(!e) return;
    requestPassword({
      title: 'Enter security password',
      sub: 'Confirm to edit this transaction',
      onSuccess: () => {
        detailOverlay.classList.remove('show');
        openEditForm(e);
      }
    });
  });

  /* ── Change Date & Time Feature (Long-press or Detail Sheet) ── */
  const dateTimeOverlay = document.getElementById('dateTimeOverlay');
  let currentDateTimeId = null;

  function openDateTimeEditor(id){
    const e = entries.find(en => en.id === id);
    if(!e) return;
    currentDateTimeId = id;

    const dtAvatar = document.getElementById('dtAvatar');
    const dtName = document.getElementById('dtName');
    const dtReason = document.getElementById('dtReason');
    const dtAmt = document.getElementById('dtAmt');
    const dtDateInput = document.getElementById('dtDateInput');
    const dtTimeInput = document.getElementById('dtTimeInput');

    if(dtAvatar){
      dtAvatar.style.background = colorFor(e.name);
      dtAvatar.textContent = initials(e.name);
    }
    if(dtName) dtName.textContent = e.name;
    if(dtReason) dtReason.textContent = e.reason ? e.reason : (e.type === 'received' ? 'Money Received' : 'Money Spent');
    if(dtAmt){
      dtAmt.textContent = (e.type === 'received' ? '+ ' : '− ') + formatRupee(e.amount);
      dtAmt.className = 'dt-preview-amt ' + e.type;
    }

    const d = new Date(e.when);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');

    if(dtDateInput) dtDateInput.value = `${yyyy}-${mm}-${dd}`;
    if(dtTimeInput) dtTimeInput.value = `${hh}:${min}`;
    updateDtDatePillLabel();

    dateTimeOverlay.classList.add('show');
    ensureNavHistory();
  }

  function updateDtDatePillLabel(){
    const label = document.getElementById('dtDatePillLabel');
    const input = document.getElementById('dtDateInput');
    if(label && input) label.textContent = formatDatePillText(input.value);
  }

  const dtDatePillBtn = document.getElementById('dtDatePillBtn');
  if(dtDatePillBtn){
    dtDatePillBtn.addEventListener('click', () => {
      openCustomCalendar({
        selectedDate: document.getElementById('dtDateInput').value || toLocalDateStr(new Date().toISOString()),
        title: 'Select Transaction Date',
        onSelect: (chosenDate) => {
          document.getElementById('dtDateInput').value = chosenDate;
          updateDtDatePillLabel();
        }
      });
    });
  }

  document.getElementById('closeDateTimeSheet').addEventListener('click', () => {
    dateTimeOverlay.classList.remove('show');
  });

  dateTimeOverlay.addEventListener('click', (e) => {
    if(e.target === dateTimeOverlay){
      dateTimeOverlay.classList.remove('show');
    }
  });

  document.getElementById('dtPresetNow').addEventListener('click', () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('dtDateInput').value = `${yyyy}-${mm}-${dd}`;
    document.getElementById('dtTimeInput').value = `${hh}:${min}`;
    updateDtDatePillLabel();
  });

  document.getElementById('dtPreset1h').addEventListener('click', () => {
    const d = new Date(Date.now() - 3600000);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    document.getElementById('dtDateInput').value = `${yyyy}-${mm}-${dd}`;
    document.getElementById('dtTimeInput').value = `${hh}:${min}`;
    updateDtDatePillLabel();
  });

  document.getElementById('dtPresetYesterday').addEventListener('click', () => {
    const d = new Date(Date.now() - 86400000);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    document.getElementById('dtDateInput').value = `${yyyy}-${mm}-${dd}`;
    updateDtDatePillLabel();
  });

  document.getElementById('dateTimeForm').addEventListener('submit', (ev) => {
    ev.preventDefault();
    if(!currentDateTimeId) return;

    const dtDateInput = document.getElementById('dtDateInput');
    const dtTimeInput = document.getElementById('dtTimeInput');
    if(!dtDateInput.value || !dtTimeInput.value) return;

    const [y, m, d] = dtDateInput.value.split('-').map(Number);
    const [hh, mm] = dtTimeInput.value.split(':').map(Number);
    const newDateObj = new Date(y, m - 1, d, hh, mm, 0, 0);
    const newIso = newDateObj.toISOString();

    requestPassword({
      title: 'Enter security password',
      sub: 'Confirm to update transaction date & time',
      onSuccess: () => {
        const idx = entries.findIndex(en => en.id === currentDateTimeId);
        if(idx !== -1){
          entries[idx] = {
            ...entries[idx],
            when: newIso,
            updatedAt: new Date().toISOString()
          };

          entries.sort((a,b) => new Date(b.when) - new Date(a.when));
          render();
          saveEntries();
          if(typeof renderTxnList === 'function' && document.getElementById('txnListOverlay') && document.getElementById('txnListOverlay').classList.contains('show')){
            renderTxnList();
          }

          if(currentDetailId === currentDateTimeId){
            const dtDate = document.getElementById('detailDate');
            const dtTime = document.getElementById('detailTime');
            if(dtDate) dtDate.textContent = newDateObj.toLocaleDateString('en-IN', {weekday:'short', day:'2-digit', month:'short', year:'numeric'});
            if(dtTime) dtTime.textContent = newDateObj.toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit', second:'2-digit'});
          }
        }
        dateTimeOverlay.classList.remove('show');
      }
    });
  });

  // Long-press detection helper (supports touch & desktop hold)
  function attachLongPress(element, onClick, onLongPress, durationMs = 700){
    let timer = null;
    let startX = 0;
    let startY = 0;
    let isLongPress = false;
    let touchStarted = false;

    function start(e){
      isLongPress = false;
      touchStarted = true;
      const touch = e.touches ? e.touches[0] : e;
      startX = touch.clientX;
      startY = touch.clientY;
      element.classList.add('long-pressing');
      clearTimeout(timer);
      timer = setTimeout(() => {
        isLongPress = true;
        element.classList.remove('long-pressing');
        if(navigator.vibrate) try{ navigator.vibrate(50); }catch(v){}
        onLongPress();
      }, durationMs);
    }

    function cancel(){
      clearTimeout(timer);
      element.classList.remove('long-pressing');
    }

    function move(e){
      if(!timer) return;
      const touch = e.touches ? e.touches[0] : e;
      const diffX = Math.abs(touch.clientX - startX);
      const diffY = Math.abs(touch.clientY - startY);
      if(diffX > 10 || diffY > 10){
        cancel();
      }
    }

    element.addEventListener('touchstart', start, { passive: true });
    element.addEventListener('touchmove', move, { passive: true });
    element.addEventListener('touchend', (e) => {
      cancel();
      if(isLongPress){
        e.preventDefault();
        e.stopPropagation();
      }
    });
    element.addEventListener('touchcancel', cancel);

    element.addEventListener('mousedown', (e) => {
      if(e.button !== 0) return;
      start(e);
    });
    element.addEventListener('mousemove', move);
    element.addEventListener('mouseup', cancel);
    element.addEventListener('mouseleave', cancel);

    element.addEventListener('click', (e) => {
      if(isLongPress){
        e.preventDefault();
        e.stopPropagation();
        isLongPress = false;
        return;
      }
      onClick();
    });
  }

  function openEditForm(e){
    editingId = e.id;
    formTitle.textContent = 'Edit entry';
    saveBtn.textContent = 'Update entry';
    setType(e.type);
    document.getElementById('name').value = e.name;
    document.getElementById('amount').value = e.amount;
    currentReasonTags = (e.reason || '').split(',').map(s => s.trim()).filter(Boolean);
    renderReasonTags();
    if(reasonTagInput) reasonTagInput.value = '';
    overlay.classList.add('show');
  }

  /* Backup & Restore */
  function genId(){
    return Date.now().toString(36) + Math.random().toString(36).slice(2,7);
  }

  const settingsOverlay = document.getElementById('settingsOverlay');
  const backupStatus = document.getElementById('backupStatus');
  const cloudSyncStatus = document.getElementById('cloudSyncStatus');
  const importPreview = document.getElementById('importPreview');
  const ipSummary = document.getElementById('ipSummary');
  const importFileInput = document.getElementById('importFile');
  let pendingImportValid = [];

  function setBackupStatus(text, kind){
    backupStatus.textContent = text || '';
    backupStatus.className = 'backup-status' + (kind ? (' ' + kind) : '');
  }

  function setSyncStatus(text, kind){
    cloudSyncStatus.textContent = text || '';
    cloudSyncStatus.className = 'backup-status' + (kind ? (' ' + kind) : '');
  }

  function resetBackupSheet(){
    setBackupStatus('');
    setSyncStatus('');
    importPreview.classList.remove('show');
    importFileInput.value = '';
    pendingImportValid = [];
    const cfg = loadSyncConfig();
    if(document.getElementById('gistId')) document.getElementById('gistId').value = cfg.gistId || '';
    if(document.getElementById('gistToken')) document.getElementById('gistToken').value = cfg.token || '';
    if(document.getElementById('deviceName')) document.getElementById('deviceName').value = cfg.deviceName || '';
    if(document.getElementById('autoCheckCloudOnOpen')) document.getElementById('autoCheckCloudOnOpen').checked = cfg.autoCheckOnOpen !== false;
    if(document.getElementById('autoPushOnSave')) document.getElementById('autoPushOnSave').checked = cfg.autoPushOnSave !== false;
    updateSyncLastText();
  }

  document.getElementById('exportBtn').addEventListener('click', () => {
    const dataStr = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(entries, null, 2));
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `paisa-hisaab-backup-${y}-${m}-${d}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setBackupStatus(`Exported ${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}.`, 'ok');
  });

  document.getElementById('chooseFileBtn').addEventListener('click', () => {
    importFileInput.click();
  });

  function validateImportData(data){
    if(!Array.isArray(data)) return { valid: [], invalidCount: 0, isArray: false };
    const valid = data.filter(e =>
      e && typeof e.name === 'string' && e.name.trim() !== '' &&
      (e.type === 'received' || e.type === 'spent') &&
      e.amount !== undefined && e.amount !== null && !isNaN(Number(e.amount)) &&
      e.when && !isNaN(Date.parse(e.when))
    );
    return { valid, invalidCount: data.length - valid.length, isArray: true };
  }

  function handleImportedData(data){
    const { valid, invalidCount, isArray } = validateImportData(data);
    if(!isArray){
      setBackupStatus("This doesn't look like a valid backup file.", 'err');
      importPreview.classList.remove('show');
      pendingImportValid = [];
      return;
    }
    if(!valid.length){
      setBackupStatus('No valid entries found in this file.', 'err');
      importPreview.classList.remove('show');
      pendingImportValid = [];
      return;
    }
    pendingImportValid = valid;
    setBackupStatus('');
    ipSummary.textContent = `Found ${valid.length} valid ${valid.length === 1 ? 'entry' : 'entries'} in this file` +
      (invalidCount ? ` (${invalidCount} skipped — missing or invalid fields)` : '') + '.';
    importPreview.classList.add('show');
  }

  importFileInput.addEventListener('change', (ev) => {
    const file = ev.target.files[0];
    setBackupStatus('');
    importPreview.classList.remove('show');
    pendingImportValid = [];
    if(!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      let data;
      try{
        data = JSON.parse(reader.result);
      }catch(err){
        setBackupStatus("This doesn't look like a valid backup file.", 'err');
        return;
      }
      handleImportedData(data);
    };
    reader.onerror = () => setBackupStatus('Could not read that file.', 'err');
    reader.readAsText(file);
  });

  function normalizeImportedEntry(e){
    return {
      id: (e.id && typeof e.id === 'string') ? e.id : genId(),
      name: String(e.name || '').trim(),
      amount: Number(e.amount) || 0,
      type: e.type === 'spent' ? 'spent' : 'received',
      reason: e.reason ? String(e.reason).trim() : '',
      when: e.when || new Date().toISOString(),
      updatedAt: e.updatedAt || e.when || new Date().toISOString()
    };
  }

  function mergeImport(validEntries){
    let added = 0, skipped = 0;
    validEntries.forEach(raw => {
      const e = normalizeImportedEntry(raw);
      if(entries.some(en => en.id === e.id)){ skipped++; return; }
      entries.push(e);
      added++;
    });
    // Clean tombstones for re-imported entries so they survive sync
    const currentIds = new Set(entries.map(e => e.id));
    const cleaned = loadDeletedIds().filter(id => !currentIds.has(id));
    saveDeletedIds(cleaned);
    render();
    saveEntries();
    return { added, skipped };
  }

  function replaceImport(validEntries){
    entries = validEntries.map(normalizeImportedEntry);
    // Clear tombstones — fresh start with imported data
    saveDeletedIds([]);
    render();
    saveEntries();
  }

  document.getElementById('mergeBtn').addEventListener('click', () => {
    if(!pendingImportValid.length) return;
    const { added, skipped } = mergeImport(pendingImportValid);
    setBackupStatus(`Merged — ${added} new added${skipped ? `, ${skipped} already existed` : ''}.`, 'ok');
    importPreview.classList.remove('show');
    pendingImportValid = [];
    importFileInput.value = '';
  });

  document.getElementById('replaceBtn').addEventListener('click', () => {
    if(!pendingImportValid.length) return;
    requestPassword({
      title: 'Enter security password',
      sub: 'Confirm to replace all your existing data',
      onSuccess: () => {
        const count = pendingImportValid.length;
        replaceImport(pendingImportValid);
        setBackupStatus(`Replaced — now showing ${count} ${count === 1 ? 'entry' : 'entries'} from the file.`, 'ok');
        importPreview.classList.remove('show');
        pendingImportValid = [];
        importFileInput.value = '';
      }
    });
  });

  /* ── Enhanced Cloud Sync Engine with State Detection & Smart Merge ── */
  const SYNC_CONFIG_KEY = 'paisa-hisaab-sync-config';
  const SYNC_FILE_NAME = 'paisa-hisaab-sync.json';
  const LAST_SYNC_KEY = 'paisa-hisaab-last-sync';
  const LOCAL_MODIFIED_KEY = 'paisa-hisaab-local-modified';
  const LAST_SYNCED_CLOUD_KEY = 'paisa-hisaab-last-synced-cloud';

  let isSyncInProgress = false;
  let lastCloudCheckMs = 0;
  let autoSyncTimer = null;

  let syncState = {
    status: 'no_config', // 'synced', 'cloud_new', 'local_new', 'conflict', 'syncing', 'error', 'no_config'
    cloudLastModified: null,
    cloudEntriesCount: null,
    cloudRawData: null,
    cloudDeletedIds: []
  };

  function getLocalModifiedTime(){
    return localStorage.getItem(LOCAL_MODIFIED_KEY) || localStorage.getItem(LAST_SYNC_KEY) || new Date().toISOString();
  }

  function markLocalModified(){
    if(isSyncInProgress) return;
    localStorage.setItem(LOCAL_MODIFIED_KEY, new Date().toISOString());
    updateSyncBadgeUI();
    updateSubpageStateCard();
    // Auto-sync if enabled
    const cfg = loadSyncConfig();
    if(cfg.gistId && cfg.token && cfg.autoPushOnSave !== false){
      debouncedAutoSync();
    }
  }

  function debouncedAutoSync(){
    if(isSyncInProgress) return;
    clearTimeout(autoSyncTimer);
    autoSyncTimer = setTimeout(() => {
      if(!isSyncInProgress){
        smartSync(true); // silent = true
      }
    }, 600);
  }

  function loadSyncConfig(){
    try{
      const raw = localStorage.getItem(SYNC_CONFIG_KEY);
      return raw ? JSON.parse(raw) : { gistId: '', token: '', deviceName: '', autoCheckOnOpen: true, autoPushOnSave: true };
    }catch(err){ return { gistId: '', token: '', deviceName: '', autoCheckOnOpen: true, autoPushOnSave: true }; }
  }

  function saveSyncConfig(cfg){
    try{ localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(cfg)); }
    catch(err){ console.error('Could not save sync config', err); }
  }

  function formatRelativeTime(isoStr){
    if(!isoStr) return 'Never';
    try {
      const d = new Date(isoStr);
      const now = new Date();
      const diffMs = now - d;
      const diffSec = Math.floor(diffMs / 1000);
      if(diffSec < 30) return 'Just now';
      if(diffSec < 60) return `${diffSec}s ago`;
      const diffMin = Math.floor(diffSec / 60);
      if(diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      if(diffHr < 24) return `${diffHr}h ago`;
      return d.toLocaleDateString('en-IN', { day:'numeric', month:'short' }) + ' ' + d.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });
    } catch(e){ return 'Unknown'; }
  }

  function updateSyncBadgeUI(){
    const badgeBtn = document.getElementById('syncBadgeBtn');
    const badgeText = document.getElementById('syncBadgeText');

    if(!badgeBtn || !badgeText) return;

    const cfg = loadSyncConfig();
    if(!cfg.gistId || !cfg.token){
      badgeBtn.style.display = 'none';
      return;
    }

    badgeBtn.style.display = 'inline-flex';
    badgeBtn.className = 'sync-badge-btn ' + syncState.status;

    if(syncState.status === 'syncing'){
      badgeText.textContent = 'Syncing…';
    } else if(syncState.status === 'cloud_new'){
      badgeText.textContent = 'Updating…';
    } else if(syncState.status === 'local_new'){
      badgeText.textContent = 'Unsaved to Cloud';
    } else if(syncState.status === 'conflict'){
      badgeText.textContent = 'Merging…';
    } else if(syncState.status === 'error'){
      badgeText.textContent = 'Sync Error';
    } else {
      badgeText.textContent = 'In Sync';
    }
  }

  function updateSubpageStateCard(){
    const ind = document.getElementById('sscIndicator');
    const localEntriesEl = document.getElementById('sscLocalEntries');
    const localTimeEl = document.getElementById('sscLocalTime');
    const localDeviceEl = document.getElementById('sscLocalDevice');
    const cloudEntriesEl = document.getElementById('sscCloudEntries');
    const cloudTimeEl = document.getElementById('sscCloudTime');
    const cloudDeviceEl = document.getElementById('sscCloudDevice');

    if(!ind) return;

    const cfg = loadSyncConfig();
    const myDevice = cfg.deviceName ? cfg.deviceName : (navigator.userAgent.includes('Mobile') ? 'Mobile' : 'This PC');

    if(localEntriesEl) localEntriesEl.textContent = `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`;
    if(localTimeEl) localTimeEl.textContent = `Modified: ${formatRelativeTime(getLocalModifiedTime())}`;
    if(localDeviceEl) localDeviceEl.textContent = `📱 ${myDevice}`;

    if(syncState.cloudEntriesCount !== null){
      if(cloudEntriesEl) cloudEntriesEl.textContent = `${syncState.cloudEntriesCount} ${syncState.cloudEntriesCount === 1 ? 'entry' : 'entries'}`;
    } else {
      if(cloudEntriesEl) cloudEntriesEl.textContent = '—';
    }

    if(syncState.cloudLastModified){
      if(cloudTimeEl) cloudTimeEl.textContent = `Updated: ${formatRelativeTime(syncState.cloudLastModified)}`;
      const cloudDevName = syncState.cloudDeviceTag || 'Connected Device';
      if(cloudDeviceEl){
        cloudDeviceEl.textContent = `☁️ ${cloudDevName}`;
        cloudDeviceEl.className = 'ssc-device-pill cloud active';
      }
    } else {
      if(cloudTimeEl) cloudTimeEl.textContent = 'Not checked yet';
      if(cloudDeviceEl){
        cloudDeviceEl.textContent = '☁️ Cloud';
        cloudDeviceEl.className = 'ssc-device-pill cloud';
      }
    }

    ind.className = 'ssc-indicator ' + syncState.status;
    if(syncState.status === 'syncing'){
      ind.textContent = '🔄 Syncing with cloud…';
    } else if(syncState.status === 'cloud_new'){
      ind.textContent = '🔵 Cloud Has New Updates';
    } else if(syncState.status === 'local_new'){
      ind.textContent = '🟠 Unsaved Local Changes';
    } else if(syncState.status === 'conflict'){
      ind.textContent = '⚡ Multi-Device Sync Needed';
    } else if(syncState.status === 'error'){
      ind.textContent = '🔴 Connection Error';
    } else if(syncState.status === 'no_config'){
      ind.textContent = '⚪ Connect Gist ID & Token';
    } else {
      ind.textContent = '🟢 In Sync with Cloud';
    }
  }

  function updateSyncLastText(){
    const el = document.getElementById('syncLast');
    const iso = localStorage.getItem(LAST_SYNC_KEY);
    if(!iso){ if(el) el.textContent = 'Never synced yet.'; return; }
    const d = new Date(iso);
    if(el){
      el.textContent = 'Last synced: ' + d.toLocaleDateString('en-IN', {day:'2-digit', month:'short'}) +
        ' · ' + d.toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit'});
    }
  }

  function setSyncBadgeSyncing(isSyncing){
    if(isSyncing){
      syncState.status = 'syncing';
    }
    updateSyncBadgeUI();
    updateSubpageStateCard();
  }

  async function checkCloudStatus(silent = false, forceCheck = false){
    const cfg = loadSyncConfig();
    if(!cfg.gistId || !cfg.token){
      syncState.status = 'no_config';
      updateSyncBadgeUI();
      updateSubpageStateCard();
      return;
    }

    const nowMs = Date.now();
    if(!forceCheck && nowMs - lastCloudCheckMs < 20000){
      return;
    }
    lastCloudCheckMs = nowMs;

    if(isSyncInProgress) return;

    if(!silent) setSyncBadgeSyncing(true);

    try{
      const res = await fetch(`https://api.github.com/gists/${cfg.gistId}?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Authorization': `token ${cfg.token}`,
          'Accept': 'application/vnd.github+json'
        }
      });

      if(!res.ok){
        syncState.status = 'error';
        updateSyncBadgeUI();
        updateSubpageStateCard();
        return;
      }

      const gist = await res.json();
      const file = gist.files && gist.files[SYNC_FILE_NAME];
      let cloudTime = null;
      let cloudCount = 0;
      let cloudEntries = [];
      let cloudDeletedIds = [];

      if(file && file.content){
        try{
          const parsed = JSON.parse(file.content);
          if(Array.isArray(parsed)){
            cloudEntries = parsed;
            cloudCount = parsed.length;
            cloudTime = gist.updated_at || new Date().toISOString();
          } else if(parsed && typeof parsed === 'object'){
            cloudEntries = Array.isArray(parsed.entries) ? parsed.entries : [];
            cloudCount = cloudEntries.length;
            cloudTime = parsed.lastModified || gist.updated_at || new Date().toISOString();
            cloudDeletedIds = Array.isArray(parsed.deletedIds) ? parsed.deletedIds : [];
            syncState.cloudDeviceTag = parsed.deviceTag || null;
          }
        }catch(e){}
      }

      syncState.cloudLastModified = cloudTime;
      syncState.cloudEntriesCount = cloudCount;
      syncState.cloudRawData = cloudEntries;
      syncState.cloudDeletedIds = cloudDeletedIds;

      const lastSyncedCloud = localStorage.getItem(LAST_SYNCED_CLOUD_KEY);
      const localModified = getLocalModifiedTime();

      const isCloudNewer = cloudTime && (!lastSyncedCloud || new Date(cloudTime).getTime() > new Date(lastSyncedCloud).getTime() + 1000);
      const isLocalNewer = !lastSyncedCloud || (new Date(localModified).getTime() > new Date(lastSyncedCloud).getTime() + 1000);

      if(isCloudNewer && isLocalNewer){
        syncState.status = 'conflict';
      } else if(isCloudNewer){
        syncState.status = 'cloud_new';
      } else if(isLocalNewer){
        syncState.status = 'local_new';
      } else {
        syncState.status = 'synced';
      }

      updateSyncBadgeUI();
      updateSubpageStateCard();

      // Whenever cloud has new updates or changes, auto-merge seamlessly in background!
      if(isCloudNewer || (isLocalNewer && cfg.autoPushOnSave !== false)){
        smartSync(true);
      }
    }catch(err){
      syncState.status = 'error';
      updateSyncBadgeUI();
      updateSubpageStateCard();
    }
  }

  async function smartSync(silent = false){
    if(isSyncInProgress) return;
    isSyncInProgress = true;
    clearTimeout(autoSyncTimer);

    const cfg = loadSyncConfig();
    if(!cfg.gistId || !cfg.token){
      isSyncInProgress = false;
      if(!silent) setSyncStatus('Save your Gist ID and Token first.', 'err');
      return;
    }

    if(!silent) setSyncStatus('Syncing & Merging with cloud…', '');
    setSyncBadgeSyncing(true);

    try{
      // 1. Fetch current cloud state
      const res = await fetch(`https://api.github.com/gists/${cfg.gistId}?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Authorization': `token ${cfg.token}`,
          'Accept': 'application/vnd.github+json'
        }
      });
      if(!res.ok) throw new Error('Fetch failed: ' + res.status);
      const gist = await res.json();
      const file = gist.files && gist.files[SYNC_FILE_NAME];
      let cloudEntries = [];
      let cloudDeletedIds = [];

      if(file && file.content){
        try{
          const parsed = JSON.parse(file.content);
          if(Array.isArray(parsed)){
            cloudEntries = parsed;
          } else if(parsed && typeof parsed === 'object'){
            cloudEntries = Array.isArray(parsed.entries) ? parsed.entries : [];
            cloudDeletedIds = Array.isArray(parsed.deletedIds) ? parsed.deletedIds : [];
          }
        }catch(e){}
      }

      const { valid: validCloudEntries } = validateImportData(cloudEntries);
      const normalizedCloud = validCloudEntries.map(normalizeImportedEntry);

      // 2. Merge local and cloud deleted tombstones
      const localDeleted = loadDeletedIds();
      const mergedDeleted = Array.from(new Set([...localDeleted, ...cloudDeletedIds]));
      saveDeletedIds(mergedDeleted);

      // 3. Smart Merge all entries
      const entryMap = new Map();
      entries.forEach(e => {
        if(!mergedDeleted.includes(e.id)){
          entryMap.set(e.id, normalizeImportedEntry(e));
        }
      });

      let newFromCloud = 0;
      let editedFromCloud = 0;
      normalizedCloud.forEach(ce => {
        if(!mergedDeleted.includes(ce.id)){
          if(!entryMap.has(ce.id)){
            newFromCloud++;
            entryMap.set(ce.id, ce);
          } else {
            const localE = entryMap.get(ce.id);
            const cloudUpdatedMs = new Date(ce.updatedAt || ce.when || 0).getTime();
            const localUpdatedMs = new Date(localE.updatedAt || localE.when || 0).getTime();
            if(cloudUpdatedMs >= localUpdatedMs){
              if(cloudUpdatedMs > localUpdatedMs) editedFromCloud++;
              entryMap.set(ce.id, ce);
            } else {
              entryMap.set(ce.id, localE);
            }
          }
        }
      });

      entries = Array.from(entryMap.values()).sort((a,b) => new Date(b.when) - new Date(a.when));
      saveEntries(true); // skipSync = true to PREVENT RECURSIVE SYNC LOOPS!
      render();

      // 4. Push merged state back to cloud so both devices match 100%
      const nowIso = new Date().toISOString();
      const myDeviceTag = cfg.deviceName || (navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop');
      const payload = {
        version: 2,
        lastModified: nowIso,
        entriesCount: entries.length,
        deviceTag: myDeviceTag,
        entries: entries,
        deletedIds: mergedDeleted
      };

      const putRes = await fetch(`https://api.github.com/gists/${cfg.gistId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${cfg.token}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          files: {
            [SYNC_FILE_NAME]: {
              content: JSON.stringify(payload, null, 2)
            }
          }
        })
      });

      if(!putRes.ok) throw new Error('Push failed: ' + putRes.status);

      localStorage.setItem(LAST_SYNC_KEY, nowIso);
      localStorage.setItem(LAST_SYNCED_CLOUD_KEY, nowIso);
      localStorage.setItem(LOCAL_MODIFIED_KEY, nowIso);

      syncState.status = 'synced';
      syncState.cloudLastModified = nowIso;
      syncState.cloudEntriesCount = entries.length;

      updateSyncBadgeUI();
      updateSubpageStateCard();
      updateSyncLastText();

      const msg = `Synced — Both devices in sync (${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}${newFromCloud ? `, +${newFromCloud} from cloud` : ''}).`;
      if(!silent) setSyncStatus(msg, 'ok');
    } catch(err){
      syncState.status = 'error';
      updateSyncBadgeUI();
      updateSubpageStateCard();
      if(!silent) setSyncStatus('Smart Sync failed. Check connection and Token.', 'err');
    } finally {
      isSyncInProgress = false;
      updateSyncBadgeUI();
      updateSubpageStateCard();
    }
  }

  async function fetchFromCloud(silent = false){
    if(isSyncInProgress) return;
    isSyncInProgress = true;
    clearTimeout(autoSyncTimer);

    const cfg = loadSyncConfig();
    if(!cfg.gistId || !cfg.token){
      isSyncInProgress = false;
      if(!silent) setSyncStatus('Save your Gist ID and Token first.', 'err');
      return;
    }
    if(!silent) setSyncStatus('Fetching…', '');
    setSyncBadgeSyncing(true);
    try{
      const getRes = await fetch(`https://api.github.com/gists/${cfg.gistId}?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Authorization': `token ${cfg.token}`,
          'Accept': 'application/vnd.github+json'
        }
      });
      if(!getRes.ok) throw new Error('fetch-failed-' + getRes.status);
      const gist = await getRes.json();
      const file = gist.files && gist.files[SYNC_FILE_NAME];
      let rawData = [];
      let cloudTime = gist.updated_at || new Date().toISOString();
      let cloudDeletedIds = [];
      if(file && file.content){
        try{
          const parsed = JSON.parse(file.content);
          if(Array.isArray(parsed)){
            rawData = parsed;
          } else if(parsed && typeof parsed === 'object'){
            rawData = Array.isArray(parsed.entries) ? parsed.entries : [];
            cloudTime = parsed.lastModified || cloudTime;
            cloudDeletedIds = Array.isArray(parsed.deletedIds) ? parsed.deletedIds : [];
          }
        }catch(err){ rawData = []; }
      }
      const { valid } = validateImportData(rawData);
      entries = valid.map(normalizeImportedEntry);
      saveDeletedIds(cloudDeletedIds);
      saveEntries(true); // skipSync = true
      render();

      localStorage.setItem(LAST_SYNC_KEY, cloudTime);
      localStorage.setItem(LAST_SYNCED_CLOUD_KEY, cloudTime);
      localStorage.setItem(LOCAL_MODIFIED_KEY, cloudTime);

      syncState.status = 'synced';
      syncState.cloudLastModified = cloudTime;
      syncState.cloudEntriesCount = entries.length;

      updateSyncBadgeUI();
      updateSubpageStateCard();
      updateSyncLastText();
      if(!silent) setSyncStatus(`Fetched — Local data replaced with ${entries.length} ${entries.length === 1 ? 'entry' : 'entries'} from cloud.`, 'ok');
    }catch(err){
      syncState.status = 'error';
      updateSyncBadgeUI();
      updateSubpageStateCard();
      if(!silent) setSyncStatus('Fetch failed. Check your Gist ID, Token, and internet.', 'err');
    } finally {
      isSyncInProgress = false;
      updateSyncBadgeUI();
      updateSubpageStateCard();
    }
  }

  async function pushToCloud(silent = false){
    if(isSyncInProgress) return;
    isSyncInProgress = true;
    clearTimeout(autoSyncTimer);

    const cfg = loadSyncConfig();
    if(!cfg.gistId || !cfg.token){
      isSyncInProgress = false;
      if(!silent) setSyncStatus('Save your Gist ID and Token first.', 'err');
      return;
    }
    if(!silent) setSyncStatus('Pushing…', '');
    setSyncBadgeSyncing(true);
    try{
      const nowIso = new Date().toISOString();
      const myDeviceTag = cfg.deviceName || (navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop');
      const payload = {
        version: 2,
        lastModified: nowIso,
        entriesCount: entries.length,
        deviceTag: myDeviceTag,
        entries: entries,
        deletedIds: loadDeletedIds()
      };

      const putRes = await fetch(`https://api.github.com/gists/${cfg.gistId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${cfg.token}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          files: {
            [SYNC_FILE_NAME]: {
              content: JSON.stringify(payload, null, 2)
            }
          }
        })
      });
      if(!putRes.ok) throw new Error('push-failed-' + putRes.status);

      localStorage.setItem(LAST_SYNC_KEY, nowIso);
      localStorage.setItem(LAST_SYNCED_CLOUD_KEY, nowIso);
      localStorage.setItem(LOCAL_MODIFIED_KEY, nowIso);

      syncState.status = 'synced';
      syncState.cloudLastModified = nowIso;
      syncState.cloudEntriesCount = entries.length;

      updateSyncBadgeUI();
      updateSubpageStateCard();
      updateSyncLastText();
      if(!silent) setSyncStatus(`Pushed — Cloud overwritten with ${entries.length} ${entries.length === 1 ? 'entry' : 'entries'} from local.`, 'ok');
    }catch(err){
      syncState.status = 'error';
      updateSyncBadgeUI();
      updateSubpageStateCard();
      if(!silent) setSyncStatus('Push failed. Check your Gist ID, Token, and internet.', 'err');
    } finally {
      isSyncInProgress = false;
      updateSyncBadgeUI();
      updateSubpageStateCard();
    }
  }

  document.getElementById('saveSyncBtn').addEventListener('click', () => {
    const gistId = document.getElementById('gistId').value.trim();
    const token = document.getElementById('gistToken').value.trim();
    const deviceName = document.getElementById('deviceName').value.trim();
    const autoCheckOnOpen = document.getElementById('autoCheckCloudOnOpen').checked;
    const autoPushOnSave = document.getElementById('autoPushOnSave').checked;
    if(!gistId || !token){
      setSyncStatus('Enter both Gist ID and Token to save.', 'err');
      return;
    }
    saveSyncConfig({ gistId, token, deviceName, autoCheckOnOpen, autoPushOnSave });
    setSyncStatus('Sync settings saved on this device.', 'ok');
    checkCloudStatus(false, true);
  });

  document.getElementById('smartSyncBtn').addEventListener('click', () => smartSync(false));
  document.getElementById('sscRefreshBtn').addEventListener('click', () => checkCloudStatus(false, true));
  document.getElementById('syncBadgeBtn').addEventListener('click', () => {
    // Open cloud sync subpage
    document.getElementById('openCloudSyncSubpageBtn').click();
  });

  function showCustomConfirm({ icon = '❓', title = 'Confirm Action', msg = 'Are you sure?', okText = 'Proceed', cancelText = 'Cancel', isDanger = false }){
    return new Promise((resolve) => {
      const ov = document.getElementById('confirmOverlay');
      const iconEl = document.getElementById('confirmIcon');
      const titleEl = document.getElementById('confirmTitle');
      const msgEl = document.getElementById('confirmMsg');
      const okBtn = document.getElementById('confirmOkBtn');
      const cancelBtn = document.getElementById('confirmCancelBtn');

      iconEl.textContent = icon;
      iconEl.className = 'confirm-icon' + (isDanger ? ' danger' : '');
      titleEl.textContent = title;
      msgEl.textContent = msg;
      okBtn.textContent = okText;
      okBtn.className = 'confirm-btn ok' + (isDanger ? ' danger' : '');
      cancelBtn.textContent = cancelText;

      const cleanup = () => {
        ov.classList.remove('show');
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
        ov.removeEventListener('click', onBackdrop);
      };

      const onOk = () => { cleanup(); resolve(true); };
      const onCancel = () => { cleanup(); resolve(false); };
      const onBackdrop = (e) => { if(e.target === ov){ cleanup(); resolve(false); } };

      okBtn.addEventListener('click', onOk);
      cancelBtn.addEventListener('click', onCancel);
      ov.addEventListener('click', onBackdrop);

      ov.classList.add('show');
      ensureNavHistory();
    });
  }

  document.getElementById('fetchCloudBtn').addEventListener('click', async () => {
    const confirmed = await showCustomConfirm({
      icon: '⬇️',
      title: 'Fetch from Cloud?',
      msg: 'This will replace your local transactions with data from your cloud backup.',
      okText: 'Yes, Fetch & Replace',
      cancelText: 'Cancel'
    });
    if(confirmed) fetchFromCloud();
  });

  document.getElementById('pushCloudBtn').addEventListener('click', async () => {
    const confirmed = await showCustomConfirm({
      icon: '⬆️',
      title: 'Push to Cloud?',
      msg: 'This will overwrite your cloud backup with your current local transactions.',
      okText: 'Yes, Push to Cloud',
      cancelText: 'Cancel'
    });
    if(confirmed) pushToCloud();
  });

  // ── Native Mobile Back Button & Navigation History ──
  function ensureNavHistory(){
    if(!history.state || !history.state.paisaNav){
      history.pushState({ paisaNav: true, time: Date.now() }, '');
    }
  }

  function hasAnyOpenOverlay(){
    const confirmOverlay = document.getElementById('confirmOverlay');
    const pinOverlay = document.getElementById('pinOverlay');
    const detailOverlay = document.getElementById('detailOverlay');
    const overlay = document.getElementById('overlay');
    const pdfExportOverlay = document.getElementById('pdfExportOverlay');
    const dateTimeOverlay = document.getElementById('dateTimeOverlay');
    const customCalOverlay = document.getElementById('customCalendarOverlay');
    const syncAdvSubpage = document.getElementById('syncAdvancedSubpageOverlay');
    const cloudSyncSubpage = document.getElementById('cloudSyncSubpageOverlay');
    const backupSubpage = document.getElementById('backupSubpageOverlay');

    return (confirmOverlay && confirmOverlay.classList.contains('show')) ||
           (pinOverlay && pinOverlay.classList.contains('show')) ||
           (detailOverlay && detailOverlay.classList.contains('show')) ||
           (overlay && overlay.classList.contains('show')) ||
           (pdfExportOverlay && pdfExportOverlay.classList.contains('show')) ||
           (dateTimeOverlay && dateTimeOverlay.classList.contains('show')) ||
           (customCalOverlay && customCalOverlay.classList.contains('show')) ||
           (syncAdvSubpage && syncAdvSubpage.classList.contains('show')) ||
           (cloudSyncSubpage && cloudSyncSubpage.classList.contains('show')) ||
           (backupSubpage && backupSubpage.classList.contains('show')) ||
           (activeTab !== 'home');
  }

  // Close buttons for bottom sheets
  document.getElementById('closeEntrySheet').addEventListener('click', () => {
    overlay.classList.remove('show');
    resetToAddMode();
  });
  document.getElementById('closeDetailSheet').addEventListener('click', () => {
    detailOverlay.classList.remove('show');
  });

  // Swipe/drag down to dismiss sheets & block pull-to-refresh
  document.querySelectorAll('.overlay').forEach(ov => {
    const sheet = ov.querySelector('.sheet');
    if(!sheet || ov.id === 'pinOverlay') return;
    let startY = 0;
    let currentY = 0;
    let isTracking = false;

    sheet.addEventListener('touchstart', (e) => {
      if(sheet.scrollTop <= 5){
        startY = e.touches[0].clientY;
        currentY = startY;
        isTracking = true;
      } else {
        isTracking = false;
      }
    }, { passive: true });

    sheet.addEventListener('touchmove', (e) => {
      if(!isTracking) return;
      currentY = e.touches[0].clientY;
      const diff = currentY - startY;
      if(diff > 0 && sheet.scrollTop <= 5){
        sheet.style.transform = `translateY(${Math.min(diff * 0.7, 250)}px)`;
      }
    }, { passive: true });

    sheet.addEventListener('touchend', () => {
      if(!isTracking) return;
      isTracking = false;
      const diff = currentY - startY;
      sheet.style.transition = 'transform 0.2s ease-out';
      sheet.style.transform = '';
      setTimeout(() => { sheet.style.transition = ''; }, 200);
      if(diff > 90 && sheet.scrollTop <= 5){
        ov.classList.remove('show');
        if(ov.id === 'overlay') resetToAddMode();
      }
    });
  });
  // ── Detailed Transactions View ──
  const txnListOverlay = document.getElementById('txnListOverlay');
  const txnListBody = document.getElementById('txnListBody');
  const txnCountEl = document.getElementById('txnCount');
  const txnReasonSearchInput = document.getElementById('txnReasonSearchInput');
  const txnReasonSearchClear = document.getElementById('txnReasonSearchClear');
  let txnListFilter = 'all';
  let txnSelectedDate = null;
  let txnReasonSearchQuery = '';

  function renderTxnList(){
    txnListBody.innerHTML = '';

    let filtered;
    if(txnListFilter === 'all'){
      filtered = entries;
    } else {
      filtered = entries.filter(e => e.type === txnListFilter);
    }

    // Independent Date filter for All Transactions
    if(txnSelectedDate){
      filtered = filtered.filter(e => toLocalDateStr(e.when) === txnSelectedDate);
    }

    // Target ONLY reason field for search
    const q = txnReasonSearchQuery.trim().toLowerCase();
    if(q){
      filtered = filtered.filter(e => e.reason && e.reason.toLowerCase().includes(q));
    }

    const sorted = [...filtered].sort((a,b) => new Date(b.when) - new Date(a.when));
    let lastDate = null;

    if(q && txnSelectedDate){
      txnCountEl.textContent = `Found ${sorted.length} for "${txnReasonSearchQuery.trim()}" on ${formatCompactDate(txnSelectedDate)}`;
    } else if(q){
      txnCountEl.textContent = `Found ${sorted.length} ${sorted.length === 1 ? 'entry' : 'entries'} for "${txnReasonSearchQuery.trim()}"`;
    } else if(txnSelectedDate){
      txnCountEl.textContent = `Showing ${sorted.length} ${sorted.length === 1 ? 'entry' : 'entries'} on ${formatCompactDate(txnSelectedDate)}`;
    } else {
      txnCountEl.textContent = `Showing ${sorted.length} ${sorted.length === 1 ? 'entry' : 'entries'}`;
    }

    if(sorted.length === 0){
      if(q){
        txnListBody.innerHTML = `<div class="txn-list-empty">🔍<br>No entries found for reason <b>"${escapeHtml(txnReasonSearchQuery.trim())}"</b>.</div>`;
      } else {
        txnListBody.innerHTML = '<div class="txn-list-empty">🧾<br>No entries to show.</div>';
      }
      return;
    }

    sorted.forEach(e => {
      const entryDate = toLocalDateStr(e.when);
      if(entryDate !== lastDate){
        lastDate = entryDate;
        const divider = document.createElement('div');
        divider.className = 'txn-date-divider';
        divider.innerHTML = `<span>${getDateGroupLabel(entryDate)}</span>`;
        txnListBody.appendChild(divider);
      }

      const d = new Date(e.when);
      const timePart = d.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });
      const sign = e.type === 'received' ? '+' : '−';
      const reasonText = e.reason ? escapeHtml(e.reason) : '— No reason provided';
      const hasReason = e.reason ? ' has-reason' : '';

      const card = document.createElement('div');
      card.className = 'txn-card';
      card.innerHTML = `
        <div class="txn-card-top">
          <div class="avatar" style="background:${colorFor(e.name)}">${initials(e.name)}</div>
          <div class="txn-card-info">
            <div class="txn-card-name">${escapeHtml(e.name)}</div>
            <div class="txn-card-datetime">${timePart}</div>
          </div>
          <div class="txn-card-amount ${e.type}">${sign} ${formatRupee(e.amount)}</div>
        </div>
        <div class="txn-card-reason${hasReason}">${reasonText}</div>
      `;
      attachLongPress(
        card,
        () => openDetail(e.id),
        () => openDateTimeEditor(e.id)
      );
      txnListBody.appendChild(card);
    });
  }

  if(txnReasonSearchInput){
    txnReasonSearchInput.addEventListener('input', () => {
      txnReasonSearchQuery = txnReasonSearchInput.value;
      if(txnReasonSearchClear){
        txnReasonSearchClear.style.display = txnReasonSearchQuery ? 'flex' : 'none';
      }
      renderTxnList();
    });
  }

  if(txnReasonSearchClear){
    txnReasonSearchClear.addEventListener('click', () => {
      txnReasonSearchInput.value = '';
      txnReasonSearchQuery = '';
      txnReasonSearchClear.style.display = 'none';
      txnReasonSearchInput.focus();
      renderTxnList();
    });
  }

  document.getElementById('closeTxnList').addEventListener('click', () => {
    switchTab('home');
  });

  document.querySelectorAll('.txn-filter-chip[data-txnf]').forEach(chip => {
    chip.addEventListener('click', () => {
      txnListFilter = chip.dataset.txnf;
      document.querySelectorAll('.txn-filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      renderTxnList();
    });
  });

  function updateTxnDateFilterUI(){
    const chip = document.getElementById('txnDateFilterChip');
    const textEl = document.getElementById('txnDateFilterText');
    const clearEl = document.getElementById('txnDateFilterClear');
    if(!chip || !textEl) return;

    if(txnSelectedDate){
      chip.classList.add('active');
      textEl.textContent = formatCompactDate(txnSelectedDate);
      if(clearEl) clearEl.style.display = 'inline-flex';
    } else {
      chip.classList.remove('active');
      textEl.textContent = 'By date';
      if(clearEl) clearEl.style.display = 'none';
    }
  }

  const txnDateFilterChip = document.getElementById('txnDateFilterChip');
  if(txnDateFilterChip){
    txnDateFilterChip.addEventListener('click', (e) => {
      if(e.target.closest('#txnDateFilterClear')){
        e.stopPropagation();
        txnSelectedDate = null;
        updateTxnDateFilterUI();
        renderTxnList();
        return;
      }
      openCustomCalendar({
        selectedDate: txnSelectedDate || toLocalDateStr(new Date().toISOString()),
        title: 'Filter Txns by Date',
        onSelect: (chosenDate) => {
          txnSelectedDate = chosenDate;
          updateTxnDateFilterUI();
          renderTxnList();
        }
      });
    });
  }

  // ── PDF Export Modal & Black & White Generator ──
  const pdfExportOverlay = document.getElementById('pdfExportOverlay');
  const pdfCustomDates = document.getElementById('pdfCustomDates');
  const pdfStartDate = document.getElementById('pdfStartDate');
  const pdfEndDate = document.getElementById('pdfEndDate');
  const pdfGenerateBtn = document.getElementById('pdfGenerateBtn');
  const pdfCancelBtn = document.getElementById('pdfCancelBtn');
  let currentPdfPreset = 'all';
  let currentPdfType = 'all';

  function formatPdfRupee(num){
    const n = Number(num) || 0;
    return 'Rs. ' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function getPdfDateRange(preset){
    const now = new Date();
    const todayStr = toLocalDateStr(now.toISOString());
    if(preset === 'all'){
      return { start: null, end: null, label: 'All Recorded History' };
    }
    if(preset === 'this_month'){
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const startStr = toLocalDateStr(start.toISOString());
      return { start: startStr, end: todayStr, label: `${start.toLocaleDateString('en-IN', {month:'short', year:'numeric'})}` };
    }
    if(preset === 'last_month'){
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      const startStr = toLocalDateStr(start.toISOString());
      const endStr = toLocalDateStr(end.toISOString());
      return { start: startStr, end: endStr, label: `${start.toLocaleDateString('en-IN', {month:'short', year:'numeric'})}` };
    }
    if(preset === 'last_30'){
      const start = new Date();
      start.setDate(start.getDate() - 30);
      const startStr = toLocalDateStr(start.toISOString());
      return { start: startStr, end: todayStr, label: 'Last 30 Days' };
    }
    if(preset === 'custom'){
      const s = pdfStartDate.value;
      const e = pdfEndDate.value;
      const fmtDate = (dstr) => {
        if(!dstr) return '';
        const p = dstr.split('-');
        return new Date(Number(p[0]), Number(p[1])-1, Number(p[2])).toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'});
      };
      const label = (s && e) ? `${fmtDate(s)} to ${fmtDate(e)}` : (s ? `From ${fmtDate(s)}` : (e ? `Up to ${fmtDate(e)}` : 'Custom Range'));
      return { start: s || null, end: e || null, label };
    }
    return { start: null, end: null, label: 'All Recorded History' };
  }

  function getFilteredPdfEntries(){
    const { start, end } = getPdfDateRange(currentPdfPreset);
    let list = [...entries];
    if(currentPdfType !== 'all'){
      list = list.filter(e => e.type === currentPdfType);
    }
    if(start){
      list = list.filter(e => toLocalDateStr(e.when) >= start);
    }
    if(end){
      list = list.filter(e => toLocalDateStr(e.when) <= end);
    }
    return list.sort((a,b) => new Date(b.when) - new Date(a.when));
  }

  function updatePdfPreview(){
    const list = getFilteredPdfEntries();
    let totalRec = 0, totalSp = 0;
    list.forEach(e => {
      if(e.type === 'received') totalRec += Number(e.amount);
      else totalSp += Number(e.amount);
    });
    const countEl = document.getElementById('pdfPreviewCount');
    const amtEl = document.getElementById('pdfPreviewAmounts');
    countEl.textContent = `📊 ${list.length} ${list.length === 1 ? 'entry' : 'entries'} found`;
    if(currentPdfType === 'received'){
      amtEl.textContent = `Total: Rs. ${Number(totalRec).toLocaleString('en-IN')}`;
      amtEl.style.color = 'var(--green)';
    } else if(currentPdfType === 'spent'){
      amtEl.textContent = `Total: Rs. ${Number(totalSp).toLocaleString('en-IN')}`;
      amtEl.style.color = 'var(--red)';
    } else {
      const net = totalRec - totalSp;
      amtEl.textContent = `Net: ${net >= 0 ? '+' : '-'}Rs. ${Math.abs(net).toLocaleString('en-IN')}`;
      amtEl.style.color = 'var(--grad1)';
    }
  }

  function openPdfModal(){
    currentPdfPreset = 'all';
    currentPdfType = (txnListFilter && txnListFilter !== 'all') ? txnListFilter : 'all';
    document.querySelectorAll('.pdf-preset-chip').forEach(c => c.classList.toggle('active', c.dataset.range === 'all'));
    document.querySelectorAll('.pdf-type-btn').forEach(b => b.classList.toggle('active', b.dataset.type === currentPdfType));
    pdfCustomDates.style.display = 'none';

    const now = new Date();
    const todayStr = toLocalDateStr(now.toISOString());
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    pdfStartDate.value = toLocalDateStr(thirtyDaysAgo.toISOString());
    pdfEndDate.value = todayStr;
    updatePdfDatePillLabels();

    updatePdfPreview();
    pdfExportOverlay.classList.add('show');
    ensureNavHistory();
  }

  function formatCompactDate(isoDateStr){
    if(!isoDateStr) return '';
    const parts = isoDateStr.split('-');
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleDateString('en-IN', { month: 'short' });
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  }

  function updatePdfDatePillLabels(){
    const sInput = document.getElementById('pdfStartDate');
    const eInput = document.getElementById('pdfEndDate');
    const sLabel = document.getElementById('pdfStartDateLabel');
    const eLabel = document.getElementById('pdfEndDateLabel');
    if(sLabel && sInput) sLabel.textContent = formatCompactDate(sInput.value) || 'Select Date';
    if(eLabel && eInput) eLabel.textContent = formatCompactDate(eInput.value) || 'Select Date';
  }

  const pdfStartDatePill = document.getElementById('pdfStartDatePill');
  if(pdfStartDatePill){
    pdfStartDatePill.addEventListener('click', () => {
      openCustomCalendar({
        selectedDate: document.getElementById('pdfStartDate').value || toLocalDateStr(new Date().toISOString()),
        title: 'Select Start Date',
        onSelect: (chosenDate) => {
          document.getElementById('pdfStartDate').value = chosenDate;
          updatePdfDatePillLabels();
          updatePdfPreview();
        }
      });
    });
  }

  const pdfEndDatePill = document.getElementById('pdfEndDatePill');
  if(pdfEndDatePill){
    pdfEndDatePill.addEventListener('click', () => {
      openCustomCalendar({
        selectedDate: document.getElementById('pdfEndDate').value || toLocalDateStr(new Date().toISOString()),
        title: 'Select End Date',
        onSelect: (chosenDate) => {
          document.getElementById('pdfEndDate').value = chosenDate;
          updatePdfDatePillLabels();
          updatePdfPreview();
        }
      });
    });
  }

  function closePdfModal(){
    pdfExportOverlay.classList.remove('show');
  }

  const downloadPdfBtn = document.getElementById('downloadPdfBtn');
  if(downloadPdfBtn) downloadPdfBtn.addEventListener('click', openPdfModal);
  const pdfFab = document.getElementById('pdfFab');
  if(pdfFab) pdfFab.addEventListener('click', openPdfModal);
  pdfCancelBtn.addEventListener('click', closePdfModal);
  pdfExportOverlay.addEventListener('click', (e) => {
    if(e.target === pdfExportOverlay) closePdfModal();
  });

  document.querySelectorAll('.pdf-preset-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.pdf-preset-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentPdfPreset = chip.dataset.range;
      if(currentPdfPreset === 'custom'){
        pdfCustomDates.style.display = 'block';
        updatePdfDatePillLabels();
      } else {
        pdfCustomDates.style.display = 'none';
      }
      updatePdfPreview();
    });
  });

  pdfStartDate.addEventListener('change', () => {
    updatePdfDatePillLabels();
    updatePdfPreview();
  });
  pdfEndDate.addEventListener('change', () => {
    updatePdfDatePillLabels();
    updatePdfPreview();
  });

  document.querySelectorAll('.pdf-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pdf-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentPdfType = btn.dataset.type;
      updatePdfPreview();
    });
  });

  pdfGenerateBtn.addEventListener('click', executePdfExport);

  function executePdfExport(){
    const list = getFilteredPdfEntries();
    if(list.length === 0){
      alert('No transactions found for the selected date range and filter.');
      return;
    }

    const { label: dateRangeLabel } = getPdfDateRange(currentPdfPreset);
    const typeLabel = currentPdfType === 'all' ? 'All Transactions' : currentPdfType === 'received' ? 'Money Received' : 'Money Spent';

    let totalRec = 0, totalSp = 0;
    list.forEach(e => {
      if(e.type === 'received') totalRec += Number(e.amount);
      else totalSp += Number(e.amount);
    });

    pdfGenerateBtn.disabled = true;
    pdfGenerateBtn.textContent = 'Generating PDF...';

    setTimeout(() => {
      try {
        const jsPDFClass = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
        if(!jsPDFClass){
          // Fallback to hidden iframe print if jsPDF is unavailable
          printStatementFallback(list, dateRangeLabel, typeLabel, totalRec, totalSp);
          closePdfModal();
          pdfGenerateBtn.disabled = false;
          pdfGenerateBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download PDF`;
          return;
        }

        const doc = new jsPDFClass({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const now = new Date();
        const genDate = now.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
        const genTime = now.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });

        // ─── Header: Monochrome Clean Printable Style ───
        // Top black bar
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.7);
        doc.line(14, 12, pageW - 14, 12);

        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text('PAISA HISAAB', 14, 19);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(70, 70, 70);
        doc.text('ACCOUNT STATEMENT  |  PRINT EDITION', 14, 24);

        // Right side metadata
        doc.setFontSize(8);
        doc.setTextColor(40, 40, 40);
        doc.text('Statement Period: ' + dateRangeLabel, pageW - 14, 18, { align: 'right' });
        doc.text('Generated: ' + genDate + ' at ' + genTime, pageW - 14, 22.5, { align: 'right' });
        doc.text('Filter: ' + typeLabel + ' (' + list.length + ' entries)', pageW - 14, 27, { align: 'right' });

        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.3);
        doc.line(14, 30, pageW - 14, 30);

        // ─── Summary Ledger Box (Black & White Bordered Cards) ───
        const summaryY = 34;
        const gap = 4;
        const cardW = (pageW - 28 - (gap * 2)) / 3;

        // Box 1: Total Received
        doc.setDrawColor(40, 40, 40);
        doc.setLineWidth(0.3);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(14, summaryY, cardW, 16, 2, 2, 'FD');
        doc.setTextColor(60, 60, 60);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.text('TOTAL RECEIVED', 14 + cardW/2, summaryY + 5.5, { align: 'center' });
        doc.setFontSize(10.5);
        doc.setTextColor(0, 0, 0);
        doc.text(formatPdfRupee(totalRec), 14 + cardW/2, summaryY + 12.5, { align: 'center' });

        // Box 2: Total Spent
        const spX = 14 + cardW + gap;
        doc.roundedRect(spX, summaryY, cardW, 16, 2, 2, 'FD');
        doc.setTextColor(60, 60, 60);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.text('TOTAL SPENT', spX + cardW/2, summaryY + 5.5, { align: 'center' });
        doc.setFontSize(10.5);
        doc.setTextColor(0, 0, 0);
        doc.text(formatPdfRupee(totalSp), spX + cardW/2, summaryY + 12.5, { align: 'center' });

        // Box 3: Net Balance
        const balX = spX + cardW + gap;
        const bal = totalRec - totalSp;
        doc.roundedRect(balX, summaryY, cardW, 16, 2, 2, 'FD');
        doc.setTextColor(60, 60, 60);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.text('NET BALANCE', balX + cardW/2, summaryY + 5.5, { align: 'center' });
        doc.setFontSize(10.5);
        doc.setTextColor(0, 0, 0);
        doc.text((bal >= 0 ? '+ ' : '- ') + formatPdfRupee(Math.abs(bal)), balX + cardW/2, summaryY + 12.5, { align: 'center' });

        // ─── Table Structure (Monochrome & High Legibility) ───
        const bodyData = [];
        let lastDatePdf = null;

        list.forEach(e => {
          const entryDate = toLocalDateStr(e.when);
          if(entryDate !== lastDatePdf){
            lastDatePdf = entryDate;
            const parts = entryDate.split('-');
            const dd = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
            const dayLabel = dd.toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'short', year:'numeric' }).toUpperCase();
            bodyData.push([{
              content: '─── ' + dayLabel + ' ───',
              colSpan: 5,
              styles: {
                fillColor: [240, 240, 240],
                textColor: [30, 30, 30],
                fontStyle: 'bold',
                fontSize: 8.5,
                halign: 'center',
                cellPadding: { top: 2.5, bottom: 2.5 }
              }
            }]);
          }

          const d = new Date(e.when);
          const dateFormatted = d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
          const timeFormatted = d.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });
          const dateTimeStr = dateFormatted + '\n' + timeFormatted;
          const sign = e.type === 'received' ? '+' : '-';
          const typeStr = e.type === 'received' ? 'RECEIVED' : 'SPENT';
          const amountStr = sign + ' ' + formatPdfRupee(e.amount);

          bodyData.push([
            dateTimeStr,
            e.name,
            e.reason || '—',
            { content: typeStr, styles: { halign: 'center', fontSize: 7.5, fontStyle: 'bold' } },
            { content: amountStr, styles: { halign: 'right', fontStyle: 'bold', textColor: [0, 0, 0] } }
          ]);
        });

        doc.autoTable({
          startY: summaryY + 22,
          head: [['Date & Time', 'Name / Party', 'Reason / Particulars', 'Type', 'Amount']],
          body: bodyData,
          theme: 'grid',
          headStyles: {
            fillColor: [230, 230, 230],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            fontSize: 9,
            cellPadding: 3.5,
            lineColor: [80, 80, 80],
            lineWidth: 0.3
          },
          styles: {
            fontSize: 8.5,
            cellPadding: 3,
            lineColor: [200, 200, 200],
            lineWidth: 0.25,
            textColor: [20, 20, 20],
            overflow: 'linebreak'
          },
          alternateRowStyles: {
            fillColor: [252, 252, 252]
          },
          columnStyles: {
            0: { cellWidth: 32, fontSize: 8 },
            1: { cellWidth: 40, fontStyle: 'bold' },
            2: { cellWidth: 'auto' },
            3: { cellWidth: 22, halign: 'center' },
            4: { cellWidth: 34, halign: 'right' }
          },
          margin: { left: 14, right: 14, bottom: 18 },
          didDrawPage: function(data){
            // Footer on every page
            doc.setFontSize(8);
            doc.setTextColor(110, 110, 110);
            doc.setDrawColor(180, 180, 180);
            doc.setLineWidth(0.3);
            doc.line(14, pageH - 12, pageW - 14, pageH - 12);
            doc.text('Paisa Hisaab — Personal Account Statement', 14, pageH - 7);
            doc.text('* Computer Generated Statement *', pageW / 2, pageH - 7, { align: 'center' });
            doc.text('Page ' + data.pageNumber, pageW - 14, pageH - 7, { align: 'right' });
          }
        });

        // Update total pages in footer
        const totalPages = doc.internal.getNumberOfPages();
        for(let i = 1; i <= totalPages; i++){
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setTextColor(110, 110, 110);
          doc.setFillColor(255, 255, 255);
          doc.rect(pageW - 35, pageH - 10, 25, 5, 'F');
          doc.text('Page ' + i + ' of ' + totalPages, pageW - 14, pageH - 7, { align: 'right' });
        }

        const dateTag = now.getFullYear() + String(now.getMonth()+1).padStart(2,'0') + String(now.getDate()).padStart(2,'0');
        const fileName = 'PaisaHisaab_Statement_' + dateTag + '.pdf';
        doc.save(fileName);
        closePdfModal();
      } catch(err) {
        console.error('jsPDF generation failed, using print fallback:', err);
        printStatementFallback(list, dateRangeLabel, typeLabel, totalRec, totalSp);
        closePdfModal();
      } finally {
        pdfGenerateBtn.disabled = false;
        pdfGenerateBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download PDF`;
      }
    }, 100);
  }

  function printStatementFallback(list, dateRangeLabel, typeLabel, totalRec, totalSp){
    const now = new Date();
    const genDate = now.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
    const genTime = now.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });
    const net = totalRec - totalSp;

    let rowsHtml = '';
    let lastDate = null;
    list.forEach(e => {
      const entryDate = toLocalDateStr(e.when);
      if(entryDate !== lastDate){
        lastDate = entryDate;
        const parts = entryDate.split('-');
        const dd = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        const dayLabel = dd.toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'short', year:'numeric' }).toUpperCase();
        rowsHtml += `<tr class="date-header-row"><td colspan="5">─── ${escapeHtml(dayLabel)} ───</td></tr>`;
      }
      const d = new Date(e.when);
      const dt = d.toLocaleDateString('en-IN', { day:'2-digit', month:'short' }) + ' ' + d.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });
      const sign = e.type === 'received' ? '+' : '-';
      rowsHtml += `
        <tr>
          <td>${dt}</td>
          <td style="font-weight:600;">${escapeHtml(e.name)}</td>
          <td>${escapeHtml(e.reason || '—')}</td>
          <td style="text-align:center; font-weight:bold; font-size:11px;">${e.type === 'received' ? 'RECEIVED' : 'SPENT'}</td>
          <td style="text-align:right; font-weight:bold;">${sign} ${formatPdfRupee(e.amount)}</td>
        </tr>
      `;
    });

    // Use a hidden iframe so about:blank NEVER opens in browser
    let printFrame = document.getElementById('paisaHiddenPrintFrame');
    if(printFrame) printFrame.remove();
    printFrame = document.createElement('iframe');
    printFrame.id = 'paisaHiddenPrintFrame';
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    printFrame.style.visibility = 'hidden';
    document.body.appendChild(printFrame);

    const fDoc = printFrame.contentDocument || printFrame.contentWindow.document;
    fDoc.open();
    fDoc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Paisa Hisaab - Statement</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #000; margin: 0; padding: 0; }
          .header { border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 15px; display:flex; justify-content:space-between; align-items:flex-end; }
          .header h1 { margin:0; font-size:22px; }
          .header .sub { font-size:11px; color:#555; text-transform:uppercase; margin-top:3px; }
          .header .meta { text-align:right; font-size:11px; color:#333; line-height:1.4; }
          .summary { display:flex; gap:12px; margin-bottom:20px; }
          .summary-box { flex:1; border:1px solid #000; padding:8px 12px; border-radius:4px; text-align:center; }
          .summary-box .lbl { font-size:10px; font-weight:bold; color:#555; }
          .summary-box .val { font-size:15px; font-weight:bold; margin-top:4px; }
          table { width:100%; border-collapse:collapse; font-size:12px; margin-bottom:20px; }
          th, td { border:1px solid #ccc; padding:6px 8px; text-align:left; }
          th { background:#e5e5e5; font-weight:bold; border-color:#888; }
          .date-header-row td { background:#f0f0f0; font-weight:bold; text-align:center; font-size:11px; padding:5px; border-color:#888; }
          .footer { border-top:1px solid #888; padding-top:6px; font-size:10px; color:#666; display:flex; justify-content:space-between; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>PAISA HISAAB</h1>
            <div class="sub">Personal Account Statement (Print Edition)</div>
          </div>
          <div class="meta">
            <div><strong>Period:</strong> ${escapeHtml(dateRangeLabel)}</div>
            <div><strong>Generated:</strong> ${genDate} ${genTime}</div>
            <div><strong>Filter:</strong> ${escapeHtml(typeLabel)} (${list.length} entries)</div>
          </div>
        </div>
        <div class="summary">
          <div class="summary-box">
            <div class="lbl">TOTAL RECEIVED</div>
            <div class="val">${formatPdfRupee(totalRec)}</div>
          </div>
          <div class="summary-box">
            <div class="lbl">TOTAL SPENT</div>
            <div class="val">${formatPdfRupee(totalSp)}</div>
          </div>
          <div class="summary-box">
            <div class="lbl">NET BALANCE</div>
            <div class="val">${(net >= 0 ? '+ ' : '- ') + formatPdfRupee(Math.abs(net))}</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width:120px;">Date & Time</th>
              <th>Name / Party</th>
              <th>Reason / Particulars</th>
              <th style="width:80px; text-align:center;">Type</th>
              <th style="width:110px; text-align:right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <div class="footer">
          <div>Paisa Hisaab — Personal Account Statement</div>
          <div>* Computer Generated Statement *</div>
        </div>
      </body>
      </html>
    `);
    fDoc.close();

    setTimeout(() => {
      try {
        printFrame.contentWindow.focus();
        printFrame.contentWindow.print();
      } catch(e) {
        console.error('Print frame error:', e);
      }
    }, 250);
  }

  // ── Bottom Navbar Logic ──
  const fabBtn = document.getElementById('openSheet');
  const navItems = document.querySelectorAll('.nav-item[data-nav]');
  const tabOrder = { 'home': 0, 'transactions': 1, 'settings': 2 };
  let activeTab = 'home';
  let isTabAnimating = false;

  function switchTab(newTab){
    if(newTab === activeTab || isTabAnimating) return;
    const prevTab = activeTab;
    const isGoingRight = tabOrder[newTab] > tabOrder[prevTab];
    activeTab = newTab;
    isTabAnimating = true;

    if(newTab !== 'home'){
      ensureNavHistory();
    }

    navItems.forEach(n => n.classList.toggle('active', n.dataset.nav === newTab));

    // Close any open subpages immediately
    backupSubpage.className = 'settings-subpage';
    cloudSyncSubpage.className = 'settings-subpage';
    if(syncAdvSubpage) syncAdvSubpage.className = 'settings-subpage';

    const overlayMap = {
      'transactions': txnListOverlay,
      'settings': settingsOverlay
    };

    const prevOverlay = overlayMap[prevTab];
    const newOverlay = overlayMap[newTab];

    const clearFab = document.getElementById('clearAllFab');
    const pdfFabBtn = document.getElementById('pdfFab');
    if(newTab === 'home'){
      fabBtn.style.display = 'flex';
      if(clearFab) clearFab.style.display = 'none';
      if(pdfFabBtn) pdfFabBtn.style.display = 'none';
      if(prevOverlay){
        prevOverlay.className = (prevTab === 'transactions' ? 'txn-list-overlay show slide-out-right' : 'settings-overlay show slide-out-right');
        setTimeout(() => {
          prevOverlay.className = (prevTab === 'transactions' ? 'txn-list-overlay' : 'settings-overlay');
          isTabAnimating = false;
        }, 150);
      } else {
        isTabAnimating = false;
      }
    } else {
      fabBtn.style.display = 'none';
      if(newTab === 'settings'){
        if(clearFab) clearFab.style.display = entries.length > 0 ? 'flex' : 'none';
        if(pdfFabBtn) pdfFabBtn.style.display = 'none';
        resetBackupSheet();
        updateSecuritySettingsUI();
      } else if(newTab === 'transactions'){
        if(clearFab) clearFab.style.display = 'none';
        if(pdfFabBtn) pdfFabBtn.style.display = 'flex';
        txnListFilter = 'all';
        document.querySelectorAll('.txn-filter-chip').forEach(c => c.classList.remove('active'));
        document.querySelector('.txn-filter-chip[data-txnf="all"]').classList.add('active');
        if(txnReasonSearchInput){
          txnReasonSearchInput.value = '';
          txnReasonSearchQuery = '';
          if(txnReasonSearchClear) txnReasonSearchClear.style.display = 'none';
        }
        renderTxnList();
      }

      if(prevTab === 'home'){
        newOverlay.className = (newTab === 'transactions' ? 'txn-list-overlay show slide-in-right' : 'settings-overlay show slide-in-right');
        setTimeout(() => {
          newOverlay.className = (newTab === 'transactions' ? 'txn-list-overlay show' : 'settings-overlay show');
          isTabAnimating = false;
        }, 150);
      } else {
        // Switching between transactions and settings — prevent any home screen flash
        if(isGoingRight){
          prevOverlay.style.zIndex = '80';
          newOverlay.style.zIndex = '82';
          newOverlay.className = 'settings-overlay show slide-in-right';
          setTimeout(() => {
            prevOverlay.className = 'txn-list-overlay';
            prevOverlay.style.zIndex = '';
            newOverlay.className = 'settings-overlay show';
            newOverlay.style.zIndex = '';
            isTabAnimating = false;
          }, 150);
        } else {
          newOverlay.style.zIndex = '80';
          newOverlay.className = 'txn-list-overlay show';
          prevOverlay.style.zIndex = '82';
          prevOverlay.className = 'settings-overlay show slide-out-right';
          setTimeout(() => {
            prevOverlay.className = 'settings-overlay';
            prevOverlay.style.zIndex = '';
            newOverlay.className = 'txn-list-overlay show';
            newOverlay.style.zIndex = '';
            isTabAnimating = false;
          }, 150);
        }
      }
    }
  }

  // ── Settings Subpages Navigation ──
  const backupSubpage = document.getElementById('backupSubpageOverlay');
  const cloudSyncSubpage = document.getElementById('cloudSyncSubpageOverlay');
  const syncAdvSubpage = document.getElementById('syncAdvancedSubpageOverlay');

  document.getElementById('openBackupSubpageBtn').addEventListener('click', () => {
    backupSubpage.className = 'settings-subpage show slide-in-right';
    ensureNavHistory();
    setTimeout(() => { backupSubpage.className = 'settings-subpage show'; }, 150);
  });
  document.getElementById('closeBackupSubpageBtn').addEventListener('click', () => {
    backupSubpage.className = 'settings-subpage show slide-out-right';
    setTimeout(() => { backupSubpage.className = 'settings-subpage'; }, 150);
  });

  document.getElementById('openCloudSyncSubpageBtn').addEventListener('click', () => {
    resetBackupSheet();
    const cfg = loadSyncConfig();
    if(cfg.gistId) document.getElementById('gistId').value = cfg.gistId;
    if(cfg.token) document.getElementById('gistToken').value = cfg.token;
    if(cfg.deviceName) document.getElementById('deviceName').value = cfg.deviceName;
    if(document.getElementById('autoCheckCloudOnOpen')) document.getElementById('autoCheckCloudOnOpen').checked = cfg.autoCheckOnOpen !== false;
    if(document.getElementById('autoPushOnSave')) document.getElementById('autoPushOnSave').checked = cfg.autoPushOnSave !== false;
    updateSubpageStateCard();
    checkCloudStatus(false, true);
    cloudSyncSubpage.className = 'settings-subpage show slide-in-right';
    ensureNavHistory();
    setTimeout(() => { cloudSyncSubpage.className = 'settings-subpage show'; }, 150);
  });
  document.getElementById('closeCloudSyncSubpageBtn').addEventListener('click', () => {
    cloudSyncSubpage.className = 'settings-subpage show slide-out-right';
    setTimeout(() => { cloudSyncSubpage.className = 'settings-subpage'; }, 150);
  });

  document.getElementById('openSyncAdvancedSubpageBtn').addEventListener('click', () => {
    syncAdvSubpage.className = 'settings-subpage show slide-in-right';
    ensureNavHistory();
    setTimeout(() => { syncAdvSubpage.className = 'settings-subpage show'; }, 150);
  });
  document.getElementById('closeSyncAdvancedSubpageBtn').addEventListener('click', () => {
    syncAdvSubpage.className = 'settings-subpage show slide-out-right';
    setTimeout(() => { syncAdvSubpage.className = 'settings-subpage'; }, 150);
  });

  navItems.forEach(item => {
    item.addEventListener('click', () => switchTab(item.dataset.nav));
  });

  // ── Global Popstate (Hardware & Gesture Back Button) ──
  window.addEventListener('popstate', () => {
    // 1. Confirm dialog
    const confirmOverlay = document.getElementById('confirmOverlay');
    if(confirmOverlay && confirmOverlay.classList.contains('show')){
      const cancelBtn = document.getElementById('confirmCancelBtn');
      if(cancelBtn) cancelBtn.click();
      if(hasAnyOpenOverlay()) history.pushState({ paisaNav: true }, '');
      return;
    }

    // 2. PIN dialog
    const pinOverlay = document.getElementById('pinOverlay');
    if(pinOverlay && pinOverlay.classList.contains('show')){
      if(getStoredPinHash()){
        pinOverlay.classList.remove('show');
        pinValue = '';
        pendingNewPin = '';
        updatePinDots();
        const cb = pinCallbacks;
        pinCallbacks = null;
        if(cb && cb.onCancel) cb.onCancel();
      }
      if(hasAnyOpenOverlay()) history.pushState({ paisaNav: true }, '');
      return;
    }

    // 3. Add/Edit entry sheet
    const overlay = document.getElementById('overlay');
    if(overlay && overlay.classList.contains('show')){
      overlay.classList.remove('show');
      resetToAddMode();
      if(hasAnyOpenOverlay()) history.pushState({ paisaNav: true }, '');
      return;
    }

    // 4. Entry detail sheet
    const detailOverlay = document.getElementById('detailOverlay');
    if(detailOverlay && detailOverlay.classList.contains('show')){
      detailOverlay.classList.remove('show');
      if(hasAnyOpenOverlay()) history.pushState({ paisaNav: true }, '');
      return;
    }

    // 4b. PDF Export Sheet
    const pdfExportOverlay = document.getElementById('pdfExportOverlay');
    if(pdfExportOverlay && pdfExportOverlay.classList.contains('show')){
      pdfExportOverlay.classList.remove('show');
      if(hasAnyOpenOverlay()) history.pushState({ paisaNav: true }, '');
      return;
    }

    // 4c. Date & Time Sheet
    const dateTimeOverlay = document.getElementById('dateTimeOverlay');
    if(dateTimeOverlay && dateTimeOverlay.classList.contains('show')){
      dateTimeOverlay.classList.remove('show');
      if(hasAnyOpenOverlay()) history.pushState({ paisaNav: true }, '');
      return;
    }

    // 4cc. Custom Calendar Sheet
    const customCalendarOverlay = document.getElementById('customCalendarOverlay');
    if(customCalendarOverlay && customCalendarOverlay.classList.contains('show')){
      customCalendarOverlay.classList.remove('show');
      if(hasAnyOpenOverlay()) history.pushState({ paisaNav: true }, '');
      return;
    }

    // 4d. Advanced Sync subpage
    if(syncAdvSubpage && syncAdvSubpage.classList.contains('show')){
      syncAdvSubpage.className = 'settings-subpage show slide-out-right';
      setTimeout(() => { syncAdvSubpage.className = 'settings-subpage'; }, 150);
      if(hasAnyOpenOverlay()) history.pushState({ paisaNav: true }, '');
      return;
    }

    // 5. Cloud Sync subpage
    const cloudSyncSubpage = document.getElementById('cloudSyncSubpageOverlay');
    if(cloudSyncSubpage && cloudSyncSubpage.classList.contains('show')){
      cloudSyncSubpage.className = 'settings-subpage show slide-out-right';
      setTimeout(() => { cloudSyncSubpage.className = 'settings-subpage'; }, 150);
      if(hasAnyOpenOverlay()) history.pushState({ paisaNav: true }, '');
      return;
    }

    // 6. Backup subpage
    const backupSubpage = document.getElementById('backupSubpageOverlay');
    if(backupSubpage && backupSubpage.classList.contains('show')){
      backupSubpage.className = 'settings-subpage show slide-out-right';
      setTimeout(() => { backupSubpage.className = 'settings-subpage'; }, 150);
      if(hasAnyOpenOverlay()) history.pushState({ paisaNav: true }, '');
      return;
    }

    // 7. Tabs: If on transactions or settings, go to home
    if(activeTab !== 'home'){
      switchTab('home');
      return;
    }
  });

  loadEntries();

  // Initialize Smart Cloud Sync
  const initSyncCfg = loadSyncConfig();
  if(initSyncCfg.gistId) document.getElementById('gistId').value = initSyncCfg.gistId;
  if(initSyncCfg.token) document.getElementById('gistToken').value = initSyncCfg.token;
  if(initSyncCfg.deviceName) document.getElementById('deviceName').value = initSyncCfg.deviceName;
  if(document.getElementById('autoCheckCloudOnOpen')) document.getElementById('autoCheckCloudOnOpen').checked = initSyncCfg.autoCheckOnOpen !== false;
  if(document.getElementById('autoPushOnSave')) document.getElementById('autoPushOnSave').checked = initSyncCfg.autoPushOnSave !== false;
  updateSyncBadgeUI();
  updateSubpageStateCard();
  updateSyncLastText();

  if(initSyncCfg.gistId && initSyncCfg.token && initSyncCfg.autoCheckOnOpen !== false){
    checkCloudStatus(true, true);
  }

  window.addEventListener('focus', () => {
    const cfg = loadSyncConfig();
    if(cfg.gistId && cfg.token && cfg.autoCheckOnOpen !== false) checkCloudStatus(true, true);
  });
  document.addEventListener('visibilitychange', () => {
    if(document.visibilityState === 'visible'){
      const cfg = loadSyncConfig();
      if(cfg.gistId && cfg.token && cfg.autoCheckOnOpen !== false) checkCloudStatus(true, true);
    }
  });
  window.addEventListener('online', () => {
    const cfg = loadSyncConfig();
    if(cfg.gistId && cfg.token) checkCloudStatus(true, true);
  });

  // Initialize Security UI
  updateSecuritySettingsUI();

  // Disable browser context menus / Touch to Search popups on non-input elements
  document.addEventListener('contextmenu', (e) => {
    if(e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA'){
      e.preventDefault();
    }
  });

  if('serviceWorker' in navigator){
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }