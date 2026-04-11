import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { supabase } from '../services/supabase';
import { mapPaymentFromDB, mapPaymentToDB, mapAccountFromDB, mapAccountToDB } from '../services/mappers';
import {
    registerForPushNotificationsAsync,
    sendNotification,
    getPaymentsNeedingUpdate,
    buildStatementReminderMessage,
    getPaymentsDueSoon,
    buildDueSoonMessage,
    getPaymentsDueToday,
    buildDueTodayMessage,
    getOverduePayments,
    buildOverdueMessage,
    buildWeeklySummary,
    buildMonthlySummary,
    buildStartupAlert,
    canSendInThisSlot,
    schedulePaymentReminders,
    DEFAULT_NOTIFICATION_PREFS,
} from '../services/NotificationService';
import { checkForUpdates } from '../services/UpdateService';

const DataContext = createContext();

export function useData() {
    const context = useContext(DataContext);
    if (!context) throw new Error('useData must be used within DataProvider');
    return context;
}

export function DataProvider({ children }) {
    const [session, setSession] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [dataLoading, setDataLoading] = useState(false);
    const [accounts, setAccounts] = useState([]);
    const [payments, setPayments] = useState([]);
    const [userProfile, setUserProfile] = useState({});

    // Notification tracking
    const notifSentTracker = useRef({});
    const notifRegistered = useRef(false);

    // -- Auth Listener --
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session?.user) fetchData(session.user.id);
            setAuthLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session?.user) {
                fetchData(session.user.id);
            } else {
                setAccounts([]);
                setPayments([]);
                setUserProfile({});
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // -- Register for Notifications and Update Checking --
    useEffect(() => {
        if (!notifRegistered.current) {
            notifRegistered.current = true;
            registerForPushNotificationsAsync();
            // Açılışta sessizce güncelleme kontrol et
            checkForUpdates(true);
        }
    }, []);

    // -- Fetch All Data --
    const fetchData = async (userId) => {
        setDataLoading(true);
        try {
            const { data: accData } = await supabase.from('accounts').select('*').eq('user_id', userId);
            setAccounts((accData || []).map(mapAccountFromDB));

            const { data: payData } = await supabase.from('payments').select('*').eq('user_id', userId);
            setPayments((payData || []).map(mapPaymentFromDB));

            const { data: profData } = await supabase.from('profiles').select('*').eq('id', userId).single();
            if (profData) {
                setUserProfile({
                    fullName: profData.full_name,
                    phone: profData.phone,
                    dob: profData.dob,
                    linkedAccounts: profData.linked_accounts || {},
                    backupConfig: profData.backup_config || {},
                    notificationPrefs: profData.notification_prefs || {},
                });
            }
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setDataLoading(false);
        }
    };

    // ═══════════════════════════════════════════
    //  NOTIFICATION SCHEDULER
    // ═══════════════════════════════════════════

    const getNotifPrefs = useCallback(() => ({
        ...DEFAULT_NOTIFICATION_PREFS,
        ...(userProfile.notificationPrefs || {}),
    }), [userProfile.notificationPrefs]);

    // Schedule future payment reminders when payments change
    useEffect(() => {
        if (payments.length > 0) {
            schedulePaymentReminders(payments);
        }
    }, [payments]);

    // Periodic notification checks (every 5 minutes)
    useEffect(() => {
        const prefs = getNotifPrefs();
        if (Object.values(prefs).every(v => v === false)) return;

        const runChecks = async () => {
            try {
                const now = new Date();
                const hour = now.getHours();
                const tracker = notifSentTracker.current;

                // 1. Statement Reminder (3x/day at 09, 13, 18)
                if (prefs.statementReminder && [9, 13, 18].includes(hour)) {
                    const needing = getPaymentsNeedingUpdate(payments);
                    if (needing.length > 0 && canSendInThisSlot('statement', tracker)) {
                        const msg = buildStatementReminderMessage(needing);
                        if (msg) await sendNotification(msg.title, msg.body);
                    }
                }

                // 2. Due Soon (1x/day at 09)
                if (prefs.dueSoon && hour === 9) {
                    const { threeDays, oneDays } = getPaymentsDueSoon(payments);
                    if (threeDays.length > 0 && canSendInThisSlot('due3', tracker)) {
                        const msg = buildDueSoonMessage(threeDays, 3);
                        if (msg) await sendNotification(msg.title, msg.body);
                    }
                    if (oneDays.length > 0 && canSendInThisSlot('due1', tracker)) {
                        const msg = buildDueSoonMessage(oneDays, 1);
                        if (msg) await sendNotification(msg.title, msg.body);
                    }
                }

                // 3. Due Today (1x/day at 09)
                if (prefs.dueToday && hour === 9) {
                    const today = getPaymentsDueToday(payments);
                    if (today.length > 0 && canSendInThisSlot('dueToday', tracker)) {
                        const msg = buildDueTodayMessage(today);
                        if (msg) await sendNotification(msg.title, msg.body, 'alerts');
                    }
                }

                // 4. Overdue (1x/day at 10)
                if (prefs.overdue && hour === 10) {
                    const overdue = getOverduePayments(payments);
                    if (overdue.length > 0 && canSendInThisSlot('overdue', tracker)) {
                        const msg = buildOverdueMessage(overdue);
                        if (msg) await sendNotification(msg.title, msg.body, 'alerts');
                    }
                }

                // 5. Weekly Summary (Monday at 09)
                if (prefs.weeklySummary && now.getDay() === 1 && hour === 9) {
                    if (canSendInThisSlot('weekly', tracker)) {
                        const msg = buildWeeklySummary(payments);
                        if (msg) await sendNotification(msg.title, msg.body, 'summaries');
                    }
                }

                // 6. Monthly Summary (1st of month at 09)
                if (prefs.monthlySummary && now.getDate() === 1 && hour === 9) {
                    if (canSendInThisSlot('monthly', tracker)) {
                        const msg = buildMonthlySummary(payments);
                        if (msg) await sendNotification(msg.title, msg.body, 'summaries');
                    }
                }
            } catch (err) {
                console.error('Notification check failed:', err);
            }
        };

        // Run checks immediately and every 5 minutes
        runChecks();
        const interval = setInterval(runChecks, 5 * 60 * 1000);

        return () => clearInterval(interval);
    }, [payments, getNotifPrefs]);

    // Startup alerts (runs once, 5s after data loads)
    useEffect(() => {
        if (payments.length === 0) return;

        const prefs = getNotifPrefs();
        if (!prefs.startupAlert) return;

        const timeout = setTimeout(async () => {
            try {
                const msgs = buildStartupAlert(payments);
                for (const msg of msgs) {
                    await sendNotification(msg.title, msg.body, msg.channel || 'alerts');
                }
            } catch (err) {
                console.error('Startup alert failed:', err);
            }
        }, 5000);

        return () => clearTimeout(timeout);
    }, [payments.length > 0]); // Only run once when payments first load

    // Re-check notifications when app comes to foreground
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'active') {
                // Reset tracker to allow fresh checks
                notifSentTracker.current = {};
            }
        });

        return () => subscription?.remove();
    }, []);

    // -- Update User Profile --
    const updateUserProfile = useCallback(async (newData) => {
        setUserProfile(prev => ({ ...prev, ...newData }));

        if (session?.user) {
            const updates = { updated_at: new Date() };
            if (newData.fullName !== undefined) updates.full_name = newData.fullName;
            if (newData.phone !== undefined) updates.phone = newData.phone;
            if (newData.dob !== undefined) updates.dob = newData.dob;
            if (newData.linkedAccounts !== undefined) updates.linked_accounts = newData.linkedAccounts;
            if (newData.backupConfig !== undefined) updates.backup_config = newData.backupConfig;
            if (newData.notificationPrefs !== undefined) updates.notification_prefs = newData.notificationPrefs;

            try {
                const { error } = await supabase
                    .from('profiles')
                    .upsert({ id: session.user.id, ...updates });
                if (error) throw error;
            } catch (err) {
                console.error('Profile update error:', err);
            }
        }
    }, [session]);

    // -- Payment CRUD --
    const addPayment = useCallback(async (payment) => {
        if (!session?.user) return;
        const dbPayment = mapPaymentToDB(payment, session.user.id);
        const { data, error } = await supabase.from('payments').insert([dbPayment]).select().single();
        if (error) { console.error('Add payment error:', error); return; }
        setPayments(prev => [...prev, mapPaymentFromDB(data)]);
    }, [session]);

    const updatePayment = useCallback(async (id, updates) => {
        if (!session?.user) return;
        const dbUpdates = {};
        if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
        if (updates.minPayment !== undefined) dbUpdates.min_payment = updates.minPayment;
        if (updates.paymentAmount !== undefined) dbUpdates.payment_amount = updates.paymentAmount;
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.institution !== undefined) dbUpdates.institution = updates.institution;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
        if (updates.statementDate !== undefined) dbUpdates.statement_date = updates.statementDate;
        if (updates.type !== undefined) dbUpdates.type = updates.type;
        if (updates.balance !== undefined) dbUpdates.balance = updates.balance;
        if (updates.isRecurring !== undefined) dbUpdates.is_recurring = updates.isRecurring;
        if (updates.recurringFrequency !== undefined) dbUpdates.recurring_frequency = updates.recurringFrequency;

        const { data, error } = await supabase.from('payments').update(dbUpdates).eq('id', id).select().single();
        if (error) { console.error('Update payment error:', error); return; }
        setPayments(prev => prev.map(p => p.id === id ? mapPaymentFromDB(data) : p));
    }, [session]);

    const deletePayment = useCallback(async (id) => {
        const { error } = await supabase.from('payments').delete().eq('id', id);
        if (error) { console.error('Delete payment error:', error); return; }
        setPayments(prev => prev.filter(p => p.id !== id));
    }, []);

    // -- Account CRUD --
    const addAccount = useCallback(async (account) => {
        if (!session?.user) return;
        const dbAccount = mapAccountToDB(account, session.user.id);
        const { data, error } = await supabase.from('accounts').insert([dbAccount]).select().single();
        if (error) { console.error('Add account error:', error); return; }
        setAccounts(prev => [...prev, mapAccountFromDB(data)]);
    }, [session]);

    const updateAccount = useCallback(async (id, updates) => {
        const dbUpdates = {};
        if (updates.institution !== undefined) dbUpdates.institution = updates.institution;
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.balance !== undefined) dbUpdates.balance = updates.balance;
        if (updates.available !== undefined) dbUpdates.available = updates.available;
        if (updates.type !== undefined) dbUpdates.type = updates.type;
        if (updates.currency !== undefined) dbUpdates.currency = updates.currency;
        if (updates.transactions !== undefined) dbUpdates.transactions = updates.transactions;

        const { data, error } = await supabase.from('accounts').update(dbUpdates).eq('id', id).select().single();
        if (error) { console.error('Update account error:', error); return; }
        setAccounts(prev => prev.map(a => a.id === id ? mapAccountFromDB(data) : a));
    }, []);

    const deleteAccount = useCallback(async (id) => {
        const { error } = await supabase.from('accounts').delete().eq('id', id);
        if (error) { console.error('Delete account error:', error); return; }
        setAccounts(prev => prev.filter(a => a.id !== id));
    }, []);

    // -- Sign Out --
    const signOut = useCallback(async () => {
        await supabase.auth.signOut();
        setSession(null);
        setAccounts([]);
        setPayments([]);
        setUserProfile({});
    }, []);

    // -- Money Formatter --
    const formatMoney = (amount) => {
        if (amount == null || isNaN(amount)) return '0,00';
        let [intPart, decimalPart] = Number(amount).toFixed(2).split('.');
        intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        return `${intPart},${decimalPart}`;
    };

    const value = {
        session, authLoading, dataLoading,
        accounts, payments, userProfile,
        addPayment, updatePayment, deletePayment,
        addAccount, updateAccount, deleteAccount,
        updateUserProfile, signOut, fetchData, formatMoney,
    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
