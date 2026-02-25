/**
 * Notification Service — All notification types for Monty
 *
 * Types:
 * 1. statementReminder  — Hesap kesim sonrası tutar girişi hatırlatması (3x/gün)
 * 2. dueSoon            — Son ödeme tarihi yaklaşıyor (3 gün, 1 gün önce)
 * 3. dueToday           — Bugün son ödeme günü
 * 4. overdue            — Ödeme gecikti
 * 5. weeklySummary      — Haftalık özet (Pazartesi 09:00)
 * 6. monthlySummary     — Ay başı özeti (1'i 09:00)
 * 7. backupStatus       — Yedekleme başarılı/başarısız
 * 8. startupAlert       — Uygulama açılışında geciken/bugünkü ödemeler
 */

// Default notification preferences
export const DEFAULT_NOTIFICATION_PREFS = {
    statementReminder: true,
    dueSoon: true,
    dueToday: true,
    overdue: true,
    weeklySummary: true,
    monthlySummary: true,
    backupStatus: true,
    startupAlert: true
};

// Statement reminder schedule: 3 times per day
const REMINDER_HOURS = [9, 13, 18];

// ─────────────────────────────────────────────
//  Core: Send notification via Electron
// ─────────────────────────────────────────────

export const sendNotification = async (title, body) => {
    if (window.electronAPI?.showNotification) {
        return await window.electronAPI.showNotification({ title, body });
    }
    return { success: false };
};

// ─────────────────────────────────────────────
//  1. Statement Date Reminders
// ─────────────────────────────────────────────

export const getPaymentsNeedingUpdate = (payments) => {
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return payments.filter(payment => {
        if (!payment.statementDate) return false;

        let statementDay;
        if (typeof payment.statementDate === 'string' && payment.statementDate.includes('-')) {
            statementDay = new Date(payment.statementDate).getDate();
        } else {
            statementDay = parseInt(payment.statementDate);
        }

        if (isNaN(statementDay) || statementDay < 1 || statementDay > 31) return false;
        if (currentDay <= statementDay) return false;

        const statementDateThisMonth = new Date(currentYear, currentMonth, statementDay);
        if (payment.updatedAt) {
            const updatedAt = new Date(payment.updatedAt);
            if (updatedAt > statementDateThisMonth) return false;
        }

        return true;
    });
};

export const shouldSendStatementReminder = (lastNotificationTime) => {
    const now = new Date();
    const currentHour = now.getHours();

    if (!REMINDER_HOURS.includes(currentHour)) return false;

    if (lastNotificationTime) {
        const last = new Date(lastNotificationTime);
        if (
            last.getDate() === now.getDate() &&
            last.getMonth() === now.getMonth() &&
            last.getFullYear() === now.getFullYear() &&
            last.getHours() === currentHour
        ) {
            return false;
        }
    }

    return true;
};

export const buildStatementReminderMessage = (payments) => {
    if (payments.length === 0) return null;

    if (payments.length === 1) {
        const p = payments[0];
        return {
            title: '📋 Hesap Kesim Hatırlatması',
            body: `${p.institution || p.title} hesap kesim tarihi geçti. Yeni tutarları girmeyi unutmayın!`
        };
    }

    const names = payments.slice(0, 3).map(p => p.institution || p.title).join(', ');
    const extra = payments.length > 3 ? ` ve ${payments.length - 3} ödeme daha` : '';
    return {
        title: `📋 ${payments.length} Hesap Kesim Hatırlatması`,
        body: `${names}${extra} — yeni tutarları girmeyi unutmayın!`
    };
};

// ─────────────────────────────────────────────
//  2. Due Date Approaching (3 days, 1 day)
// ─────────────────────────────────────────────

export const getPaymentsDueSoon = (payments) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const in3Days = new Date(now);
    in3Days.setDate(in3Days.getDate() + 3);

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const results = { threeDays: [], oneDays: [] };

    payments.forEach(payment => {
        if (payment.status === 'PAID' || !payment.dueDate) return;

        const due = new Date(payment.dueDate);
        due.setHours(0, 0, 0, 0);

        const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

        if (diffDays === 3) {
            results.threeDays.push(payment);
        } else if (diffDays === 1) {
            results.oneDays.push(payment);
        }
    });

    return results;
};

export const buildDueSoonMessage = (payments, daysLeft) => {
    if (payments.length === 0) return null;

    const dayText = daysLeft === 3 ? '3 gün' : 'Yarın';
    const icon = daysLeft === 3 ? '⏰' : '⚠️';

    if (payments.length === 1) {
        const p = payments[0];
        const amount = (p.amount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 });
        return {
            title: `${icon} Son Ödeme ${dayText} Sonra`,
            body: `${p.institution || p.title} — ₺${amount}`
        };
    }

    const total = payments.reduce((s, p) => s + (p.amount || 0), 0);
    const totalStr = total.toLocaleString('tr-TR', { minimumFractionDigits: 2 });
    return {
        title: `${icon} ${payments.length} Ödemenin Son Tarihi ${dayText} Sonra`,
        body: `Toplam: ₺${totalStr}`
    };
};

// ─────────────────────────────────────────────
//  3. Due Today
// ─────────────────────────────────────────────

export const getPaymentsDueToday = (payments) => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    return payments.filter(p => {
        if (p.status === 'PAID' || !p.dueDate) return false;
        const dueStr = new Date(p.dueDate).toISOString().slice(0, 10);
        return dueStr === today;
    });
};

export const buildDueTodayMessage = (payments) => {
    if (payments.length === 0) return null;

    if (payments.length === 1) {
        const p = payments[0];
        const amount = (p.amount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 });
        return {
            title: '🔴 Bugün Son Ödeme Günü!',
            body: `${p.institution || p.title} — ₺${amount}`
        };
    }

    const total = payments.reduce((s, p) => s + (p.amount || 0), 0);
    const totalStr = total.toLocaleString('tr-TR', { minimumFractionDigits: 2 });
    return {
        title: `🔴 Bugün ${payments.length} Ödemeniz Var!`,
        body: `Toplam: ₺${totalStr}`
    };
};

// ─────────────────────────────────────────────
//  4. Overdue
// ─────────────────────────────────────────────

export const getOverduePayments = (payments) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return payments.filter(p => {
        if (p.status === 'PAID' || !p.dueDate) return false;
        const due = new Date(p.dueDate);
        due.setHours(0, 0, 0, 0);
        return due < now;
    });
};

export const buildOverdueMessage = (payments) => {
    if (payments.length === 0) return null;

    if (payments.length === 1) {
        const p = payments[0];
        const dueStr = new Date(p.dueDate).toLocaleDateString('tr-TR');
        return {
            title: '❗ Gecikmiş Ödeme!',
            body: `${p.institution || p.title} — Son ödeme: ${dueStr}`
        };
    }

    const total = payments.reduce((s, p) => s + (p.amount || 0), 0);
    const totalStr = total.toLocaleString('tr-TR', { minimumFractionDigits: 2 });
    return {
        title: `❗ ${payments.length} Gecikmiş Ödemeniz Var!`,
        body: `Toplam: ₺${totalStr}`
    };
};

// ─────────────────────────────────────────────
//  5. Weekly Summary (Pazartesi 09:00)
// ─────────────────────────────────────────────

export const buildWeeklySummary = (payments) => {
    const now = new Date();
    const endOfWeek = new Date(now);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    const upcoming = payments.filter(p => {
        if (p.status === 'PAID' || !p.dueDate) return false;
        const due = new Date(p.dueDate);
        return due >= now && due <= endOfWeek;
    });

    if (upcoming.length === 0) {
        return {
            title: '📊 Haftalık Özet',
            body: 'Bu hafta ödenmesi gereken bir ödeme yok. 👍'
        };
    }

    const total = upcoming.reduce((s, p) => s + (p.amount || 0), 0);
    const totalStr = total.toLocaleString('tr-TR', { minimumFractionDigits: 2 });
    return {
        title: `📊 Haftalık Özet — ${upcoming.length} Ödeme`,
        body: `Bu hafta ₺${totalStr} tutarında ${upcoming.length} ödemeniz var.`
    };
};

// ─────────────────────────────────────────────
//  6. Monthly Summary (Ayın 1'i 09:00)
// ─────────────────────────────────────────────

export const buildMonthlySummary = (payments) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const thisMonth = payments.filter(p => {
        if (p.status === 'PAID' || !p.dueDate) return false;
        const due = new Date(p.dueDate);
        return due.getMonth() === currentMonth && due.getFullYear() === currentYear;
    });

    if (thisMonth.length === 0) {
        const monthName = now.toLocaleDateString('tr-TR', { month: 'long' });
        return {
            title: `📅 ${monthName} Özeti`,
            body: 'Bu ay için bekleyen ödeme yok. 🎉'
        };
    }

    const total = thisMonth.reduce((s, p) => s + (p.amount || 0), 0);
    const totalStr = total.toLocaleString('tr-TR', { minimumFractionDigits: 2 });
    const monthName = now.toLocaleDateString('tr-TR', { month: 'long' });
    return {
        title: `📅 ${monthName} Özeti — ${thisMonth.length} Ödeme`,
        body: `Bu ay ₺${totalStr} tutarında ${thisMonth.length} ödemeniz var.`
    };
};

// ─────────────────────────────────────────────
//  7. Backup Status (called directly from DataContext)
// ─────────────────────────────────────────────

export const sendBackupNotification = async (success, error) => {
    if (success) {
        return sendNotification('☁️ Yedekleme Tamamlandı', 'Otomatik yedekleme başarıyla gerçekleştirildi.');
    } else {
        return sendNotification('⚠️ Yedekleme Başarısız', `Otomatik yedekleme sırasında hata oluştu: ${error || 'Bilinmeyen hata'}`);
    }
};

// ─────────────────────────────────────────────
//  8. Startup Alert
// ─────────────────────────────────────────────

export const buildStartupAlert = (payments) => {
    const overdue = getOverduePayments(payments);
    const dueToday = getPaymentsDueToday(payments);

    const messages = [];

    if (overdue.length > 0) {
        const total = overdue.reduce((s, p) => s + (p.amount || 0), 0);
        const totalStr = total.toLocaleString('tr-TR', { minimumFractionDigits: 2 });
        messages.push({
            title: `🔴 ${overdue.length} Gecikmiş Ödemeniz Var!`,
            body: `Toplam: ₺${totalStr}`
        });
    }

    if (dueToday.length > 0) {
        const total = dueToday.reduce((s, p) => s + (p.amount || 0), 0);
        const totalStr = total.toLocaleString('tr-TR', { minimumFractionDigits: 2 });
        messages.push({
            title: `📌 Bugün ${dueToday.length} Ödemeniz Var`,
            body: `Toplam: ₺${totalStr}`
        });
    }

    return messages;
};

// ─────────────────────────────────────────────
//  Utility: Time-slot dedup helper
// ─────────────────────────────────────────────

/**
 * Check if a specific notification type should fire in the current hour
 * Prevents duplicate notifications within the same hour
 */
export const canSendInThisSlot = (typeKey, sentTracker) => {
    const now = new Date();
    const slotKey = `${typeKey}_${now.toISOString().slice(0, 10)}_${now.getHours()}`;
    if (sentTracker[slotKey]) return false;
    sentTracker[slotKey] = true;
    return true;
};
