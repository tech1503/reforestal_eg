/**
 * Logger utility for audit trails and operational logging.
 * In a real app, this would push to a DB table 'audit_logs' or external service.
 */

const LOG_LEVELS = {
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR',
    ACTION: 'ACTION' // For significant business actions (e.g., money moved)
};

class Logger {
    constructor() {
        this.currentUser = null;
    }

    setUser(user) {
        this.currentUser = user ? { id: user.id, email: user.email } : null;
    }

    _format(level, message, meta = {}) {
        return {
            timestamp: new Date().toISOString(),
            level,
            message,
            user: this.currentUser || 'system/anonymous',
            meta
        };
    }

    info(message, meta) {
        const log = this._format(LOG_LEVELS.INFO, message, meta);
        console.log(`ℹ️ [INFO]`, log);
    }

    warn(message, meta) {
        const log = this._format(LOG_LEVELS.WARN, message, meta);
        console.warn(`⚠️ [WARN]`, log);
    }

    error(message, error) {
        const log = this._format(LOG_LEVELS.ERROR, message, { 
            error: error?.message, 
            stack: error?.stack 
        });
        console.error(`❌ [ERROR]`, log);
    }

    /**
     * Log significant business actions.
     * @param {string} actionType - e.g., 'CREATE_CONTRIBUTION', 'ISSUE_CREDITS'
     * @param {object} details - Details of the action
     */
    action(actionType, details) {
        const log = this._format(LOG_LEVELS.ACTION, actionType, details);
        console.log(`✅ [ACTION:${actionType}]`, log);
        // Here you would typically insert into an 'audit_log_entries' table
    }
}

export const logger = new Logger();