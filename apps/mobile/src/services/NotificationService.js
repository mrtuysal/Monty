/**
 * Notification Service — All notification types for Monty Mobile
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

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// ─────────────────────────────────────────────
//  Setup & Configuration
// ─────────────────────────────────────────────

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

// Default notification preferences
export const DEFAULT_NOTIFICATION_PREFS = {
    statementReminder: true,
    dueSoon: true,
    dueToday: true,
    overdue: true,
    weeklySummary: true,
    monthlySummary: true,
    backupStatus: true,
    startupAlert: true,
};

// Statement reminder schedule: 3 times per day
const REMINDER_HOURS = [9, 13, 18];

// ─────────────────────────────────────────────
//  Permission & Channel Registration
// ─────────────────────────────────────────────

export async function registerForPushNotificationsAsync() {
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('payment-reminders', {
            name: 'Ödeme Hatırlatmaları',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#6C63FF',
            sound: 'default',
        });

        await Notifications.setNotificationChannelAsync('summaries', {
            name: 'Özetler',
            importance: Notifications.AndroidImportance.DEFAULT,
            sound: 'default',
        });

        await Notifications.setNotificationChannelAsync('alerts', {
            name: 'Uyarılar',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 500, 250, 500],
            lightColor: '#FF453A',
            sound: 'default',
        });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.log('Notification permission not granted.');
        return false;
    }

    return true;
}

// ─────────────────────────────────────────────
//  Core: Send local notification
// ─────────────────────────────────────────────

export const sendNotification = async (title, body, channelId = 'payment-reminders') => {
    try {
        await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                sound: 'default',
                ...(Platform.OS === 'android' && { channelId }),
            },
            trigger: null, // Send immediately
        });
        return { success: true };
    } catch (err) {
        console.error('Failed to send notification:', err);
        return { success: false, error: err.message };
    }
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

export const buildStatementReminderMessage = (payments) => {
    if (payments.length === 0) return null;

    if (payments.length === 1) {
        const p = payments[0];
        return {
            title: '📋 Hesap Kesim Hatırlatması',
            body: `${p.institution || p.description} hesap kesim tarihi geçti. Yeni tutarları girmeyi unutmayın!`
        };
    }

    const names = payments.slice(0, 3).map(p => p.institution || p.description).join(', ');
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
            body: `${p.institution || p.description} — ₺${amount}`
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
            body: `${p.institution || p.description} — ₺${amount}`
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
            body: `${p.institution || p.description} — Son ödeme: ${dueStr}`
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

    const monthNames = [
        'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
        'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];
    const monthName = monthNames[currentMonth];

    if (thisMonth.length === 0) {
        return {
            title: `📅 ${monthName} Özeti`,
            body: 'Bu ay için bekleyen ödeme yok. 🎉'
        };
    }

    const total = thisMonth.reduce((s, p) => s + (p.amount || 0), 0);
    const totalStr = total.toLocaleString('tr-TR', { minimumFractionDigits: 2 });
    return {
        title: `📅 ${monthName} Özeti — ${thisMonth.length} Ödeme`,
        body: `Bu ay ₺${totalStr} tutarında ${thisMonth.length} ödemeniz var.`
    };
};

// ─────────────────────────────────────────────
//  7. Backup Status
// ─────────────────────────────────────────────

export const sendBackupNotification = async (success, error) => {
    if (success) {
        return sendNotification(
            '☁️ Yedekleme Tamamlandı',
            'Otomatik yedekleme başarıyla gerçekleştirildi.',
            'summaries'
        );
    } else {
        return sendNotification(
            '⚠️ Yedekleme Başarısız',
            `Otomatik yedekleme sırasında hata oluştu: ${error || 'Bilinmeyen hata'}`,
            'alerts'
        );
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
            body: `Toplam: ₺${totalStr}`,
            channel: 'alerts'
        });
    }

    if (dueToday.length > 0) {
        const total = dueToday.reduce((s, p) => s + (p.amount || 0), 0);
        const totalStr = total.toLocaleString('tr-TR', { minimumFractionDigits: 2 });
        messages.push({
            title: `📌 Bugün ${dueToday.length} Ödemeniz Var`,
            body: `Toplam: ₺${totalStr}`,
            channel: 'payment-reminders'
        });
    }

    return messages;
};

// ─────────────────────────────────────────────
//  Utility: Time-slot dedup helper
// ─────────────────────────────────────────────

export const canSendInThisSlot = (typeKey, sentTracker) => {
    const now = new Date();
    const slotKey = `${typeKey}_${now.toISOString().slice(0, 10)}_${now.getHours()}`;
    if (sentTracker[slotKey]) return false;
    sentTracker[slotKey] = true;
    return true;
};

// ─────────────────────────────────────────────
//  Schedule future notifications for payments
// ─────────────────────────────────────────────

export async function schedulePaymentReminders(payments) {
    // Cancel all existing scheduled notifications first
    await Notifications.cancelAllScheduledNotificationsAsync();

    const now = new Date();

    for (const payment of payments) {
        if (payment.status === 'PAID' || !payment.dueDate) continue;

        const dueDate = new Date(payment.dueDate);
        if (dueDate < now) continue; // Skip past due dates

        const institution = payment.institution || payment.description || 'Ödeme';
        const amount = (payment.amount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 });

        // Schedule: 3 days before
        const threeDaysBefore = new Date(dueDate);
        threeDaysBefore.setDate(threeDaysBefore.getDate() - 3);
        threeDaysBefore.setHours(9, 0, 0, 0);
        if (threeDaysBefore > now) {
            try {
                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: '⏰ Son Ödeme 3 Gün Sonra',
                        body: `${institution} — ₺${amount}`,
                        sound: 'default',
                        ...(Platform.OS === 'android' && { channelId: 'payment-reminders' }),
                    },
                    trigger: { date: threeDaysBefore },
                });
            } catch (e) { /* skip invalid dates */ }
        }

        // Schedule: 1 day before
        const oneDayBefore = new Date(dueDate);
        oneDayBefore.setDate(oneDayBefore.getDate() - 1);
        oneDayBefore.setHours(9, 0, 0, 0);
        if (oneDayBefore > now) {
            try {
                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: '⚠️ Son Ödeme Yarın!',
                        body: `${institution} — ₺${amount}`,
                        sound: 'default',
                        ...(Platform.OS === 'android' && { channelId: 'payment-reminders' }),
                    },
                    trigger: { date: oneDayBefore },
                });
            } catch (e) { /* skip invalid dates */ }
        }

        // Schedule: Due day morning
        const dueMorning = new Date(dueDate);
        dueMorning.setHours(9, 0, 0, 0);
        if (dueMorning > now) {
            try {
                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: '🔴 Bugün Son Ödeme Günü!',
                        body: `${institution} — ₺${amount}`,
                        sound: 'default',
                        ...(Platform.OS === 'android' && { channelId: 'alerts' }),
                    },
                    trigger: { date: dueMorning },
                });
            } catch (e) { /* skip invalid dates */ }
        }
    }
}

// Cancel a specific notification
export async function cancelNotification(notificationId) {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
}
