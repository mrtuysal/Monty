/**
 * Recurring Payment Helper Service
 * 
 * Handles recurring payment configurations (Infinite vs Fixed count / installments),
 * safe period addition (zero timezone drift, leap years, month-end clamping),
 * and automatic next-payment generation.
 */

/**
 * Parses raw recurringFrequency string into structured configuration.
 * Formats:
 * - 'MONTHLY' -> { frequency: 'MONTHLY', type: 'INFINITE', totalCount: null, currentIndex: 1 }
 * - 'MONTHLY#12#3' -> { frequency: 'MONTHLY', type: 'COUNT', totalCount: 12, currentIndex: 3 }
 */
export function parseRecurringConfig(rawFrequency) {
    if (!rawFrequency || typeof rawFrequency !== 'string') {
        return {
            frequency: 'MONTHLY',
            type: 'INFINITE',
            totalCount: null,
            currentIndex: 1,
            label: 'Süresiz'
        };
    }

    if (rawFrequency.includes('#')) {
        const parts = rawFrequency.split('#');
        const frequency = parts[0] || 'MONTHLY';
        const totalCount = parseInt(parts[1], 10) || 12;
        const currentIndex = parseInt(parts[2], 10) || 1;

        return {
            frequency,
            type: 'COUNT',
            totalCount,
            currentIndex,
            label: `${currentIndex}/${totalCount} Tekrar`
        };
    }

    return {
        frequency: rawFrequency,
        type: 'INFINITE',
        totalCount: null,
        currentIndex: 1,
        label: 'Süresiz'
    };
}

/**
 * Encodes structured config into recurring_frequency string for DB storage.
 */
export function encodeRecurringConfig({ frequency = 'MONTHLY', type = 'INFINITE', totalCount = null, currentIndex = 1 }) {
    if (type === 'COUNT' && totalCount && Number(totalCount) > 0) {
        return `${frequency}#${Number(totalCount)}#${Number(currentIndex) || 1}`;
    }
    return frequency;
}

/**
 * Safely adds period to YYYY-MM-DD date string without timezone drift or month skipping.
 * Clamps days to valid month boundaries (e.g., 31 Jan + 1 month = 28 Feb).
 */
export function addPeriodSafe(dateStr, freq) {
    if (!dateStr) return '';
    const cleanDate = dateStr.split('T')[0];
    const parts = cleanDate.split('-');
    if (parts.length < 3) return '';

    let year = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10) - 1; // 0-indexed: 0 = Jan, 11 = Dec
    let day = parseInt(parts[2], 10);

    if (isNaN(year) || isNaN(month) || isNaN(day)) return '';

    if (freq === 'WEEKLY') {
        const d = new Date(Date.UTC(year, month, day + 7));
        return d.toISOString().split('T')[0];
    }

    let monthsToAdd = 1;
    if (freq === 'QUARTERLY') monthsToAdd = 3;
    else if (freq === 'YEARLY') monthsToAdd = 12;

    const totalMonths = month + monthsToAdd;
    const targetYear = year + Math.floor(totalMonths / 12);
    const targetMonth = ((totalMonths % 12) + 12) % 12;

    // Days in target month (day 0 of next month is the last day of target month)
    const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
    const clampedDay = Math.min(day, daysInTargetMonth);

    const pad = (n) => String(n).padStart(2, '0');
    return `${targetYear}-${pad(targetMonth + 1)}-${pad(clampedDay)}`;
}

/**
 * Calculates and returns the next recurring payment object when a payment is marked PAID.
 * Returns null if:
 * - Payment is not recurring
 * - Fixed count repetitions have been reached
 * - Next payment already exists in allPayments
 */
export function getNextRecurringPayment(payment, allPayments = []) {
    if (!payment || !payment.isRecurring) return null;

    const config = parseRecurringConfig(payment.recurringFrequency);

    // If it's a fixed count payment and current iteration reached or exceeded limit, stop.
    if (config.type === 'COUNT' && config.totalCount && config.currentIndex >= config.totalCount) {
        return null;
    }

    // Calculate next due date safely
    const nextDueDate = addPeriodSafe(payment.dueDate, config.frequency);
    if (!nextDueDate) return null;

    // Check if next payment already exists to prevent duplicates
    const alreadyExists = (allPayments || []).some(p => {
        const instMatch = (p.institution || '').trim().toLowerCase() === (payment.institution || '').trim().toLowerCase();
        const typeMatch = (p.type || '').toUpperCase() === (payment.type || '').toUpperCase();
        const dateMatch = (p.dueDate || '').split('T')[0] === nextDueDate;
        return instMatch && typeMatch && dateMatch;
    });

    if (alreadyExists) return null;

    // Prepare next frequency string
    let nextFrequency = config.frequency;
    if (config.type === 'COUNT') {
        nextFrequency = encodeRecurringConfig({
            frequency: config.frequency,
            type: 'COUNT',
            totalCount: config.totalCount,
            currentIndex: config.currentIndex + 1
        });
    }

    const nextPayment = {
        ...payment,
        status: 'PENDING',
        dueDate: nextDueDate,
        isRecurring: true,
        recurringFrequency: nextFrequency
    };

    delete nextPayment.id;
    delete nextPayment.created_at;
    delete nextPayment.createdAt;
    delete nextPayment.updated_at;

    // Safe statement date addition
    if (payment.statementDate) {
        nextPayment.statementDate = addPeriodSafe(payment.statementDate, config.frequency);
    }

    // Credit cards reset balances for new statement cycle
    if (payment.type === 'CREDIT_CARD') {
        nextPayment.amount = 0;
        nextPayment.minPayment = 0;
        nextPayment.paymentAmount = 0;
        nextPayment.balance = 0;
    } else {
        // Bills / installment loans keep the standard amount
        nextPayment.amount = payment.amount;
        nextPayment.paymentAmount = payment.paymentAmount || payment.amount;
        nextPayment.balance = 0;
    }

    return nextPayment;
}
