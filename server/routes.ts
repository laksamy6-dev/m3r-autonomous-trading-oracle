
// --- AUTO ADDED STUB START ---
// Minimal exported registerRoutes stub to prevent runtime crashes.
// Replace this stub with the real route registration logic from your original source.
export async function registerRoutes(app:any) {
  try {
    if (!app._has_stub_health) {
      app.get("/api/health", (_req:any, res:any) => res.status(200).json({ status: "ok" }));
      app._has_stub_health = true;
    }
    console.warn("registerRoutes stub executed — replace with real routes in server/routes.ts");
  } catch (e) {
    console.error("registerRoutes stub error", e && e.stack ? e.stack : e);
  }
}
// --- AUTO ADDED STUB END ---
