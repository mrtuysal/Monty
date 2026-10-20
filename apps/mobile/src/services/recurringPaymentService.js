/**
 * Recurring Payment Utility for Mobile App
 * Handles recurrence parsing, safe date math, and auto-spawning next payment cycles.
 */

export function parseRecurringConfig(rawFrequency) {
    if (!rawFrequency) {
        return {
            frequency: 'MONTHLY',
            type: 'INFINITE',
            totalCount: null,
            currentIndex: 1,
            label: 'Süresiz'
        };
    }

    const str = String(rawFrequency).trim();

    if (str.includes('#')) {
        const parts = str.split('#');
        const frequency = parts[0] || 'MONTHLY';
        const totalCount = parseInt(parts[1], 10) || 12;
        const currentIndex = parseInt(parts[2], 10) || 1;

        return {
            frequency,
            type: 'COUNT',
            totalCount,
            currentIndex,
            label: `${currentIndex}/${totalCount}`
        };
    }

    return {
        frequency: str,
        type: 'INFINITE',
        totalCount: null,
        currentIndex: 1,
        label: 'Süresiz'
    };
}

export function encodeRecurringConfig({ frequency = 'MONTHLY', type = 'INFINITE', totalCount = 12, currentIndex = 1 }) {
    if (type === 'COUNT' && totalCount && totalCount > 0) {
        return `${frequency}#${totalCount}#${currentIndex}`;
    }
    return frequency;
}

export function addPeriodSafe(dateStr, rawFrequency) {
    if (!dateStr) return '';
    const cleanStr = String(dateStr).split('T')[0];
    const parts = cleanStr.split('-');
    if (parts.length !== 3) return '';

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    const config = parseRecurringConfig(rawFrequency);
    const freq = config.frequency;

    let targetDate = new Date(Date.UTC(year, month, day, 12, 0, 0));

    if (freq === 'WEEKLY') {
        targetDate.setUTCDate(targetDate.getUTCDate() + 7);
    } else {
        let monthsToAdd = 1;
        if (freq === 'QUARTERLY') monthsToAdd = 3;
        else if (freq === 'YEARLY') monthsToAdd = 12;

        const targetMonthIndex = month + monthsToAdd;
        const targetYear = year + Math.floor(targetMonthIndex / 12);
        const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;

        const daysInTargetMonth = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
        const safeDay = Math.min(day, daysInTargetMonth);

        targetDate = new Date(Date.UTC(targetYear, normalizedMonth, safeDay, 12, 0, 0));
    }

    const yyyy = targetDate.getUTCFullYear();
    const mm = String(targetDate.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(targetDate.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

export function normalizeDateString(dateVal) {
    if (!dateVal) return '';
    return String(dateVal).split('T')[0].trim();
}

export function getNextRecurringPayment(payment, allPayments = []) {
    if (!payment || !payment.isRecurring) return null;

    const currentConfig = parseRecurringConfig(payment.recurringFrequency);

    if (currentConfig.type === 'COUNT' && currentConfig.totalCount) {
        if (currentConfig.currentIndex >= currentConfig.totalCount) {
            return null;
        }
    }

    const nextDueDate = addPeriodSafe(payment.dueDate, payment.recurringFrequency);
    if (!nextDueDate) return null;

    const normNextDueDate = normalizeDateString(nextDueDate);

    const alreadyExists = allPayments.some(p => {
        if (!p) return false;
        const sameInst = String(p.institution || '').trim().toLowerCase() === String(payment.institution || '').trim().toLowerCase();
        const sameType = String(p.type || '').trim().toUpperCase() === String(payment.type || '').trim().toUpperCase();
        const pDate = normalizeDateString(p.dueDate);
        return sameInst && sameType && pDate === normNextDueDate;
    });

    if (alreadyExists) {
        return null;
    }

    let nextFrequencyStr = payment.recurringFrequency || 'MONTHLY';
    if (currentConfig.type === 'COUNT' && currentConfig.totalCount) {
        nextFrequencyStr = encodeRecurringConfig({
            frequency: currentConfig.frequency,
            type: 'COUNT',
            totalCount: currentConfig.totalCount,
            currentIndex: currentConfig.currentIndex + 1
        });
    }

    const nextPayment = { ...payment };
    delete nextPayment.id;
    nextPayment.status = 'PENDING';
    nextPayment.dueDate = nextDueDate;
    nextPayment.recurringFrequency = nextFrequencyStr;

    if (payment.statementDate) {
        nextPayment.statementDate = addPeriodSafe(payment.statementDate, payment.recurringFrequency);
    }

    if (payment.type === 'CREDIT_CARD') {
        nextPayment.amount = 0;
        nextPayment.minPayment = 0;
        nextPayment.paymentAmount = 0;
        nextPayment.balance = 0;
    } else {
        nextPayment.paymentAmount = nextPayment.amount;
        nextPayment.balance = 0;
    }

    return nextPayment;
}
