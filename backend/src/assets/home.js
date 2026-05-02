(function() {
  var startX = 0, startY = 0, startTarget = null;
  var SWIPE_THRESHOLD = 50;
  var page = document.querySelector('[data-page-context]');
  if (!page) return;

  var MIN_DATE = page.dataset.minDate || '';
  var activeDate = page.dataset.activeDate || '';
  var todayIso = page.dataset.today || '';
  var period = page.dataset.period || '';

  function addDays(date, days) {
    var d = new Date(date + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function addMonths(ym, n) {
    var y = parseInt(ym.slice(0, 4), 10);
    var m = parseInt(ym.slice(5, 7), 10) - 1 + n;
    var d = new Date(Date.UTC(y, m, 1, 12));
    return d.toISOString().slice(0, 7);
  }

  var toggle = document.getElementById('periodToggle');
  var dropdown = document.getElementById('periodDropdown');
  if (toggle && dropdown) {
    toggle.addEventListener('click', function(e) {
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });
    document.addEventListener('click', function() {
      dropdown.classList.remove('open');
    });
  }

  function navigateTo(url) {
    window.location.href = url;
  }

  document.addEventListener('touchstart', function(e) {
    startX = e.changedTouches[0].clientX;
    startY = e.changedTouches[0].clientY;
    startTarget = e.target;
  });

  document.addEventListener('touchend', function(e) {
    var deltaX = e.changedTouches[0].clientX - startX;
    var deltaY = e.changedTouches[0].clientY - startY;
    if (Math.abs(deltaX) > SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY) && !(startTarget && startTarget.closest('.date-bar-links'))) {
      e.preventDefault();
      if (period === 'day') {
        if (deltaX > 0) {
          var next = addDays(activeDate, 1);
          if (next <= todayIso) navigateTo('/date/' + next);
        } else {
          var prev = addDays(activeDate, -1);
          if (prev >= MIN_DATE) navigateTo('/date/' + prev);
        }
      } else if (period === 'week') {
        if (deltaX > 0) {
          var nextW = addDays(activeDate, 7);
          if (nextW <= todayIso) navigateTo('/week/' + nextW);
        } else {
          var prevW = addDays(activeDate, -7);
          if (prevW >= MIN_DATE) navigateTo('/week/' + prevW);
        }
      } else if (period === 'month') {
        if (deltaX > 0) {
          var nextM = addMonths(activeDate, 1);
          if (nextM <= todayIso.slice(0, 7)) navigateTo('/month/' + nextM);
        } else {
          var prevM = addMonths(activeDate, -1);
          if (prevM >= MIN_DATE.slice(0, 7)) navigateTo('/month/' + prevM);
        }
      }
    }
  }, { passive: false });
})();
