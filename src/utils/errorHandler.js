/**
 * Custom Error Classes for structured error handling.
 */

export class AppError extends Error {
    constructor(message, code = 'INTERNAL_ERROR', details = null) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.details = details;
        this.timestamp = new Date().toISOString();
    }
}

export class ValidationError extends AppError {
    constructor(message, details = null) {
        super(message, 'VALIDATION_ERROR', details);
    }
}

export class DatabaseError extends AppError {
    constructor(message, originalError = null) {
        super(message, 'DATABASE_ERROR', originalError);
    }
}

export class AuthorizationError extends AppError {
    constructor(message = 'You do not have permission to perform this action.') {
        super(message, 'AUTH_ERROR');
    }
}

export class NotFoundError extends AppError {
    constructor(resourceName, id = null) {
        const msg = id 
            ? `${resourceName} with ID ${id} was not found.` 
            : `${resourceName} was not found.`;
        super(msg, 'NOT_FOUND');
    }
}

/**
 * Logs errors to console (and potentially external monitoring service).
 * @param {Error} error 
 * @param {string} context - Where the error occurred
 */
export const logError = (error, context = 'General') => {
    const timestamp = new Date().toISOString();
    const errorInfo = {
        name: error.name || 'Error',
        message: error.message,
        code: error.code || 'UNKNOWN',
        stack: error.stack,
        details: error.details || null,
        context
    };

    console.error(`[${timestamp}] [${context}] Error:`, errorInfo);
    
    // Future integration: Send to Sentry/LogRocket here
};

/**
 * Returns a user-friendly message based on error type.
 * @param {Error} error 
 * @returns {string}
 */
export const getUserMessage = (error) => {
    if (error instanceof ValidationError) return error.message;
    if (error instanceof AuthorizationError) return "Access denied.";
    if (error instanceof NotFoundError) return "The requested resource could not be found.";
    
    // Database errors often contain technical details we hide from users
    if (error instanceof DatabaseError) return "A database error occurred. Please try again later.";
    
    return error.message || "An unexpected error occurred.";
};