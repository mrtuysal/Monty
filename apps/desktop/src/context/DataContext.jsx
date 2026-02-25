import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { mapPaymentFromDB, mapPaymentToDB, mapAccountFromDB, mapAccountToDB } from '../lib/mappers';

const DataContext = createContext();

export function useData() {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
}

export function DataProvider({ children }) {
    const [dataLoading, setDataLoading] = useState(false);
    const [accounts, setAccounts] = useState([]);
    const [payments, setPayments] = useState([]);
    const [userProfile, setUserProfile] = useState({});
    const [session, setSession] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);

    // Backup Overlay State - Moved to top to fix ReferenceError
    const [isBackupActive, setIsBackupActive] = useState(false);
    const [backupProgress, setBackupProgress] = useState(0);

    // Initial Data Fetching from Supabase
    const fetchData = async (userId) => {
        setDataLoading(true);
        try {
            // 1. Fetch Accounts
            const { data: accData, error: accError } = await supabase
                .from('accounts')
                .select('*')
                .eq('user_id', userId);

            if (accError) throw accError;
            setAccounts((accData || []).map(mapAccountFromDB));

            // 2. Fetch Payments
            const { data: payData, error: payError } = await supabase
                .from('payments')
                .select('*')
                .eq('user_id', userId);

            if (payError) throw payError;
            setPayments((payData || []).map(mapPaymentFromDB));

            // 3. Fetch Profile
            const { data: profData, error: profError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (profError && profError.code !== 'PGRST116') { // Ignore 'not found' error
                console.error("Profile fetch error:", profError);
            }

            if (profData) {
                // Map Supabase profile columns to our internal state structure
                setUserProfile({
                    fullName: profData.full_name,
                    phone: profData.phone,
                    dob: profData.dob,
                    linkedAccounts: profData.linked_accounts || { google: false, apple: false },
                    backupConfig: profData.backup_config || { frequency: 'OFF', lastBackup: null }
                });
            }

        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setDataLoading(false);
        }
    };

    // Auth Listener
    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session?.user) {
                fetchData(session.user.id);
            }
            setAuthLoading(false);
        });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session?.user) {
                fetchData(session.user.id);
            } else {
                setAccounts([]);
                setPayments([]);
                setUserProfile({});
            }
            setAuthLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);


    // --- CRUD Operations (Now with Supabase) ---

    // Generic helper could be added, but manual for now for clarity

    const addPayment = async (newPayment) => {
        // Optimistic UI update
        const tempId = crypto.randomUUID();
        const paymentWithTempId = { ...newPayment, id: tempId };
        setPayments(prev => [...prev, paymentWithTempId]);

        if (session?.user) {
            try {
                const { data, error } = await supabase.from('payments').insert([
                    mapPaymentToDB(newPayment, session.user.id)
                ]).select().single();

                if (error) throw error;

                setPayments(prev => prev.map(p => p.id === tempId ? mapPaymentFromDB(data) : p));

            } catch (err) {
                console.error("Error adding payment:", err);
                // Revert optimistic update
                setPayments(prev => prev.filter(p => p.id !== tempId));
                alert("Ödeme eklenirken hata oluştu.");
            }
        }
    };

    const updatePayment = async (updatedPayment) => {
        setPayments(prev => prev.map(p => p.id === updatedPayment.id ? updatedPayment : p));

        if (session?.user) {
            try {
                const { error } = await supabase.from('payments').update({
                    ...mapPaymentToDB(updatedPayment),
                    updated_at: new Date()
                }).eq('id', updatedPayment.id);

                if (error) throw error;
            } catch (err) {
                console.error("Error updating payment:", err);
            }
        }
    };

    const deletePayment = async (id) => {
        setPayments(prev => prev.filter(p => p.id !== id));

        if (session?.user) {
            try {
                const { error } = await supabase.from('payments').delete().eq('id', id);
                if (error) throw error;
            } catch (err) {
                console.error("Error deleting payment:", err);
            }
        }
    };

    // --- Account CRUD Operations (Supabase Synced) ---

    const addAccount = async (newAccount) => {
        const tempId = crypto.randomUUID();
        const accountWithTempId = { ...newAccount, id: tempId };
        setAccounts(prev => [...prev, accountWithTempId]);

        if (session?.user) {
            try {
                const { data, error } = await supabase.from('accounts').insert([
                    mapAccountToDB(newAccount, session.user.id)
                ]).select().single();

                if (error) throw error;

                setAccounts(prev => prev.map(a => a.id === tempId ? mapAccountFromDB(data) : a));
            } catch (err) {
                console.error("Error adding account:", err);
                setAccounts(prev => prev.filter(a => a.id !== tempId));
                alert("Hesap eklenirken hata oluştu.");
            }
        }
    };

    const updateAccount = async (updatedAccount) => {
        setAccounts(prev => prev.map(a => a.id === updatedAccount.id ? updatedAccount : a));

        if (session?.user) {
            try {
                const { error } = await supabase.from('accounts').update({
                    ...mapAccountToDB(updatedAccount),
                    updated_at: new Date()
                }).eq('id', updatedAccount.id);

                if (error) throw error;
            } catch (err) {
                console.error("Error updating account:", err);
            }
        }
    };

    const deleteAccount = async (id) => {
        setAccounts(prev => prev.filter(a => a.id !== id));

        if (session?.user) {
            try {
                const { error } = await supabase.from('accounts').delete().eq('id', id);
                if (error) throw error;
            } catch (err) {
                console.error("Error deleting account:", err);
            }
        }
    };

    const updateUserProfile = async (newData) => {
        setUserProfile(prev => ({ ...prev, ...newData }));

        if (session?.user) {
            // Merge with existing profile state to send full object or just specific fields?
            // Safer to just upsert specific fields we know changed, but for simplicity let's handle mapped fields.

            const updates = {
                updated_at: new Date(),
            };

            if (newData.fullName !== undefined) updates.full_name = newData.fullName;
            if (newData.phone !== undefined) updates.phone = newData.phone;
            if (newData.dob !== undefined) updates.dob = newData.dob;
            if (newData.linkedAccounts !== undefined) updates.linked_accounts = newData.linkedAccounts;
            if (newData.backupConfig !== undefined) updates.backup_config = newData.backupConfig;

            try {
                const { error } = await supabase
                    .from('profiles')
                    .upsert({ id: session.user.id, ...updates });

                if (error) throw error;
            } catch (err) {
                console.error("Error updating profile:", err);
            }
        }
    };

    // Backup Logic — Supabase Storage Cloud Backup
    const backupIntervalRef = useRef(null);

    const performBackup = async (showOverlay = true) => {
        if (showOverlay) {
            setIsBackupActive(true);
            setBackupProgress(0);
        }

        // Animate progress bar
        if (backupIntervalRef.current) clearInterval(backupIntervalRef.current);
        let progress = 0;
        const progressPromise = new Promise(resolve => {
            backupIntervalRef.current = setInterval(() => {
                progress += 2;
                setBackupProgress(Math.min(progress, 90)); // Cap at 90% until upload finishes
                if (progress >= 90) {
                    clearInterval(backupIntervalRef.current);
                    resolve();
                }
            }, 30);
        });

        try {
            const backupData = {
                version: '1.0',
                date: new Date().toISOString(),
                profile: userProfile,
                accounts: accounts,
                payments: payments
            };

            // Wait for progress animation to reach 90%
            await progressPromise;

            // Upload to Supabase Storage
            if (session?.user) {
                const { uploadBackup } = await import('../lib/backupService');
                const result = await uploadBackup(session.user.id, backupData);

                if (!result.success) {
                    throw new Error(result.error || 'Upload failed');
                }
            }

            // Complete progress
            setBackupProgress(100);

            // Update last backup time
            updateUserProfile({
                backupConfig: {
                    ...userProfile.backupConfig,
                    lastBackup: new Date().toISOString()
                }
            });

            setTimeout(() => {
                setIsBackupActive(false);
                setBackupProgress(0);
            }, 600);

            return { success: true };
        } catch (e) {
            console.error("Cloud backup failed:", e);
            if (backupIntervalRef.current) clearInterval(backupIntervalRef.current);
            setIsBackupActive(false);
            setBackupProgress(0);
            return { success: false, error: e.message };
        }
    };

    // Download a local copy of the backup (export as .json file)
    const downloadBackupLocal = () => {
        try {
            const backupData = {
                version: '1.0',
                date: new Date().toISOString(),
                profile: userProfile,
                accounts: accounts,
                payments: payments
            };

            const dataStr = JSON.stringify(backupData, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `monty_backup_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error("Local backup export failed:", e);
        }
    };

    // Restore from a backup object
    const restoreFromBackup = (backupData) => {
        if (!backupData || !backupData.version) {
            return { success: false, error: 'Geçersiz yedek formatı' };
        }

        setAccounts(backupData.accounts || []);
        setPayments(backupData.payments || []);
        if (backupData.profile) {
            updateUserProfile(backupData.profile);
        }
        return { success: true };
    };

    const cancelBackup = () => {
        if (backupIntervalRef.current) clearInterval(backupIntervalRef.current);
        setIsBackupActive(false);
        setBackupProgress(0);
    };

    // Startup Checks (Cloud & Missed Backups)
    useEffect(() => {
        // 1. Simulate Cloud Check
        if (userProfile.linkedAccounts?.google || userProfile.linkedAccounts?.apple) {
            // Cloud account verification placeholder
        }

        // 2. Check for Missed Backups
        const checkMissedBackup = () => {
            const config = userProfile.backupConfig;
            if (!config || config.frequency === 'OFF') return;

            const last = config.lastBackup ? new Date(config.lastBackup) : null;
            const now = new Date();

            let missed = false;

            if (!last) {
                missed = true; // Never backed up
            } else {
                const diffTime = Math.abs(now - last);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (config.frequency === 'DAILY' && diffDays >= 1) {
                    // Check if we crossed a 23:59 boundary since last backup
                    // Simple logic: if it's been more than 24h, definitely missed.
                    // Or if it's a new day and now is past scheduled time, but that's handled by scheduler if running.
                    // Here we handle "app was closed".
                    if (now.getDate() !== last.getDate()) missed = true;
                } else if (config.frequency === 'WEEKLY') {
                    // If more than 7 days, or if we crossed a Sunday
                    if (diffDays >= 7) missed = true;
                    // TODO: enhanced logic for specific day crossing
                } else if (config.frequency === 'MONTHLY') {
                    if (now.getMonth() !== last.getMonth() && now.getDate() >= 1) missed = true;
                }
            }

            if (missed) {
                performBackup(true);
            }
        };

        // Small timeout to allow app to settle before checking
        const timeout = setTimeout(checkMissedBackup, 2000);
        return () => clearTimeout(timeout);
    }, [userProfile.backupConfig]); // eslint-disable-line react-hooks/exhaustive-deps

    // Backup Scheduler
    useEffect(() => {
        const checkBackupSchedule = () => {
            const config = userProfile.backupConfig;
            if (!config || config.frequency === 'OFF') return;

            const now = new Date();
            // Check if it's 23:59 (allowing a 1-minute window)
            if (now.getHours() === 23 && now.getMinutes() === 59) {

                // Get last backup day to prevent multiple backups in same minute
                const last = config.lastBackup ? new Date(config.lastBackup) : null;
                const isBackedUpToday = last &&
                    last.getDate() === now.getDate() &&
                    last.getMonth() === now.getMonth() &&
                    last.getFullYear() === now.getFullYear();

                if (isBackedUpToday) return;

                let shouldBackup = false;

                if (config.frequency === 'DAILY') {
                    shouldBackup = true;
                } else if (config.frequency === 'WEEKLY') {
                    // Check if it's Sunday (0)
                    if (now.getDay() === 0) shouldBackup = true;
                } else if (config.frequency === 'MONTHLY') {
                    // Check if it's last day of month
                    const tomorrow = new Date(now);
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    if (tomorrow.getMonth() !== now.getMonth()) shouldBackup = true;
                }

                if (shouldBackup) performBackup(true);
            }
        };

        const timer = setInterval(checkBackupSchedule, 60000); // Check every minute
        return () => clearInterval(timer);
    }, [userProfile.backupConfig, performBackup]); // Re-run when config or backup function changes

    // === Notification Scheduler (all types) ===
    const notifSentTracker = useRef({});

    const getNotifPrefs = () => ({
        statementReminder: true,
        dueSoon: true,
        dueToday: true,
        overdue: true,
        weeklySummary: true,
        monthlySummary: true,
        backupStatus: true,
        startupAlert: true,
        ...(userProfile.notificationPrefs || {})
    });

    useEffect(() => {
        const prefs = getNotifPrefs();
        // If ALL are disabled, skip
        if (Object.values(prefs).every(v => v === false)) return;

        const runChecks = async () => {
            try {
                const ns = await import('../lib/notificationService');
                const now = new Date();
                const hour = now.getHours();
                const tracker = notifSentTracker.current;

                // 1. Statement Reminder (3x/day at 09, 13, 18)
                if (prefs.statementReminder && [9, 13, 18].includes(hour)) {
                    const needing = ns.getPaymentsNeedingUpdate(payments);
                    if (needing.length > 0 && ns.canSendInThisSlot('statement', tracker)) {
                        const msg = ns.buildStatementReminderMessage(needing);
                        if (msg) await ns.sendNotification(msg.title, msg.body);
                    }
                }

                // 2. Due Soon (1x/day at 09)
                if (prefs.dueSoon && hour === 9) {
                    const { threeDays, oneDays } = ns.getPaymentsDueSoon(payments);
                    if (threeDays.length > 0 && ns.canSendInThisSlot('due3', tracker)) {
                        const msg = ns.buildDueSoonMessage(threeDays, 3);
                        if (msg) await ns.sendNotification(msg.title, msg.body);
                    }
                    if (oneDays.length > 0 && ns.canSendInThisSlot('due1', tracker)) {
                        const msg = ns.buildDueSoonMessage(oneDays, 1);
                        if (msg) await ns.sendNotification(msg.title, msg.body);
                    }
                }

                // 3. Due Today (1x/day at 09)
                if (prefs.dueToday && hour === 9) {
                    const today = ns.getPaymentsDueToday(payments);
                    if (today.length > 0 && ns.canSendInThisSlot('dueToday', tracker)) {
                        const msg = ns.buildDueTodayMessage(today);
                        if (msg) await ns.sendNotification(msg.title, msg.body);
                    }
                }

                // 4. Overdue (1x/day at 10)
                if (prefs.overdue && hour === 10) {
                    const overdue = ns.getOverduePayments(payments);
                    if (overdue.length > 0 && ns.canSendInThisSlot('overdue', tracker)) {
                        const msg = ns.buildOverdueMessage(overdue);
                        if (msg) await ns.sendNotification(msg.title, msg.body);
                    }
                }

                // 5. Weekly Summary (Monday at 09)
                if (prefs.weeklySummary && now.getDay() === 1 && hour === 9) {
                    if (ns.canSendInThisSlot('weekly', tracker)) {
                        const msg = ns.buildWeeklySummary(payments);
                        if (msg) await ns.sendNotification(msg.title, msg.body);
                    }
                }

                // 6. Monthly Summary (1st of month at 09)
                if (prefs.monthlySummary && now.getDate() === 1 && hour === 9) {
                    if (ns.canSendInThisSlot('monthly', tracker)) {
                        const msg = ns.buildMonthlySummary(payments);
                        if (msg) await ns.sendNotification(msg.title, msg.body);
                    }
                }
            } catch (err) {
                console.error('Notification check failed:', err);
            }
        };

        // Startup alerts (runs once, 8s after mount)
        const startupTimeout = setTimeout(async () => {
            if (!prefs.startupAlert) return;
            try {
                const ns = await import('../lib/notificationService');
                const msgs = ns.buildStartupAlert(payments);
                for (const msg of msgs) {
                    await ns.sendNotification(msg.title, msg.body);
                }
            } catch (err) {
                console.error('Startup alert failed:', err);
            }
        }, 8000);

        // Periodic check every 5 minutes
        const interval = setInterval(runChecks, 5 * 60 * 1000);
        // Also run immediately (except startup alerts which have their own timer)
        runChecks();

        return () => {
            clearTimeout(startupTimeout);
            clearInterval(interval);
        };
    }, [payments, userProfile.notificationPrefs]);

    // Helper for formatting money INPUT (1.234,56)
    // This is the CRITICAL function for the user's issue
    const formatMoneyInput = (value) => {
        if (!value) return '';
        let val = value.toString();

        // Convenience: If user types a dot at the end (e.g. "123."), treat it as a decimal separator
        if (val.endsWith('.')) {
            val = val.slice(0, -1) + ',';
        }

        // Remove all dots (thousands visual separators) before processing
        const raw = val.replace(/\./g, '').replace(/[^0-9,]/g, '');

        const parts = raw.split(',');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        return parts.slice(0, 2).join(',');
    };

    const parseMoneyInput = (formattedValue) => {
        if (!formattedValue) return 0;
        if (typeof formattedValue === 'number') return formattedValue;
        // Remove dots, replace comma with dot for JS float
        const clean = formattedValue.replace(/\./g, '').replace(',', '.');
        return parseFloat(clean) || 0;
    };

    // Helper for Money Display (standard, not input)
    const formatCurrencyDisplay = (amount, currency = 'TRY') => {
        const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₺';
        return `${symbol} ${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const value = {
        accounts,
        setAccounts,
        addAccount,
        updateAccount,
        deleteAccount,
        payments,
        setPayments,
        addPayment,
        updatePayment,
        deletePayment,
        formatMoneyInput,
        parseMoneyInput,
        formatCurrencyDisplay,
        userProfile,
        setUserProfile,
        updateUserProfile,
        performBackup,
        downloadBackupLocal,
        restoreFromBackup,
        cancelBackup,
        isBackupActive,
        backupProgress,
        dataLoading,
        // Supabase Exports
        session,
        authLoading,
        supabase
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
}
