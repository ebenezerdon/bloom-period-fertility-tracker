/* scripts/settings.js
   Lightweight settings page behavior. Uses window.App.Helpers for persistence and date parsing/formatting.
*/

(function(){
  'use strict';
  $(function(){
    const H = window.App && window.App.Helpers ? window.App.Helpers : null;
    if (!H){
      console.error('Helpers not available: settings page requires scripts/helpers.js');
      return;
    }

    // Prefill form from saved settings when available
    try{
      const saved = H.loadSettings();
      if (saved && saved.lastPeriod){
        $('#lastPeriod').val(saved.lastPeriod);
        $('#cycleLength').val(saved.cycleLength);
        $('#periodLength').val(saved.periodLength);
      } else {
        const iso = new Date().toISOString().slice(0,10);
        $('#lastPeriod').val(iso);
      }
    }catch(e){
      console.error('Failed to prefill settings', e);
    }

    $('#settingsForm').on('submit', function(ev){
      ev.preventDefault();
      try{
        const last = $('#lastPeriod').val();
        const cycleLength = Number($('#cycleLength').val());
        const periodLength = Number($('#periodLength').val());

        const lastDate = H.parseDateISO(last);
        if (!lastDate){ alert('Please enter a valid last period date.'); return; }
        if (!(cycleLength >= 20 && cycleLength <= 45)){ alert('Cycle length must be between 20 and 45 days.'); return; }
        if (!(periodLength >= 1 && periodLength <= 14)){ alert('Period length must be between 1 and 14 days.'); return; }

        const settings = { lastPeriod: last, cycleLength, periodLength };
        H.saveSettings(settings);

        const $btn = $(this).find('button[type=submit]');
        $btn.prop('disabled', true).text('Saved');
        setTimeout(()=> $btn.prop('disabled', false).text('Save'), 1100);
      }catch(err){
        console.error('Error saving settings', err);
        alert('An unexpected error occurred. See console for details.');
      }
    });

    $('#cancelBtn').on('click', function(){
      window.location.href = 'index.html';
    });
  });
})();
