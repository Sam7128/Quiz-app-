export const isAbortError = (error: unknown): boolean => {
    if (!error) return false;

    // Standard Error or DOMException
    if (error instanceof Error && error.name === 'AbortError') return true;

    // Fallback for Supabase/PostgREST errors which are POJOs
    if (typeof error === 'object') {
        const record = error as Record<string, unknown>;
        if (record.name === 'AbortError') return true;
        if (typeof record.message === 'string' && record.message.includes('AbortError')) return true;
        if (typeof record.details === 'string' && record.details.includes('AbortError')) return true;
    }

    return false;
};
