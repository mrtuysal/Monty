/**
 * Account & Institution Ordering Service for Desktop
 * Persists and applies user's custom drag-and-drop order for institutions and accounts.
 */

const INSTITUTION_ORDER_KEY = 'monty_institution_order';
const ACCOUNT_ORDER_KEY = 'monty_account_order';

export function getSavedOrdering() {
    try {
        const instRaw = localStorage.getItem(INSTITUTION_ORDER_KEY);
        const accRaw = localStorage.getItem(ACCOUNT_ORDER_KEY);
        return {
            institutionOrder: instRaw ? JSON.parse(instRaw) : [],
            accountOrder: accRaw ? JSON.parse(accRaw) : []
        };
    } catch (e) {
        console.error('Error reading saved account order:', e);
        return { institutionOrder: [], accountOrder: [] };
    }
}

export function saveOrdering(accountsList) {
    if (!Array.isArray(accountsList)) return;
    try {
        // Derive institution unique order from the given accounts list
        const institutionOrder = [];
        const seenInst = new Set();
        accountsList.forEach(a => {
            const inst = a.institution || 'Diğer';
            if (!seenInst.has(inst)) {
                seenInst.add(inst);
                institutionOrder.push(inst);
            }
        });

        const accountOrder = accountsList.map(a => a.id).filter(Boolean);

        localStorage.setItem(INSTITUTION_ORDER_KEY, JSON.stringify(institutionOrder));
        localStorage.setItem(ACCOUNT_ORDER_KEY, JSON.stringify(accountOrder));
    } catch (e) {
        console.error('Error saving account order:', e);
    }
}

export function applyOrdering(rawAccounts) {
    if (!Array.isArray(rawAccounts) || rawAccounts.length === 0) return rawAccounts;
    const { institutionOrder, accountOrder } = getSavedOrdering();

    if (institutionOrder.length === 0 && accountOrder.length === 0) {
        return rawAccounts;
    }

    const instMap = new Map();
    institutionOrder.forEach((inst, idx) => instMap.set(inst, idx));

    const accMap = new Map();
    accountOrder.forEach((id, idx) => accMap.set(id, idx));

    return [...rawAccounts].sort((a, b) => {
        const instA = a.institution || 'Diğer';
        const instB = b.institution || 'Diğer';

        const instOrderA = instMap.has(instA) ? instMap.get(instA) : 99999;
        const instOrderB = instMap.has(instB) ? instMap.get(instB) : 99999;

        if (instOrderA !== instOrderB) {
            return instOrderA - instOrderB;
        }

        const accOrderA = accMap.has(a.id) ? accMap.get(a.id) : 99999;
        const accOrderB = accMap.has(b.id) ? accMap.get(b.id) : 99999;

        return accOrderA - accOrderB;
    });
}
