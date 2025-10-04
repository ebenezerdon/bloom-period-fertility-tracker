/* scripts/ui.js
   Responsible for rendering UI, attaching event handlers, and exposing App.init and App.render on window.App
   Written as an IIFE to avoid leaking globals.
*/

(function(){
  'use strict';
  window.App = window.App || {};

  // Ensure Helpers are available
  const H = window.App.Helpers || {};

  // Internal UI helpers
  function createMonthCard(referenceDate, annotatedDates){
    const monthName = referenceDate.toLocaleString(undefined, { month: 'long', year: 'numeric' });
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth();

    const cells = window.App.Helpers.buildMonthGrid(year, month, annotatedDates);

    const $card = $(
      `
      <div class="border rounded-lg p-4">
        <div class="month-header mb-3">
          <div class="month-name text-sm">${monthName}</div>
          <div class="text-xs text-gray-400">Scroll or tap days</div>
        </div>
        <div class="grid grid-cols-7 gap-2 text-xs text-gray-500 mb-2" aria-hidden="true">
          <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
        </div>
        <div class="week-grid" role="grid" aria-label="Calendar for ${monthName}"></div>
      </div>
      `
    );

    const $grid = $card.find('.week-grid');

    cells.forEach(cell =>{
      if (!cell){
        $grid.append($(`<div class="day-cell day-empty" tabindex="-1" aria-hidden="true"></div>`));
      } else {
        const dayNum = cell.date.getDate();
        const iso = cell.iso;
        const annotation = cell.annotation; // null or 'period'|'fertile'|'ovulation'

        let classes = 'day-cell';
        let label = dayNum;
        let ariaLabel = `${monthName} ${dayNum}`;

        if (annotation === 'period'){
          classes += ' day-period';
          ariaLabel += ', period day';
        } else if (annotation === 'fertile'){
          classes += ' day-fertile';
          ariaLabel += ', fertile window';
        } else if (annotation === 'ovulation'){
          classes += ' day-ovulation';
          ariaLabel += ', ovulation day';
        } else {
          classes += ' bg-white text-gray-600';
        }

        const $cell = $(`<button class="${classes}" role="gridcell" tabindex="0" aria-label="${ariaLabel}">${label}</button>`);

        // Attach simple tooltip on focus/hover
        $cell.on('mouseenter focus', function(){
          const tip = annotation ? annotation : 'regular day';
          $(this).attr('title', `${dayNum} — ${tip}`);
        });

        $grid.append($cell);
      }
    });

    return $card;
  }

  function renderCalendar(cycles){
    const annotated = window.App.Helpers.annotatedDateList(cycles);

    // Build maps for quick lookup by month
    const months = [];
    const start = cycles.length ? cycles[0].periodStart : new Date();
    for(let i=0;i<6;i++){
      const d = window.App.Helpers.addDays(start, i*30); // rough monthly interval to show next 6 months
      const year = d.getFullYear();
      const month = d.getMonth();
      months.push(new Date(year, month, 1));
    }

    const $container = $('#calendarContainer');
    $container.empty();

    months.forEach(m =>{
      // For each month, collect annotations that fall in the month
      const monthAnnotated = annotated.filter(a => a.iso.startsWith(m.toISOString().slice(0,7)));
      const card = createMonthCard(m, monthAnnotated);
      $container.append(card);
    });
  }

  function updateSummary(cycles){
    if (!cycles || !cycles.length){
      $('#nextOvulation').text('—');
      $('#nextFertile').text('—');
      return;
    }

    const next = cycles[0];
    $('#nextOvulation').text(window.App.Helpers.formatHuman(next.ovulation));
    $('#nextFertile').text(`${window.App.Helpers.formatHuman(next.fertileRange.start)} — ${window.App.Helpers.formatHuman(next.fertileRange.end)}`);
  }

  function showHelp(){
    $('#helpModal').attr('aria-hidden','false');
  }
  function hideHelp(){
    $('#helpModal').attr('aria-hidden','true');
  }

  // Public App methods
  window.App.init = function(){
    // Attach event handlers and hydrate form with saved settings
    try{
      const saved = window.App.Helpers.loadSettings();
      if (saved && saved.lastPeriodDate){
        $('#lastPeriod').val(saved.lastPeriod);
        $('#cycleLength').val(saved.cycleLength);
        $('#periodLength').val(saved.periodLength);
      } else {
        // sensible defaults
        const fallback = new Date();
        const iso = fallback.toISOString().slice(0,10);
        $('#lastPeriod').val(iso);
      }

      $('#settingsForm').on('submit', function(ev){
        ev.preventDefault();
        try{
          const last = $('#lastPeriod').val();
          const cycleLength = Number($('#cycleLength').val());
          const periodLength = Number($('#periodLength').val());

          // Validation
          const lastDate = window.App.Helpers.parseDateISO(last);
          if (!lastDate){
            alert('Please enter a valid last period date.');
            return;
          }
          if (!(cycleLength >= 20 && cycleLength <= 45)){
            alert('Cycle length must be between 20 and 45 days.');
            return;
          }
          if (!(periodLength >= 1 && periodLength <= 14)){
            alert('Period length must be between 1 and 14 days.');
            return;
          }

          const settings = { lastPeriod: last, cycleLength, periodLength };
          window.App.Helpers.saveSettings(settings);

          // Re-render predictions immediately
          const cycles = window.App.Helpers.predictCycles(window.App.Helpers.parseDateISO(last), cycleLength, periodLength, 6);
          renderCalendar(cycles);
          updateSummary(cycles);

          // subtle confirmation
          const $btn = $(this).find('button[type=submit]');
          $btn.prop('disabled', true).text('Saved');
          setTimeout(()=> $btn.prop('disabled', false).text('Save'), 1100);

        }catch(e){
          console.error('Error saving settings', e);
          alert('An unexpected error occurred. See console for details.');
        }
      });

      $('#predictBtn').on('click', function(){
        // Trigger same logic as save but do not persist
        const last = $('#lastPeriod').val();
        const cycleLength = Number($('#cycleLength').val());
        const periodLength = Number($('#periodLength').val());
        const lastDate = window.App.Helpers.parseDateISO(last);
        if (!lastDate){ alert('Select a valid date.'); return; }
        const cycles = window.App.Helpers.predictCycles(lastDate, cycleLength, periodLength, 6);
        renderCalendar(cycles);
        updateSummary(cycles);
      });

      $('#helpBtn').on('click', showHelp);
      $('#closeHelp').on('click', hideHelp);
      $('#helpModal').on('click', function(e){ if (e.target === this) hideHelp(); });

      $('#resetBtn').on('click', function(){
        if (!confirm('Reset saved settings and predictions?')) return;
        localStorage.removeItem(window.App.Helpers.STORAGE_KEY);
        // reset form to defaults
        $('#cycleLength').val(28);
        $('#periodLength').val(5);
        const iso = new Date().toISOString().slice(0,10);
        $('#lastPeriod').val(iso);
        // re-render
        const cycles = window.App.Helpers.predictCycles(window.App.Helpers.parseDateISO(iso), 28, 5, 6);
        renderCalendar(cycles);
        updateSummary(cycles);
      });

      // Initial render
      const currentSettings = window.App.Helpers.loadSettings();
      const activeSettings = currentSettings || { lastPeriod: $('#lastPeriod').val(), cycleLength: Number($('#cycleLength').val()), periodLength: Number($('#periodLength').val()) };
      const cycles = window.App.Helpers.predictCycles(window.App.Helpers.parseDateISO(activeSettings.lastPeriod), activeSettings.cycleLength, activeSettings.periodLength, 6);
      renderCalendar(cycles);
      updateSummary(cycles);

      // Accessibility: keyboard shortcut H for help
      $(document).on('keydown', function(e){
        if (e.key && e.key.toLowerCase() === 'h' && !$(e.target).is('input,textarea')){
          showHelp();
        }
      });

    }catch(err){
      console.error('App.init failed', err);
    }
  };

  window.App.render = function(){
    // Additional UI rendering work could happen here. Keeping simple: initial render done in init.
    // This function exists to satisfy the main.js contract and may be extended later.
  };

})();
