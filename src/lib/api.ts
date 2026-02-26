const WEBAPP_URL = import.meta.env.VITE_WEBAPP_URL;
const API_KEY = import.meta.env.VITE_API_KEY;

export async function api(action: string, extra: Record<string, unknown> = {}) {

    if (!WEBAPP_URL || !API_KEY) {
        throw new Error(
            "Configuration Error: Missing VITE_WEBAPP_URL or VITE_API_KEY"
        );
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
