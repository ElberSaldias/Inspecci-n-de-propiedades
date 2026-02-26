const WEBAPP_URL = import.meta.env.VITE_WEBAPP_URL;
const API_KEY = import.meta.env.VITE_API_KEY;

export async function api(action: string, extra: Record<string, any> = {}) {
    if (!WEBAPP_URL) {
        console.error("VITE_WEBAPP_URL is not defined in .env");
        return { ok: false, error: "Configuration Error" };
    }

    try {
        const res = await fetch(WEBAPP_URL, {
            method: "POST",
            headers: {
                "Content-Type": "text/plain;charset=utf-8" // Google Apps Script handles POST better with text/plain to avoid preflight
            },
            body: JSON.stringify({
                apiKey: API_KEY,
                action,
                ...extra
            })
        });

        return res.json();
    } catch (error) {
        console.error("API Call failed:", error);
        return { ok: false, error: "Network Error" };
    }
}
