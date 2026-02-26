import { API_TIMEOUT } from './config';

export interface ApiResponse<T = unknown> {
    ok: boolean;
    message?: string;
    data?: T;
    error?: string;
    [key: string]: unknown;
}

export let lastApiCall: {
    endpoint: string;
    options: RequestInit;
    status?: number;
    response?: unknown;
    timestamp: string;
} | null = null;

export async function fetchJSON<T = any>(url: string, options: RequestInit = {}, retries = 2): Promise<T> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
        const fetchOptions: RequestInit = {
            ...options,
            signal: controller.signal,
        };

        const response = await fetch(url, fetchOptions);
        clearTimeout(id);

        const text = await response.text();
        let data: any;

        try {
            data = JSON.parse(text);
        } catch {
            data = { ok: response.ok, message: text };
        }

        lastApiCall = {
            endpoint: url,
            options: fetchOptions,
            status: response.status,
            response: data,
            timestamp: new Date().toISOString()
        };

        if (!response.ok) {
            console.error(`[API Error] Status: ${response.status} | Endpoint: ${url} | Body:`, data);
            throw new Error(`Error de servidor (${response.status}): ${data.message || response.statusText}`);
        }

        if (data && typeof data === 'object' && (data as any).ok === false) {
            console.warn(`[API Warning] Logic failure at ${url}:`, data);
            throw new Error((data as any).error || (data as any).message || 'La operación no pudo ser completada en el servidor');
        }

        return data as T;
    } catch (error: any) {
        clearTimeout(id);

        lastApiCall = {
            endpoint: url,
            options,
            response: { error: error instanceof Error ? error.message : String(error) },
            timestamp: new Date().toISOString()
        };

        if (retries > 0 && error.name !== 'AbortError') {
            console.warn(`[API Retry] Retrying ${url}... (${retries} left)`);
            return fetchJSON(url, options, retries - 1);
        }

        if (error.name === 'AbortError') {
            console.error(`[API Timeout] Request to ${url} timed out after ${API_TIMEOUT}ms`);
            throw new Error('La conexión tardó demasiado tiempo. Por favor, reintenta.');
        }
        console.error(`[API Fatal] ${url}:`, error.message);
        throw error;
    }
}
