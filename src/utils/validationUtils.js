/**
 * Validation Utilities
 * Centralized validation logic for forms and data processing.
 */

/**
 * Validates an email address format.
 * @param {string} email 
 * @returns {boolean}
 */
export const validateEmail = (email) => {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(String(email).toLowerCase());
};

/**
 * Validates a phone number (basic international format check).
 * @param {string} phone 
 * @returns {boolean}
 */
export const validatePhone = (phone) => {
    // Allows +, spaces, dashes, parentheses, and digits. Min length 7.
    const re = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
    return re.test(String(phone));
};

/**
 * Validates a monetary amount within a specific range.
 * @param {number|string} amount 
 * @param {number} [min=5] 
 * @param {number} [max=10000] 
 * @returns {object} { isValid: boolean, error: string|null }
 */
export const validateAmount = (amount, min = 5, max = 10000) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return { isValid: false, error: 'Amount must be a number.' };
    if (num < min) return { isValid: false, error: `Amount must be at least €${min}.` };
    if (num > max) return { isValid: false, error: `Amount cannot exceed €${max}.` };
    return { isValid: true, error: null };
};

/**
 * Validates a country name (basic length check, could be expanded against a list).
 * @param {string} country 
 * @returns {boolean}
 */
export const validateCountry = (country) => {
    return typeof country === 'string' && country.trim().length >= 2;
};

/**
 * Validates a city name.
 * @param {string} city 
 * @returns {boolean}
 */
export const validateCity = (city) => {
    return typeof city === 'string' && city.trim().length >= 2;
};

/**
 * Validates the entire contribution form data object.
 * @param {object} formData 
 * @param {string} mode - 'manual' or 'existing'
 * @returns {object} { isValid: boolean, errors: object }
 */
export const validateContributionForm = (formData, mode = 'manual') => {
    const errors = {};
    
    // Amount Validation
    const amountVal = validateAmount(formData.contribution_amount);
    if (!amountVal.isValid) {
        errors.amount = amountVal.error;
    }

    // User Identity Validation
    if (mode === 'manual') {
        if (!formData.full_name || formData.full_name.trim().length < 2) {
            errors.full_name = 'Full name is required.';
        }
        if (!validateEmail(formData.email)) {
            errors.email = 'Valid email is required.';
        }
        // Optional fields checks can go here if stricter rules needed
        if (formData.phone && !validatePhone(formData.phone)) {
            errors.phone = 'Invalid phone format.';
        }
    } else {
        if (!formData.user_id) {
            errors.user_id = 'Please select a user.';
        }
    }

    // Date check (basic)
    if (!formData.contribution_date) {
        errors.date = 'Date is required.';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};