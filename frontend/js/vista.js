// js/vista.js — FINAL AI-READY PRODUCTION VERSION (AUTO-LOAD FIXED)
(function () {
  console.log("%c[VISTA] vista.js loaded", "color:#00C853; font-weight:bold;");

  /* ======================================================
     LOAD PANORAMA LABELS (locale/en.txt)
     + expose window.VistaPanos for backend AI
  ====================================================== */
  async function loadPanoLabels() {
    try {
      const res = await fetch("locale/en.txt");
      const text = await res.text();

      const labels = text
        .split("\n")
        .map((line) => {
          const m = line.match(/^panorama_([A-Z0-9_]+)\.label\s*=\s*(.+)$/);
          return m ? m[2].trim() : null;
        })
        .filter(Boolean);

      console.log("[VISTA] Loaded panoramas:", labels.length);

      // ⭐ Expose globally
      window.VistaPanos = labels;

      return labels;
    } catch (err) {
      console.error("[VISTA] Failed to load pano labels:", err);
      window.VistaPanos = [];
      return [];
    }
  }

  /* ======================================================
     OPEN PANORAMA
  ====================================================== */
  function openPanorama(label) {
    try {
      if (window.tour?.setMediaByName) {
        window.tour.setMediaByName(label);
        console.log("[VISTA] Opening panorama:", label);
      } else {
        console.warn("[VISTA] Tour viewer not ready:", label);
      }
    } catch (err) {
      console.error("[VISTA] Failed to open panorama:", err);
    }
  }

  /* ======================================================
     LOAD PROJECT LINKS FROM Links.json
     + expose window.VistaProjects for backend AI
  ====================================================== */
  async function loadProjects() {
    try {
      const res = await fetch("Links.json");
      const json = await res.json();

      const projects = json.projects || [];

      // ⭐ Expose only titles to backend AI
      window.VistaProjects = projects.map((p) => p.title);

      console.log("[VISTA] Loaded projects:", window.VistaProjects.length);

      return projects;
    } catch (err) {
      console.error("[VISTA] Failed to load projects:", err);
      window.VistaProjects = [];
      return [];
    }
  }

  /* ======================================================
     OPEN PROJECT (by URL OR by Title)
  ====================================================== */
  function openProject(urlOrTitle) {
    try {
      if (typeof urlOrTitle === "string" && urlOrTitle.startsWith("http")) {
        console.log("[VISTA] Opening project URL:", urlOrTitle);
        window.open(urlOrTitle, "_blank");
        return;
      }

      loadProjects().then((projects) => {
        const match = projects.find((p) => p.title === urlOrTitle);
        if (match) {
          console.log("[VISTA] Opening project:", match.title, "→", match.url);
          window.open(match.url, "_blank");
        } else {
          console.warn("[VISTA] Project not found:", urlOrTitle);
        }
      });
    } catch (err) {
      console.error("[VISTA] Failed to open project:", err);
    }
  }

  /* ======================================================
     FUZZY MATCH HELPERS (used for UI lists)
  ====================================================== */
  const fuzzyMatch = (target, userText) => {
    const a = String(target || "").toLowerCase();
    const b = String(userText || "").toLowerCase();
    return a.includes(b) || b.includes(a);
  };

  async function findMatchingPano(userText) {
    const panos = await loadPanoLabels();
    if (!panos.length) return null;

    const t = userText.toLowerCase();

    const exact = panos.find((p) => p.toLowerCase() === t);
    if (exact) return exact;

    return panos.find((p) => fuzzyMatch(p, userText)) || null;
  }

  async function findMatchingProject(userText) {
    const projects = await loadProjects();
    if (!projects.length) return null;

    const t = userText.toLowerCase();
    return projects.find((p) => fuzzyMatch(p.title, t)) || null;
  }

  /* ======================================================
     AUTO-LOAD PANOS & PROJECTS ON PAGE LOAD
     ⭐ IMPORTANT FIX ⭐
  ====================================================== */
  window.VistaPanos = [];
  window.VistaProjects = [];

  (async () => {
    console.log("[VISTA] Pre-loading panoramas & projects…");

    await loadPanoLabels();   // loads → window.VistaPanos
    await loadProjects();     // loads → window.VistaProjects

    console.log("[VISTA] AUTOLOAD COMPLETE:", {
      panos: window.VistaPanos.length,
      projects: window.VistaProjects.length
    });
  })();

  /* ======================================================
     EXPORT PUBLIC API
  ====================================================== */
  window.Vista = {
    loadPanoLabels,
    loadProjects,
    openPanorama,
    openProject,
    findMatchingPano,
    findMatchingProject,
  };
})();
