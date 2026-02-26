import { API_TIMEOUT } from './config';

export interface ApiResponse<T = any> {
    ok: boolean;
    message?: string;
    data?: T;
    error?: string;
    [key: string]: any;
}

export async function fetchJSON<T = any>(url: string, options: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });

        clearTimeout(id);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[API Error] Status: ${response.status} | Endpoint: ${url} | Body: ${errorText}`);
            throw new Error(`Error de servidor (${response.status}): ${response.statusText}`);
        }

        const data = await response.json();

        // Google Apps Script usually returns 'ok' in the response body if it's following the pattern
        if (data && typeof data === 'object' && data.ok === false) {
            console.warn(`[API Warning] Logic failure at ${url}:`, data);
            throw new Error(data.error || data.message || 'La operación no pudo ser completada en el servidor');
        }

        return data as T;
    } catch (error: any) {
        clearTimeout(id);
        if (error.name === 'AbortError') {
            console.error(`[API Timeout] Request to ${url} timed out after ${API_TIMEOUT}ms`);
            throw new Error('La conexión tardó demasiado tiempo. Por favor, reintenta.');
        }
        console.error(`[API Fatal] ${url}:`, error.message);
        throw error;
    }
}
