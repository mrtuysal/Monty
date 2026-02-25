/**
 * Supabase Field Mappers
 * 
 * Centralizes the conversion between the app's camelCase field names
 * and Supabase's snake_case column names. This ensures consistency
 * across the entire application.
 */

// --- Payment Mappers ---

export const mapPaymentFromDB = (p) => ({
    ...p,
    dueDate: p.due_date,
    statementDate: p.statement_date,
    isRecurring: p.is_recurring,
    recurringFrequency: p.recurring_frequency,
    accountId: p.account_id,
    minPayment: p.min_payment,
    paymentAmount: p.payment_amount,
});

export const mapPaymentToDB = (p, userId) => ({
    ...(userId && { user_id: userId }),
    type: p.type,
    description: p.description,
    institution: p.institution,
    amount: p.amount,
    min_payment: p.minPayment || 0,
    payment_amount: p.paymentAmount || p.amount,
    balance: p.balance || 0,
    currency: p.currency || 'TRY',
    due_date: p.dueDate,
    statement_date: p.statementDate || null,
    status: p.status || 'PENDING',
    is_recurring: p.isRecurring || false,
    recurring_frequency: p.recurringFrequency || null,
    account_id: p.accountId || null,
});

// --- Account Mappers ---

export const mapAccountFromDB = (a) => ({
    ...a,
    accountType: a.account_type,
    kmhLimit: a.kmh_limit,
});

export const mapAccountToDB = (a, userId) => ({
    ...(userId && { user_id: userId }),
    institution: a.institution,
    name: a.name,
    account_type: a.accountType,
    type: a.type,
    currency: a.currency,
    balance: a.balance,
    available: a.available,
    kmh_limit: a.kmhLimit || 0,
    transactions: a.transactions || [],
});
