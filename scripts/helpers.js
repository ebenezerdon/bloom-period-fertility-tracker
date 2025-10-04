/* scripts/helpers.js
   Responsible for state, calculations, storage, and date utilities.
   Exposes functions under window.App.Helpers
*/

(function(){
  'use strict';
  window.App = window.App || {};
  window.App.Helpers = window.App.Helpers || {};

  const STORAGE_KEY = 'bloom.tracker.settings.v1';

  // Safe date utilities
  function parseDateISO(value){
    if (!value) return null;
    const d = new Date(value + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return null;
    return d;
  }

  function formatHuman(d){
    if (!d) return '—';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function cloneDate(d){ return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

  function addDays(date, days){
    const out = cloneDate(date);
    out.setDate(out.getDate() + Number(days));
    return out;
  }

  function daysBetween(a,b){
    const ms = cloneDate(b).getTime() - cloneDate(a).getTime();
    return Math.round(ms / (1000*60*60*24));
  }

  // Settings management
  function saveSettings(settings){
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }catch(e){
      console.error('Failed to save settings', e);
    }
  }

  function loadSettings(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      // Basic validation
      if (!parsed.lastPeriod || !parsed.cycleLength || !parsed.periodLength) return null;
      parsed.lastPeriodDate = parseDateISO(parsed.lastPeriod);
      return parsed;
    }catch(e){
      console.error('Failed to load settings', e);
      return null;
    }
  }

  // Returns an array of predicted cycles for count cycles. Each cycle: {periodStart:Date, periodDays:[Date..], ovulation:Date, fertileRange:{start:Date,end:Date}}
  function predictCycles(lastPeriodDate, cycleLength = 28, periodLength = 5, count = 6){
    const cycles = [];
    if (!lastPeriodDate || isNaN(lastPeriodDate.getTime())) return cycles;

    let start = cloneDate(lastPeriodDate);
    for(let i=0;i<count;i++){
      const periodStart = cloneDate(start);
      const periodDays = [];
      for(let d=0; d<periodLength; d++){
        periodDays.push(addDays(periodStart, d));
      }

      // Ovulation estimation: typically 14 days before next period start
      const nextPeriodStart = addDays(periodStart, cycleLength);
      const ovulation = addDays(nextPeriodStart, -14);

      const fertileStart = addDays(ovulation, -5);
      const fertileEnd = addDays(ovulation, 1);

      cycles.push({
        periodStart,
        periodDays,
        ovulation,
        fertileRange: { start: fertileStart, end: fertileEnd }
      });

      // Move to next cycle
      start = nextPeriodStart;
    }
    return cycles;
  }

  // Build a month grid for a given Date (month reference) with annotated day objects
  function buildMonthGrid(year, month, annotatedDates){
    // annotatedDates: array of objects {date:Date, type:'period'|'fertile'|'ovulation'}
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay(); // 0-6 (sun-sat)
    const daysInMonth = new Date(year, month+1, 0).getDate();

    const cells = [];
    // prefix empty cells
    for(let i=0;i<startOffset;i++) cells.push(null);

    for(let d=1; d<=daysInMonth; d++){
      const date = new Date(year, month, d);
      const iso = date.toISOString().slice(0,10);
      const matched = annotatedDates.filter(a=>a.iso === iso)[0] || null;
      cells.push({ date, iso, annotation: matched ? matched.type : null });
    }

    return cells;
  }

  // Helper to create annotated date map for a set of cycles
  function annotatedDateList(cycles){
    const list = [];
    cycles.forEach(c =>{
      c.periodDays.forEach(d => list.push({ iso: d.toISOString().slice(0,10), type: 'period' }));
      // fertile range inclusive
      for(let dt = cloneDate(c.fertileRange.start); daysBetween(dt, c.fertileRange.end) >= 0; dt = addDays(dt, 1)){
        list.push({ iso: dt.toISOString().slice(0,10), type: 'fertile' });
      }
      // ovulation marker (explicit)
      list.push({ iso: c.ovulation.toISOString().slice(0,10), type: 'ovulation' });
    });
    // If a date is marked multiple times, keep the highest-priority label: ovulation > period > fertile
    const map = {};
    list.forEach(item =>{
      const prev = map[item.iso];
      if (!prev) { map[item.iso] = item.type; return; }
      const rank = { ovulation:3, period:2, fertile:1 };
      if (rank[item.type] > rank[prev]) map[item.iso] = item.type;
    });
    return Object.keys(map).map(k=>({ iso: k, type: map[k] }));
  }

  // Expose functions
  window.App.Helpers.parseDateISO = parseDateISO;
  window.App.Helpers.formatHuman = formatHuman;
  window.App.Helpers.addDays = addDays;
  window.App.Helpers.saveSettings = saveSettings;
  window.App.Helpers.loadSettings = loadSettings;
  window.App.Helpers.predictCycles = predictCycles;
  window.App.Helpers.buildMonthGrid = buildMonthGrid;
  window.App.Helpers.annotatedDateList = annotatedDateList;
  window.App.Helpers.STORAGE_KEY = STORAGE_KEY;

})();
