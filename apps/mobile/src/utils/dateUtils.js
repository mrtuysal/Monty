/**
 * Monty Mobile Tarih Formatlayıcı
 * Mobil arayüzde saatleri kaldırır, yalnızca GG.AA.YYYY formatında tarih döndürür.
 */

export function formatDate(val) {
    if (!val) return '—';

    try {
        if (typeof val === 'string') {
            // ISO veya saat içeren string ise saat kısmını temizle
            const datePart = val.split('T')[0].split(' ')[0].trim();

            // YYYY-MM-DD veya YYYY/MM/DD kontrolü
            const isoMatch = datePart.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
            if (isoMatch) {
                const year = isoMatch[1];
                const month = isoMatch[2].padStart(2, '0');
                const day = isoMatch[3].padStart(2, '0');
                return `${day}.${month}.${year}`;
            }

            // Zaten DD.MM.YYYY veya DD-MM-YYYY formatında ise
            const trMatch = datePart.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
            if (trMatch) {
                const day = trMatch[1].padStart(2, '0');
                const month = trMatch[2].padStart(2, '0');
                const year = trMatch[3];
                return `${day}.${month}.${year}`;
            }
        }

        const d = new Date(val);
        if (isNaN(d.getTime())) {
            return String(val).split('T')[0].split(' ')[0];
        }

        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();

        return `${day}.${month}.${year}`;
    } catch (e) {
        return String(val);
    }
}
