;(function () {
  'use strict'

  // ─── State ─────────────────────────────────────────────────────────────────

  let shell
  let navigateTo
  let container
  let currentYear  = new Date().getFullYear()
  let currentMonth = new Date().getMonth() + 1   // 1-based
  let monthData    = { events: [], items: [] }
  let selectedDate = null
  let showForm     = false
  let editingEvent = null

  const TODAY = new Date().toISOString().slice(0, 10)

  // ─── Helpers ───────────────────────────────────────────────────────────────

  function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') }

  function pad(n) { return String(n).padStart(2, '0') }

  function monthLabel(y, m) {
    return new Date(y, m - 1, 1).toLocaleString('en', { month: 'long', year: 'numeric' })
  }

  function prevMonth() {
    if (currentMonth === 1) { currentYear--; currentMonth = 12 }
    else currentMonth--
  }

  function nextMonth() {
    if (currentMonth === 12) { currentYear++; currentMonth = 1 }
    else currentMonth++
  }

  // All events + items flattened for a given YYYY-MM-DD
  function itemsForDate(date) {
    const events = monthData.events.filter(e => {
      if (e.recur_yearly) return e.date.slice(5) === date.slice(5)
      return e.date === date
    })
    const modItems = []
    for (const src of (monthData.items || [])) {
      for (const it of (src.items || [])) {
        if (it.date === date) modItems.push({ ...it, _source: src.source })
      }
    }
    return { events, modItems }
  }

  // Build a map: dateStr → { eventCount, itemCount } for dot rendering
  function buildDotMap() {
    const map = {}
    const mm = `${currentYear}-${pad(currentMonth)}`

    for (const e of monthData.events) {
      let date = e.date
      if (e.recur_yearly) date = `${currentYear}-${e.date.slice(5)}`
      if (date.startsWith(mm)) {
        if (!map[date]) map[date] = { eventCount: 0, itemCount: 0 }
        map[date].eventCount++
      }
    }
    for (const src of (monthData.items || [])) {
      for (const it of (src.items || [])) {
        if (it.date.startsWith(mm)) {
          if (!map[it.date]) map[it.date] = { eventCount: 0, itemCount: 0 }
          map[it.date].itemCount++
        }
      }
    }
    return map
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  function render() {
    const dotMap     = buildDotMap()
    const firstDay   = new Date(currentYear, currentMonth - 1, 1).getDay()  // 0=Sun
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate()
    const mm         = `${currentYear}-${pad(currentMonth)}`

    // Build grid cells
    let cells = ''
    for (let i = 0; i < firstDay; i++) {
      cells += `<div class="cal-cell cal-cell--empty"></div>`
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const date    = `${mm}-${pad(d)}`
      const isToday = date === TODAY
      const isSel   = date === selectedDate
      const dots    = dotMap[date] || { eventCount: 0, itemCount: 0 }
      const total   = dots.eventCount + dots.itemCount

      let dotHtml = ''
      if (total > 0) {
        const shown = Math.min(total, 3)
        for (let k = 0; k < shown; k++) {
          const isEvent = k < dots.eventCount
          dotHtml += `<span class="cal-dot ${isEvent ? 'cal-dot--event' : 'cal-dot--item'}"></span>`
        }
        if (total > 3) dotHtml += `<span class="cal-dot-more">+${total - 3}</span>`
      }

      cells += `
        <div class="cal-cell ${isToday ? 'cal-cell--today' : ''} ${isSel ? 'cal-cell--selected' : ''}"
             data-date="${date}">
          <span class="cal-day-num">${d}</span>
          <div class="cal-dots">${dotHtml}</div>
        </div>`
    }

    // Detail panel
    let detailHtml = ''
    if (selectedDate) {
      const { events, modItems } = itemsForDate(selectedDate)
      const hasItems = events.length > 0 || modItems.length > 0

      let formHtml = ''
      if (showForm) {
        const ev = editingEvent
        formHtml = `
          <div class="cal-form">
            <input id="cf-title"   class="cal-input" placeholder="Title" value="${esc(ev?.title || '')}" />
            <div class="cal-form-row">
              <input id="cf-date" class="cal-input" type="date" value="${esc(ev?.date || selectedDate)}" />
              <select id="cf-type" class="cal-input">
                ${['reminder','event','milestone'].map(t =>
                  `<option value="${t}" ${(ev?.type||'reminder')===t?'selected':''}>${t}</option>`
                ).join('')}
              </select>
            </div>
            <label class="cal-check-label">
              <input id="cf-recur" type="checkbox" ${ev?.recur_yearly ? 'checked' : ''} />
              Repeat yearly
            </label>
            <textarea id="cf-notes" class="cal-input cal-textarea" placeholder="Notes">${esc(ev?.notes || '')}</textarea>
            <div class="cal-form-actions">
              <button id="cf-save"   class="cal-btn cal-btn--primary">${ev ? 'Save' : 'Add event'}</button>
              <button id="cf-cancel" class="cal-btn cal-btn--ghost">Cancel</button>
            </div>
          </div>`
      }

      detailHtml = `
        <div class="cal-detail">
          <div class="cal-detail-header">
            <span class="cal-detail-date">${selectedDate}</span>
            ${!showForm ? `<button id="cd-add" class="cal-btn cal-btn--primary" style="font-size:12px;padding:4px 10px">+ Add</button>` : ''}
          </div>
          ${formHtml}
          ${!hasItems && !showForm ? `<p class="cal-empty">Nothing scheduled.</p>` : ''}
          ${events.map(e => `
            <div class="cal-event-row">
              <div class="cal-event-dot" style="background:var(--accent)"></div>
              <div class="cal-event-body">
                <div class="cal-event-title">${esc(e.title)}</div>
                ${e.notes ? `<div class="cal-event-meta">${esc(e.notes)}</div>` : ''}
                <div class="cal-event-meta">
                  <span class="cal-tag">${esc(e.type)}</span>
                  ${e.recur_yearly ? '<span class="cal-tag">Yearly</span>' : ''}
                </div>
              </div>
              <button class="cal-icon-btn cal-edit-btn" data-id="${e.id}" title="Edit">✎</button>
              <button class="cal-icon-btn cal-del-btn"  data-id="${e.id}" title="Delete">✕</button>
            </div>`).join('')}
          ${modItems.map(it => `
            <div class="cal-event-row${it._source ? ' cal-mod-row' : ''}"
                 ${it._source ? `data-slug="${esc(it._source)}"` : ''}
                 style="${it._source ? 'cursor:pointer' : ''}">
              <div class="cal-event-dot" style="background:var(--muted)"></div>
              <div class="cal-event-body">
                <div class="cal-event-title">${esc(it.title)}</div>
                <div class="cal-event-meta"><span class="cal-tag">${esc(it._source)}</span></div>
              </div>
            </div>`).join('')}
        </div>`
    }

    container.innerHTML = `
      <style>
        .cal-wrap { max-width:720px; margin:0 auto; padding:16px; font-family:system-ui,sans-serif; }
        .cal-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
        .cal-nav-btn { background:none; border:none; color:var(--accent,#6366f1); font-size:22px; cursor:pointer; padding:4px 8px; border-radius:6px; }
        .cal-nav-btn:hover { background:rgba(99,102,241,.1); }
        .cal-month-label { font-size:16px; font-weight:700; color:var(--text,#f1f5f9); }
        .cal-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:3px; margin-bottom:16px; }
        .cal-dow { text-align:center; font-size:11px; font-weight:600; color:var(--muted,#94a3b8); padding:4px 0; text-transform:uppercase; letter-spacing:.04em; }
        .cal-cell { min-height:56px; background:var(--surface,#1e293b); border-radius:8px; padding:6px 4px 4px; cursor:pointer; transition:background .12s; display:flex; flex-direction:column; align-items:center; }
        .cal-cell:hover { background:var(--surface2,#263044); }
        .cal-cell--empty { background:transparent; cursor:default; }
        .cal-cell--today .cal-day-num { background:var(--accent,#6366f1); color:#fff; border-radius:50%; width:24px; height:24px; display:flex; align-items:center; justify-content:center; }
        .cal-cell--selected { background:var(--surface2,#263044); outline:2px solid var(--accent,#6366f1); }
        .cal-day-num { font-size:13px; font-weight:500; color:var(--text,#f1f5f9); line-height:1; margin-bottom:4px; width:24px; height:24px; display:flex; align-items:center; justify-content:center; }
        .cal-dots { display:flex; gap:2px; align-items:center; flex-wrap:wrap; justify-content:center; }
        .cal-dot { width:5px; height:5px; border-radius:50%; flex-shrink:0; }
        .cal-dot--event { background:var(--accent,#6366f1); }
        .cal-dot--item  { background:var(--muted,#94a3b8); }
        .cal-dot-more { font-size:9px; color:var(--muted,#94a3b8); line-height:1; }
        .cal-detail { background:var(--surface,#1e293b); border-radius:12px; padding:14px; }
        .cal-detail-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
        .cal-detail-date { font-size:14px; font-weight:600; color:var(--text,#f1f5f9); }
        .cal-empty { color:var(--muted,#94a3b8); font-size:13px; padding:8px 0; }
        .cal-event-row { display:flex; align-items:flex-start; gap:10px; padding:8px 0; border-top:1px solid var(--border,#334155); }
        .cal-event-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; margin-top:4px; }
        .cal-event-body { flex:1; min-width:0; }
        .cal-event-title { font-size:14px; color:var(--text,#f1f5f9); font-weight:500; }
        .cal-event-meta { font-size:12px; color:var(--muted,#94a3b8); margin-top:2px; display:flex; gap:4px; flex-wrap:wrap; }
        .cal-tag { background:var(--surface2,#263044); padding:1px 6px; border-radius:4px; }
        .cal-icon-btn { background:none; border:none; color:var(--muted,#94a3b8); cursor:pointer; padding:4px; font-size:13px; border-radius:4px; flex-shrink:0; }
        .cal-icon-btn:hover { color:var(--text,#f1f5f9); background:var(--surface2,#263044); }
        .cal-form { padding:10px 0 4px; border-top:1px solid var(--border,#334155); display:flex; flex-direction:column; gap:8px; }
        .cal-form-row { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
        .cal-input { width:100%; padding:7px 10px; background:var(--bg,#0f172a); border:1px solid var(--border,#334155); border-radius:7px; color:var(--text,#f1f5f9); font-size:13px; box-sizing:border-box; }
        .cal-input:focus { outline:none; border-color:var(--accent,#6366f1); }
        .cal-textarea { min-height:60px; resize:vertical; }
        .cal-check-label { display:flex; align-items:center; gap:6px; font-size:13px; color:var(--muted,#94a3b8); cursor:pointer; }
        .cal-form-actions { display:flex; gap:8px; }
        .cal-btn { padding:7px 16px; border-radius:7px; border:none; cursor:pointer; font-size:13px; font-weight:600; transition:opacity .15s; }
        .cal-btn--primary { background:var(--accent,#6366f1); color:#fff; }
        .cal-btn--primary:hover { opacity:.85; }
        .cal-btn--ghost { background:var(--surface2,#263044); color:var(--muted,#94a3b8); }
        .cal-btn--ghost:hover { color:var(--text,#f1f5f9); }
        @media (max-width:480px) { .cal-cell { min-height:44px; } .cal-form-row { grid-template-columns:1fr; } }
      </style>
      <div class="cal-wrap">
        <div class="cal-header">
          <button class="cal-nav-btn" id="cal-prev">‹</button>
          <span class="cal-month-label">${esc(monthLabel(currentYear, currentMonth))}</span>
          <button class="cal-nav-btn" id="cal-next">›</button>
        </div>
        <div class="cal-grid">
          ${['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => `<div class="cal-dow">${d}</div>`).join('')}
          ${cells}
        </div>
        ${detailHtml}
      </div>`

    attachHandlers()
  }

  // ─── Handlers ──────────────────────────────────────────────────────────────

  function attachHandlers() {
    document.getElementById('cal-prev').addEventListener('click', async () => {
      prevMonth(); selectedDate = null; showForm = false; editingEvent = null
      await loadMonth(); render()
    })
    document.getElementById('cal-next').addEventListener('click', async () => {
      nextMonth(); selectedDate = null; showForm = false; editingEvent = null
      await loadMonth(); render()
    })

    container.querySelectorAll('.cal-cell[data-date]').forEach(cell => {
      cell.addEventListener('click', () => {
        const date = cell.dataset.date
        if (selectedDate === date) { selectedDate = null; showForm = false; editingEvent = null }
        else { selectedDate = date; showForm = false; editingEvent = null }
        render()
      })
    })

    const addBtn = document.getElementById('cd-add')
    if (addBtn) {
      addBtn.addEventListener('click', () => { showForm = true; editingEvent = null; render() })
    }

    const cancelBtn = document.getElementById('cf-cancel')
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => { showForm = false; editingEvent = null; render() })
    }

    const saveBtn = document.getElementById('cf-save')
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const title  = document.getElementById('cf-title').value.trim()
        const date   = document.getElementById('cf-date').value
        const type   = document.getElementById('cf-type').value
        const recur  = document.getElementById('cf-recur').checked ? 1 : 0
        const notes  = document.getElementById('cf-notes').value.trim()
        if (!title) { alert('Title is required'); return }
        if (!date)  { alert('Date is required');  return }
        saveBtn.disabled = true
        try {
          if (editingEvent) {
            await shell.api.put(`/events/${editingEvent.id}`, { title, date, type, recur_yearly: recur, notes })
          } else {
            await shell.api.post('/events', { title, date, type, recur_yearly: recur, notes })
          }
          showForm = false; editingEvent = null
          await loadMonth(); render()
        } catch (err) {
          alert(err.message || 'Failed to save')
          saveBtn.disabled = false
        }
      })
    }

    container.querySelectorAll('.cal-edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const ev = monthData.events.find(e => String(e.id) === btn.dataset.id)
        if (!ev) return
        editingEvent = ev; showForm = true; render()
      })
    })

    container.querySelectorAll('.cal-del-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this event?')) return
        try {
          await shell.api.delete(`/events/${btn.dataset.id}`)
          await loadMonth(); render()
        } catch (err) { alert(err.message || 'Failed to delete') }
      })
    })

    container.querySelectorAll('.cal-mod-row[data-slug]').forEach(row => {
      row.addEventListener('click', () => navigateTo(row.dataset.slug))
    })
  }

  // ─── Data ──────────────────────────────────────────────────────────────────

  async function loadMonth() {
    monthData = await shell.api.get(`/month?year=${currentYear}&month=${currentMonth}`)
  }

  // ─── Module registration ───────────────────────────────────────────────────

  window.Mosaic.registerModule({
    slug: 'calendar',

    init(s) {
      shell = s
      navigateTo = s.navigate
    },

    async onActivate(el) {
      container = el
      try {
        await loadMonth()
        render()
      } catch (err) {
        el.innerHTML = `<p style="color:#ef4444;padding:1rem">Failed to load calendar: ${esc(err.message)}</p>`
      }
    },

    onDeactivate() {
      container    = null
      selectedDate = null
      showForm     = false
      editingEvent = null
    },
  })
})()
