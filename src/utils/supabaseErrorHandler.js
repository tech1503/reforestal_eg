import { DatabaseError, AuthorizationError, NotFoundError } from './errorHandler';

/**
 * Wraps Supabase calls to standardize error throwing.
 * @param {object} response - The { data, error } object from Supabase SDK
 * @param {string} operationName - Name of the operation for logging context
 * @returns {any} data - The data if successful
 * @throws {AppError} - Throws specific custom error
 */
export const handleSupabaseError = (response, operationName = 'Database Operation') => {
    const { data, error } = response;

    if (error) {
        // Map Supabase error codes to custom errors
        // Code 42501 is PostgreSQL RLS violation (Insufficient Privilege)
        if (error.code === '42501') {
            throw new AuthorizationError(`Permission denied for: ${operationName}`);
        }
        
        // Code PGRST116 is often "The result contains 0 rows" when using .single()
        if (error.code === 'PGRST116') {
            throw new NotFoundError(operationName);
        }

        // Generic DB Error
        throw new DatabaseError(`Failed during ${operationName}: ${error.message}`, error);
    }

    return data;
};

/**
 * Async wrapper for Supabase queries to catch network issues.
 * @param {Promise} promise - The Supabase promise
 * @param {string} context - Context name
 */
export const safeSupabaseCall = async (promise, context) => {
    try {
        const result = await promise;
        return handleSupabaseError(result, context);
    } catch (err) {
        // If it's already one of our custom errors, rethrow
        if (err.name && err.name.endsWith('Error')) {
            throw err;
        }
        // Otherwise wrap it
        throw new DatabaseError(`Network or Client Error in ${context}`, err);
    }
};