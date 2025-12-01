// js/vista.js — FINAL PRODUCTION VERSION
(function () {
  console.log("%c[VISTA] vista.js loaded", "color:#00C853; font-weight:bold;");

  /* ======================================================
     LOAD PANORAMA LABELS (locale/en.txt)
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
      return labels;
    } catch (err) {
      console.error("[VISTA] Failed to load pano labels:", err);
      return [];
    }
  }

  /* ======================================================
     OPEN PANORAMA IN VIEWER
     (UI.js also directly calls tour.setMediaByName)
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
  ====================================================== */
  async function loadProjects() {
    try {
      const res = await fetch("Links.json");
      const json = await res.json();
      return json.projects || [];
    } catch (err) {
      console.error("[VISTA] Failed to load projects:", err);
      return [];
    }
  }

  /* ======================================================
     OPEN PROJECT IN NEW TAB
  ====================================================== */
  function openProject(url) {
    try {
      window.open(url, "_blank");
      console.log("[VISTA] Opening project:", url);
    } catch (err) {
      console.error("[VISTA] Failed to open project:", err);
    }
  }

  /* ======================================================
     FUZZY MATCH
  ====================================================== */
  const fuzzyMatch = (target, userText) => {
    const a = target.toLowerCase();
    const b = userText.toLowerCase();
    return a.includes(b) || b.includes(a);
  };

  /* ======================================================
     FIND PANORAMA MATCH (exact or fuzzy)
  ====================================================== */
  async function findMatchingPano(userText) {
    const panos = await loadPanoLabels();
    if (!panos.length) return null;

    const t = userText.toLowerCase();

    const exact = panos.find((p) => p.toLowerCase() === t);
    if (exact) return exact;

    return panos.find((p) => fuzzyMatch(p, userText)) || null;
  }

  /* ======================================================
     FIND PROJECT MATCH
  ====================================================== */
  async function findMatchingProject(userText) {
    const projects = await loadProjects();
    if (!projects.length) return null;

    const t = userText.toLowerCase();
    return projects.find((p) => fuzzyMatch(p.title, t)) || null;
  }

  /* ======================================================
     DETECT TOUR INTENT (pano / project / school)
  ====================================================== */
  function detectTourIntent(text) {
    const t = text.toLowerCase();

    const panoWords = [
      "open",
      "go to",
      "goto",
      "show",
      "take me to",
      "view",
      "panorama",
      "pano",
    ];
    if (panoWords.some((x) => t.includes(x))) return "pano";

    const projectWords = [
      "open project",
      "switch project",
      "load project",
      "search project",
    ];
    if (projectWords.some((x) => t.includes(x))) return "project";

    return "school";
  }

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
    detectTourIntent,
  };
})();
