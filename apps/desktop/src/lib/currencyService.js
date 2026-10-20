/**
 * Currency Service — TCMB (Türkiye Cumhuriyet Merkez Bankası)
 * Daily Exchange Rates (Efektif Satış / Banknote Selling)
 */

export const DEFAULT_RATES = {
    TRY: 1,
    USD: 49.65,
    EUR: 55.70,
    GBP: 66.38
};

const CACHE_KEY = 'monty_tcmb_rates';
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour cache

export const parseTCMBXml = (xmlText) => {
    const currencies = ['USD', 'EUR', 'GBP'];
    const rates = { TRY: 1 };

    for (const code of currencies) {
        // Priority 1: BanknoteSelling (Efektif Satış)
        const bRe = new RegExp(`<Currency[^>]+Kod="${code}"[\\s\\S]*?<BanknoteSelling>([^<]*)<`, 'i');
        const bMatch = xmlText.match(bRe);
        let val = bMatch && bMatch[1] ? parseFloat(bMatch[1].replace(',', '.')) : null;

        // Priority 2: ForexSelling (Döviz Satış - fallback)
        if (!val) {
            const fRe = new RegExp(`<Currency[^>]+Kod="${code}"[\\s\\S]*?<ForexSelling>([^<]*)<`, 'i');
            const fMatch = xmlText.match(fRe);
            val = fMatch && fMatch[1] ? parseFloat(fMatch[1].replace(',', '.')) : null;
        }

        if (val && !isNaN(val)) {
            rates[code] = val;
        }
    }

    return rates;
};

export const fetchTCMBRates = async () => {
    // Check localStorage cache first
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            const { rates, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_DURATION_MS) {
                return rates;
            }
        }
    } catch (e) {
        // Ignore cache parse error
    }

    // Try Electron IPC first (native request without CORS)
    if (window.electronAPI?.getCurrencyRates) {
        try {
            const res = await window.electronAPI.getCurrencyRates();
            if (res.success && res.rates) {
                const rates = { ...DEFAULT_RATES, ...res.rates };
                localStorage.setItem(CACHE_KEY, JSON.stringify({ rates, timestamp: Date.now() }));
                return rates;
            }
        } catch (e) {
            console.warn('IPC currency fetch failed, trying direct fetch:', e);
        }
    }

    // Fallback: direct fetch (or web mode)
    try {
        const response = await fetch('https://www.tcmb.gov.tr/kurlar/today.xml');
        if (response.ok) {
            const xml = await response.text();
            const parsed = parseTCMBXml(xml);
            const rates = { ...DEFAULT_RATES, ...parsed };
            localStorage.setItem(CACHE_KEY, JSON.stringify({ rates, timestamp: Date.now() }));
            return rates;
        }
    } catch (err) {
        console.warn('Direct TCMB fetch failed, using fallback defaults:', err);
    }

    return DEFAULT_RATES;
};

export const convertToTRY = (amount, currency = 'TRY', rates = DEFAULT_RATES) => {
    const num = parseFloat(amount) || 0;
    const rate = rates[currency] || (currency === 'TRY' ? 1 : null);
    if (!rate) return num;
    return num * rate;
};
