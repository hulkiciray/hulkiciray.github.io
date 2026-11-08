// Light is the default. Runs in <head> so a saved dark theme applies before the first paint.
(function () {
  var KEY = 'theme';
  var root = document.documentElement;

  function load() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }

  function save(theme) {
    try { localStorage.setItem(KEY, theme); } catch (e) { /* storage blocked: theme lasts this page view */ }
  }

  root.setAttribute('data-theme', load() === 'dark' ? 'dark' : 'light');

  document.addEventListener('DOMContentLoaded', function () {
    var button = document.getElementById('theme-toggle');
    if (!button) return;

    function render() {
      var dark = root.getAttribute('data-theme') === 'dark';
      var label = dark ? 'Switch to light mode' : 'Switch to dark mode';
      button.textContent = dark ? '🌙' : '💡';
      button.setAttribute('aria-label', label);
      button.title = label;
    }

    button.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      save(next);
      render();
    });

    render();
  });
})();
