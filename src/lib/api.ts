import { APPS_SCRIPT_URL } from '../config';
import { fetchJSON } from '../apiClient';

const WEBAPP_URL = import.meta.env.VITE_WEBAPP_URL || APPS_SCRIPT_URL;
const API_KEY = import.meta.env.VITE_API_KEY || "dummy-key";

export async function api(action: string, extra: Record<string, unknown> = {}) {
    console.log("API Call:", { action, extra });

    if (!WEBAPP_URL) {
        throw new Error("Configuration Error: Missing API URL");
    }

    // Usamos fetchJSON para manejar consistencia, reintentos y evitar preflight
    return fetchJSON(WEBAPP_URL, {
        method: "POST",
        body: JSON.stringify({
            apiKey: API_KEY,
            action,
            ...extra
        })
    });
}
