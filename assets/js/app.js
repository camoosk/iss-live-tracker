(() => {
  const buttons = document.querySelectorAll(".lang-button");
  const elements = document.querySelectorAll("[data-i18n]");
  const saved = localStorage.getItem("iss-live-tracker-language") || "id";

  function setLanguage(language) {
    const dictionary = window.ISS_I18N[language] || window.ISS_I18N.id;
    document.documentElement.lang = language;
    elements.forEach((element) => {
      const key = element.dataset.i18n;
      if (dictionary[key]) element.textContent = dictionary[key];
    });
    buttons.forEach((button) => {
      button.classList.toggle("active", button.dataset.language === language);
    });
    localStorage.setItem("iss-live-tracker-language", language);
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => setLanguage(button.dataset.language));
  });

  setLanguage(saved);
})();
