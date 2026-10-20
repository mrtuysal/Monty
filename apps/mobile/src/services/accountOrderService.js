/**
 * Account & Institution Ordering Service for Mobile App
 * Persists and applies custom order for institutions and accounts using AsyncStorage.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const INSTITUTION_ORDER_KEY = '@monty_institution_order';
const ACCOUNT_ORDER_KEY = '@monty_account_order';

export async function getSavedOrdering() {
    try {
        const [instRaw, accRaw] = await Promise.all([
            AsyncStorage.getItem(INSTITUTION_ORDER_KEY),
            AsyncStorage.getItem(ACCOUNT_ORDER_KEY)
        ]);
        return {
            institutionOrder: instRaw ? JSON.parse(instRaw) : [],
            accountOrder: accRaw ? JSON.parse(accRaw) : []
        };
    } catch (e) {
        console.error('Mobile: Error reading saved account order:', e);
        return { institutionOrder: [], accountOrder: [] };
    }
}

export async function saveOrdering(accountsList) {
    if (!Array.isArray(accountsList)) return;
    try {
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

        await Promise.all([
            AsyncStorage.setItem(INSTITUTION_ORDER_KEY, JSON.stringify(institutionOrder)),
            AsyncStorage.setItem(ACCOUNT_ORDER_KEY, JSON.stringify(accountOrder))
        ]);
    } catch (e) {
        console.error('Mobile: Error saving account order:', e);
    }
}

export function sortAccountsWithOrder(rawAccounts, institutionOrder = [], accountOrder = []) {
    if (!Array.isArray(rawAccounts) || rawAccounts.length === 0) return rawAccounts;
    if (institutionOrder.length === 0 && accountOrder.length === 0) return rawAccounts;

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
