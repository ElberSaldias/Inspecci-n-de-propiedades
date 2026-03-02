import { APPS_SCRIPT_URL } from '../config';

const WEBAPP_URL = import.meta.env.VITE_WEBAPP_URL || APPS_SCRIPT_URL;
const API_KEY = import.meta.env.VITE_API_KEY || "dummy-key";

export async function api(action: string, extra: Record<string, unknown> = {}) {
    console.log("API Call:", { action, extra });
    console.log("WEBAPP_URL:", WEBAPP_URL);
    console.log("API_KEY exists:", !!API_KEY);

    if (!WEBAPP_URL) {
        throw new Error("Configuration Error: Missing API URL");
    }

    const response = await fetch(WEBAPP_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            apiKey: API_KEY,
            action,
            ...extra
        })
    });

    return response.json();
}
