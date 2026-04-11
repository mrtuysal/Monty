import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors, Typography, Layout } from '../constants/Theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';

export default function DashboardScreen({ navigation }) {
    const { accounts, payments, userProfile, session, formatMoney, dataLoading } = useData();

    const financials = useMemo(() => {
        let total = 0, cash = 0, bank = 0;
        accounts.forEach(acc => {
            let amount = acc.balance || 0;
            if (acc.currency === 'USD') amount *= 32;
            total += amount;
            if (acc.type === 'CASH') cash += amount;
            else bank += amount;
        });
        return { total, cash, bank };
    }, [accounts]);

    const upcomingPayments = useMemo(() => {
        return [...payments]
            .filter(p => p.status !== 'PAID')
            .sort((a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0))
            .slice(0, 5);
    }, [payments]);

    const totalDue = useMemo(() => {
        return payments
            .filter(p => p.status !== 'PAID')
            .reduce((sum, p) => sum + (p.amount || 0), 0);
    }, [payments]);

    const userName = userProfile.fullName || session?.user?.user_metadata?.full_name || 'Kullanıcı';

    const typeEmojis = {
        CREDIT_CARD: '💳',
        BILL: '📄',
        LOAN: '🏦',
        OTHER: '📋',
    };

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={[Typography.h1, { marginBottom: 20 }]}>
                    Merhaba, {userName.split(' ')[0]} 👋
                </Text>

                {/* Total Balance Card */}
                <LinearGradient
                    colors={[Colors.primary, '#5a52d5']}
                    style={styles.balanceCard}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>Toplam Varlık</Text>
                    <Text style={styles.balanceAmount}>₺ {formatMoney(financials.total)}</Text>
                    <View style={styles.cardRow}>
                        <View>
                            <Text style={styles.cardLabel}>Nakit</Text>
                            <Text style={styles.cardValue}>₺ {formatMoney(financials.cash)}</Text>
                        </View>
                        <View>
                            <Text style={styles.cardLabel}>Banka</Text>
                            <Text style={styles.cardValue}>₺ {formatMoney(financials.bank)}</Text>
                        </View>
                    </View>
                </LinearGradient>

                {/* Summary Cards */}
                <View style={styles.summaryRow}>
                    <View style={[styles.summaryCard, { borderColor: 'rgba(255,69,58,0.3)' }]}>
                        <Ionicons name="card-outline" size={22} color={Colors.error} />
                        <Text style={styles.summaryValue}>₺ {formatMoney(totalDue)}</Text>
                        <Text style={styles.summaryLabel}>Toplam Borç</Text>
                    </View>
                    <View style={[styles.summaryCard, { borderColor: 'rgba(50,215,75,0.3)' }]}>
                        <Ionicons name="checkmark-circle-outline" size={22} color={Colors.success} />
                        <Text style={styles.summaryValue}>
                            {payments.filter(p => p.status === 'PAID').length}
                        </Text>
                        <Text style={styles.summaryLabel}>Ödendi</Text>
                    </View>
                    <View style={[styles.summaryCard, { borderColor: 'rgba(108,99,255,0.3)' }]}>
                        <Ionicons name="time-outline" size={22} color={Colors.primary} />
                        <Text style={styles.summaryValue}>{upcomingPayments.length}</Text>
                        <Text style={styles.summaryLabel}>Bekleyen</Text>
                    </View>
                </View>

                {/* Quick Actions */}
                <View style={styles.section}>
                    <Text style={Typography.h2}>Hızlı İşlemler</Text>
                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => navigation.navigate('Ödemeler')}
                        >
                            <LinearGradient
                                colors={[Colors.primary, '#5a52d5']}
                                style={styles.actionGradient}
                            >
                                <Ionicons name="add-circle-outline" size={20} color="#fff" />
                                <Text style={styles.actionText}>Ödeme Ekle</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => navigation.navigate('Hesaplar')}
                        >
                            <View style={styles.actionSecondary}>
                                <Ionicons name="wallet-outline" size={20} color={Colors.primary} />
                                <Text style={[styles.actionText, { color: Colors.primary }]}>Hesaplar</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Upcoming Payments */}
                <View style={styles.section}>
                    <Text style={Typography.h2}>Yaklaşan Ödemeler</Text>
                    {upcomingPayments.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="checkmark-done-circle-outline" size={40} color={Colors.textSecondary} />
                            <Text style={{ color: Colors.textSecondary, marginTop: 8 }}>
                                Yaklaşan ödeme yok 🎉
                            </Text>
                        </View>
                    ) : (
                        upcomingPayments.map((item) => (
                            <View key={item.id} style={styles.paymentItem}>
                                <Text style={{ fontSize: 20, marginRight: 12 }}>
                                    {typeEmojis[item.type] || '📋'}
                                </Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.paymentTitle}>
                                        {item.institution || item.description || 'Ödeme'}
                                    </Text>
                                    <Text style={styles.paymentDate}>
                                        {item.dueDate || '—'}
                                    </Text>
                                </View>
                                <Text style={styles.paymentAmount}>
                                    ₺ {formatMoney(item.amount)}
                                </Text>
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background, paddingTop: 50 },
    scrollContent: { padding: Layout.screenPadding, paddingBottom: 30 },
    balanceCard: {
        padding: 25, borderRadius: 20, marginBottom: 20,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3, shadowRadius: 20, elevation: 10,
    },
    balanceAmount: {
        color: '#fff', fontSize: 32, fontWeight: 'bold', marginVertical: 5,
    },
    cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
    cardLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
    cardValue: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
    summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 25 },
    summaryCard: {
        flex: 1, backgroundColor: Colors.surface, borderRadius: 14,
        padding: 14, alignItems: 'center',
        borderWidth: 1, gap: 6,
    },
    summaryValue: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    summaryLabel: { color: Colors.textSecondary, fontSize: 11 },
    section: { marginBottom: 25 },
    actionRow: { flexDirection: 'row', marginTop: 10, gap: 12 },
    actionButton: { flex: 1 },
    actionGradient: {
        borderRadius: 14, paddingVertical: 15,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    actionSecondary: {
        borderRadius: 14, paddingVertical: 15,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        borderWidth: 1, borderColor: Colors.primary + '40',
        backgroundColor: Colors.primary + '10',
    },
    actionText: { color: '#fff', fontWeight: '600', fontSize: 14 },
    emptyState: { alignItems: 'center', paddingVertical: 30 },
    paymentItem: {
        backgroundColor: Colors.surface, padding: 15, borderRadius: 12,
        flexDirection: 'row', alignItems: 'center', marginTop: 10,
        borderWidth: 1, borderColor: Colors.border,
    },
    paymentTitle: { color: '#fff', fontSize: 15, fontWeight: '500' },
    paymentDate: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
    paymentAmount: { color: Colors.error, fontWeight: 'bold', fontSize: 16 },
});
