try {
  if (localStorage.getItem("context-designer-theme") === "light")
    document.documentElement.dataset.theme = "light";
} catch {}
