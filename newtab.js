(() => {
  const { locale } = window.newTabI18n;
  const clock = document.getElementById("clock");
  const date = document.getElementById("date");

  const timeFormatter = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  function updateClock() {
    const now = new Date();
    clock.textContent = timeFormatter.format(now);
    clock.dateTime = now.toISOString();
    date.textContent = dateFormatter.format(now);
  }

  updateClock();
  setInterval(updateClock, 1000);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      updateClock();
    }
  });
})();
