export const isAbortError = (error: any): boolean => {
    if (!error) return false;

    // Standard Error or DOMException
    if (error instanceof Error && error.name === 'AbortError') return true;

    // Fallback for Supabase/PostgREST errors which are POJOs
    if (typeof error === 'object') {
        if (error.name === 'AbortError') return true;
        if (typeof error.message === 'string' && error.message.includes('AbortError')) return true;
        if (typeof error.details === 'string' && error.details.includes('AbortError')) return true;
    }

    return false;
};
