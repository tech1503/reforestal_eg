
import { supabase } from '@/lib/customSupabaseClient';

/**
 * Impact Credits Service
 * Centralized service for all Impact Credits operations
 * Single source of truth for IC transactions
 */

/**
 * Emits Impact Credits to a user with full source tracking and error handling
 * @param {Object} params - Emission parameters
 * @param {string} params.user_id - Target user ID
 * @param {number} params.amount - Amount of IC to emit
 * @param {string} params.source - Source identifier (e.g., 'startnext_contribution', 'quest_completion', 'mlm_direct')
 * @param {string} params.description - Human-readable description
 * @param {string} [params.related_support_level_id] - Optional support level reference
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export const emitImpactCredits = async ({ 
  user_id, 
  amount, 
  source, 
  description,
  related_support_level_id = null 
}) => {
  try {
    // Validation
    if (!user_id || !amount || !source) {
      return { 
        success: false, 
        error: 'Missing required parameters: user_id, amount, and source are required' 
      };
    }

    if (amount <= 0) {
      return { 
        success: false, 
        error: 'Amount must be greater than 0' 
      };
    }

    // Insert IC transaction
    const { data, error } = await supabase
      .from('impact_credits')
      .insert({
        user_id,
        amount,
        source,
        description: description || `Impact Credits from ${source}`,
        related_support_level_id,
        issued_date: new Date().toISOString(),
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Impact Credits emission error:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }

    // Update user balance (if reforestal_user_balances table exists)
    const { error: balanceError } = await supabase.rpc(
      'add_to_unvested_balance', 
      { user_id_input: user_id, amount_input: amount }
    ).catch(() => null); // Silent fail if RPC doesn't exist

    if (balanceError) {
      console.warn('Balance update warning:', balanceError);
    }

    return { 
      success: true, 
      data 
    };

  } catch (err) {
    console.error('Unexpected error in emitImpactCredits:', err);
    return { 
      success: false, 
      error: err.message 
    };
  }
};

/**
 * Fetches a user's Impact Credits history with pagination and filtering
 * @param {Object} params - Query parameters
 * @param {string} params.user_id - User ID
 * @param {number} [params.limit=50] - Results per page
 * @param {number} [params.offset=0] - Offset for pagination
 * @param {string} [params.source_filter] - Optional source filter
 * @returns {Promise<{success: boolean, data?: Array, total?: number, error?: string}>}
 */
export const getImpactCreditsHistory = async ({ 
  user_id, 
  limit = 50, 
  offset = 0,
  source_filter = null 
}) => {
  try {
    if (!user_id) {
      return { 
        success: false, 
        error: 'user_id is required' 
      };
    }

    // Build query
    let query = supabase
      .from('impact_credits')
      .select('*', { count: 'exact' })
      .eq('user_id', user_id)
      .order('issued_date', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply source filter if provided
    if (source_filter) {
      query = query.eq('source', source_filter);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('History fetch error:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }

    return { 
      success: true, 
      data: data || [], 
      total: count || 0 
    };

  } catch (err) {
    console.error('Unexpected error in getImpactCreditsHistory:', err);
    return { 
      success: false, 
      error: err.message 
    };
  }
};

/**
 * Gets Impact Credits summary for a user
 * @param {string} user_id - User ID
 * @returns {Promise<{success: boolean, summary?: object, error?: string}>}
 */
export const getImpactCreditsSummary = async (user_id) => {
  try {
    if (!user_id) {
      return { 
        success: false, 
        error: 'user_id is required' 
      };
    }

    // Fetch all IC transactions
    const { data: credits, error: creditsError } = await supabase
      .from('impact_credits')
      .select('amount, source')
      .eq('user_id', user_id);

    if (creditsError) {
      console.error('Summary fetch error:', creditsError);
      return { 
        success: false, 
        error: creditsError.message 
      };
    }

    // Fetch all purchases (spent IC)
    const { data: purchases, error: purchasesError } = await supabase
      .from('user_purchases')
      .select('credits_spent')
      .eq('user_id', user_id);

    if (purchasesError) {
      console.error('Purchases fetch error:', purchasesError);
      return { 
        success: false, 
        error: purchasesError.message 
      };
    }

    // Calculate totals
    const totalEarned = credits?.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0) || 0;
    const totalSpent = purchases?.reduce((sum, p) => sum + parseFloat(p.credits_spent || 0), 0) || 0;
    const balance = totalEarned - totalSpent;

    // Group by source
    const bySource = credits?.reduce((acc, c) => {
      const source = c.source || 'unknown';
      acc[source] = (acc[source] || 0) + parseFloat(c.amount || 0);
      return acc;
    }, {}) || {};

    return { 
      success: true, 
      summary: {
        totalEarned,
        totalSpent,
        balance,
        bySource,
        transactionCount: credits?.length || 0
      }
    };

  } catch (err) {
    console.error('Unexpected error in getImpactCreditsSummary:', err);
    return { 
      success: false, 
      error: err.message 
    };
  }
};

/**
 * Spends Impact Credits (for purchases)
 * @param {Object} params - Spend parameters
 * @param {string} params.user_id - User ID
 * @param {number} params.amount - Amount to spend
 * @param {string} params.product_id - Product being purchased
 * @param {number} params.quantity - Quantity
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export const spendImpactCredits = async ({ user_id, amount, product_id, quantity }) => {
  try {
    if (!user_id || !amount || !product_id || !quantity) {
      return { 
        success: false, 
        error: 'Missing required parameters' 
      };
    }

    // Check balance first
    const summaryResult = await getImpactCreditsSummary(user_id);
    if (!summaryResult.success) {
      return summaryResult;
    }

    if (summaryResult.summary.balance < amount) {
      return { 
        success: false, 
        error: 'Insufficient Impact Credits balance' 
      };
    }

    // Record purchase
    const { data, error } = await supabase
      .from('user_purchases')
      .insert({
        user_id,
        product_id,
        credits_spent: amount,
        quantity,
        purchased_at: new Date().toISOString(),
        status: 'completed'
      })
      .select()
      .single();

    if (error) {
      console.error('Purchase error:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }

    return { 
      success: true, 
      data 
    };

  } catch (err) {
    console.error('Unexpected error in spendImpactCredits:', err);
    return { 
      success: false, 
      error: err.message 
    };
  }
};

export default {
  emitImpactCredits,
  getImpactCreditsHistory,
  getImpactCreditsSummary,
  spendImpactCredits
};
