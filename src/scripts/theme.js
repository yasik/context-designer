const themeToggle = document.getElementById("theme-toggle");
function updateThemeToggle() {
  const label =
    document.documentElement.dataset.theme === "light"
      ? "Switch to dark mode"
      : "Switch to light mode";
  themeToggle.setAttribute("aria-label", label);
  themeToggle.setAttribute("data-tooltip", label);
}
themeToggle.addEventListener("click", () => {
  const theme =
    document.documentElement.dataset.theme === "light" ? "ayu" : "light";
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("context-designer-theme", theme);
  } catch {}
  updateThemeToggle();
});
updateThemeToggle();
