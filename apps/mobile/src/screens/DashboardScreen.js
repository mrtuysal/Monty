import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Colors, Typography, Layout } from '../constants/Theme';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';

export default function DashboardScreen({ navigation }) {
    const {
        accounts,
        payments,
        receivables,
        userProfile,
        session,
        formatMoney,
        formatDate,
        convertToTRY,
        tcmbRates,
    } = useData();

    // Consolidated Net Assets in TRY
    const financials = useMemo(() => {
        let total = 0, cash = 0, bank = 0;
        accounts.forEach(acc => {
            const amountInTRY = convertToTRY ? convertToTRY(acc.balance, acc.currency) : (acc.balance || 0);
            total += amountInTRY;
            if (acc.type === 'CASH') cash += amountInTRY;
            else bank += amountInTRY;
        });
        return { total, cash, bank };
    }, [accounts, convertToTRY]);

    // Current Month Payments & Calculations
    const currentMonthStats = useMemo(() => {
        const now = new Date();
        const curMonth = now.getMonth();
        const curYear = now.getFullYear();

        const monthPayments = payments.filter(p => {
            const d = new Date(p.dueDate || 0);
            return d.getMonth() === curMonth && d.getFullYear() === curYear;
        });

        const totalDebt = monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const paidDebt = monthPayments
            .filter(p => p.status === 'PAID')
            .reduce((sum, p) => sum + (p.amount || 0), 0);
        const pendingDebt = monthPayments
            .filter(p => p.status !== 'PAID')
            .reduce((sum, p) => sum + (p.amount || 0), 0);

        const paidRate = totalDebt > 0 ? Math.round((paidDebt / totalDebt) * 100) : 0;

        return { totalDebt, paidDebt, pendingDebt, paidRate, count: monthPayments.length };
    }, [payments]);

    // Upcoming & Overdue List (Top 5)
    const upcomingList = useMemo(() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        return [...payments]
            .filter(p => p.status !== 'PAID')
            .sort((a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0))
            .slice(0, 5)
            .map(item => {
                const due = new Date(item.dueDate || 0);
                due.setHours(0, 0, 0, 0);
                const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

                let statusColor = Colors.primary; // Green
                let statusBadge = `${formatDate(item.dueDate)}`;

                if (diffDays < 0) {
                    statusColor = Colors.error; // Red
                    statusBadge = `Gecikmiş (${Math.abs(diffDays)} gün)`;
                } else if (diffDays <= 4) {
                    statusColor = Colors.warning; // Amber
                    statusBadge = diffDays === 0 ? 'Bugün' : `${diffDays} gün kaldı`;
                }

                return {
                    ...item,
                    diffDays,
                    statusColor,
                    statusBadge,
                };
            });
    }, [payments, formatDate]);

    // Receivables Summary
    const recSummary = useMemo(() => {
        let rec = 0, debt = 0;
        (receivables || []).forEach(r => {
            if (r.status !== 'DONE') {
                const a = parseFloat(r.amount) || 0;
                if (r.type === 'RECEIVABLE') rec += a;
                else if (r.type === 'DEBT') debt += a;
            }
        });
        return { rec, debt, net: rec - debt };
    }, [receivables]);

    const userName = userProfile?.fullName || session?.user?.user_metadata?.full_name || 'Murat';
    const userInitials = userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'MY';

    return (
        <View style={styles.container}>
            {/* TopAppBar Stitch Anchor */}
            <View style={styles.topAppBar}>
                <View style={styles.brandRow}>
                    <View style={styles.brandLogoWrapper}>
                        <Ionicons name="sparkles" size={18} color={Colors.secondary} />
                    </View>
                    <View style={styles.brandTitleRow}>
                        <Text style={styles.brandName}>Monty</Text>
                        <View style={styles.proBadge}>
                            <Text style={styles.proBadgeText}>PRO</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.topActionsRow}>
                    <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => navigation.navigate('Ayarlar')}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="notifications-outline" size={18} color={Colors.textSecondary} />
                        <View style={styles.notificationDot} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.avatarButton}
                        onPress={() => navigation.navigate('Ayarlar')}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.avatarText}>{userInitials}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Live Ticker Bar (TCMB Rates) */}
                {tcmbRates && (
                    <View style={styles.tickerRow}>
                        {tcmbRates.USD && (
                            <View style={styles.tickerChip}>
                                <Text style={styles.tickerLabel}>USD/TRY</Text>
                                <Text style={styles.tickerValue}>₺{tcmbRates.USD.toFixed(2)}</Text>
                            </View>
                        )}
                        {tcmbRates.EUR && (
                            <View style={styles.tickerChip}>
                                <Text style={styles.tickerLabel}>EUR/TRY</Text>
                                <Text style={styles.tickerValue}>₺{tcmbRates.EUR.toFixed(2)}</Text>
                            </View>
                        )}
                        {tcmbRates.GA && (
                            <View style={styles.tickerChip}>
                                <Text style={styles.tickerLabel}>Gram Altın</Text>
                                <Text style={styles.tickerValue}>₺{Math.round(tcmbRates.GA)}</Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Bento Hero: Toplam Net Varlık Card */}
                <View style={styles.heroCard}>
                    {/* Ambient Glow */}
                    <View style={styles.glowTopRight} />

                    <View style={styles.heroHeader}>
                        <View style={styles.heroHeaderLeft}>
                            <Text style={styles.heroOverline}>TOPLAM NET VARLIK</Text>
                            <Ionicons name="shield-checkmark" size={14} color={Colors.textMuted} />
                        </View>
                        <View style={styles.growthBadge}>
                            <Ionicons name="trending-up" size={13} color={Colors.primary} />
                            <Text style={styles.growthBadgeText}>+%4.8</Text>
                        </View>
                    </View>

                    <Text style={styles.heroAmount}>
                        ₺{formatMoney(financials.total)}
                    </Text>

                    <View style={styles.heroFooter}>
                        <View style={styles.heroCashflowRow}>
                            <View style={styles.statusDot} />
                            <Text style={styles.heroCashflowText}>Akıllı Nakit Akışı</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.portfolioLink}
                            onPress={() => navigation.navigate('Hesaplar')}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.portfolioLinkText}>Portföy Özeti</Text>
                            <Ionicons name="chevron-forward" size={14} color={Colors.secondary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Bento Dual Stack: Bu Ay Borç & Ödenen Borçlar */}
                <View style={styles.dualStackRow}>
                    {/* Bu Ay Borç */}
                    <View style={styles.stackCard}>
                        <View style={styles.stackCardHeader}>
                            <Text style={styles.stackCardTitle}>BU AY BORÇ</Text>
                            <Ionicons name="time" size={16} color={Colors.warning} />
                        </View>
                        <Text style={styles.stackCardAmount}>
                            ₺{formatMoney(currentMonthStats.pendingDebt)}
                        </Text>
                        <View style={styles.warningPill}>
                            <View style={[styles.pulseDot, { backgroundColor: Colors.warning }]} />
                            <Text style={styles.warningPillText}>
                                {upcomingList.length > 0 ? upcomingList[0].statusBadge : 'Aktif'}
                            </Text>
                        </View>
                    </View>

                    {/* Ödenen */}
                    <View style={styles.stackCard}>
                        <View style={styles.stackCardHeader}>
                            <Text style={styles.stackCardTitle}>ÖDENEN</Text>
                            <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
                        </View>
                        <Text style={styles.stackCardAmount}>
                            ₺{formatMoney(currentMonthStats.paidDebt)}
                        </Text>
                        <View style={styles.progressContainer}>
                            <View style={styles.progressLabelRow}>
                                <Text style={styles.progressLabel}>Hedef</Text>
                                <Text style={styles.progressPercent}>%{currentMonthStats.paidRate}</Text>
                            </View>
                            <View style={styles.progressBarTrack}>
                                <View
                                    style={[
                                        styles.progressBarFill,
                                        { width: `${Math.min(currentMonthStats.paidRate, 100)}%` },
                                    ]}
                                />
                            </View>
                        </View>
                    </View>
                </View>

                {/* Quick Action Buttons (4 Columns) */}
                <View style={styles.actionGrid}>
                    {/* Fatura Ekle (Volt Lime Hero) */}
                    <TouchableOpacity
                        style={styles.voltActionButton}
                        onPress={() => navigation.navigate('Ödemeler')}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="add" size={20} color="#09090B" />
                        <Text style={styles.voltActionText}>Fatura</Text>
                    </TouchableOpacity>

                    {/* Hesaplar / Varlık */}
                    <TouchableOpacity
                        style={styles.actionTile}
                        onPress={() => navigation.navigate('Hesaplar')}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="wallet-outline" size={18} color={Colors.primary} />
                        <Text style={styles.actionTileText}>Hesaplar</Text>
                    </TouchableOpacity>

                    {/* Alacak / Borç */}
                    <TouchableOpacity
                        style={styles.actionTile}
                        onPress={() => navigation.navigate('Alacak/Borç')}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="people-outline" size={18} color={Colors.secondary} />
                        <Text style={styles.actionTileText}>Alacak/Borç</Text>
                    </TouchableOpacity>

                    {/* Ayarlar */}
                    <TouchableOpacity
                        style={styles.actionTile}
                        onPress={() => navigation.navigate('Ayarlar')}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="options-outline" size={18} color="#90D798" />
                        <Text style={styles.actionTileText}>Ayarlar</Text>
                    </TouchableOpacity>
                </View>

                {/* High-Density Neo-Fintech Transaction List: Yaklaşan Ödemeler */}
                <View style={styles.listSection}>
                    <View style={styles.listSectionHeader}>
                        <Text style={styles.listSectionTitle}>Yaklaşan Ödemeler</Text>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('Ödemeler')}
                            style={styles.seeAllButton}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.seeAllText}>Tümü ({payments.length})</Text>
                            <Ionicons name="arrow-forward" size={14} color={Colors.secondary} />
                        </TouchableOpacity>
                    </View>

                    {upcomingList.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <Ionicons name="checkmark-done-circle" size={36} color={Colors.primary} />
                            <Text style={styles.emptyText}>Bekleyen ödeme bulunmuyor 🎉</Text>
                        </View>
                    ) : (
                        upcomingList.map((item) => (
                            <TouchableOpacity
                                key={item.id}
                                style={styles.densityCard}
                                onPress={() => navigation.navigate('Ödemeler')}
                                activeOpacity={0.7}
                            >
                                <View style={styles.densityLeft}>
                                    {/* Vertical Status Indicator Pill */}
                                    <View
                                        style={[
                                            styles.verticalStatusPill,
                                            { backgroundColor: item.statusColor },
                                        ]}
                                    />
                                    <View style={styles.densityMeta}>
                                        <Text style={styles.densityTitle} numberOfLines={1}>
                                            {item.institution || item.description || 'Ödeme'}
                                        </Text>
                                        <Text style={styles.densitySubtitle} numberOfLines={1}>
                                            {item.description ? item.description : 'Dönem borcu'}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.densityRight}>
                                    <Text style={styles.densityAmount}>
                                        ₺{formatMoney(item.amount)}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.densityDate,
                                            { color: item.statusColor },
                                        ]}
                                    >
                                        {item.statusBadge}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </View>

                {/* Monthly Liquidity Micro-Widget */}
                <TouchableOpacity
                    style={styles.liquidityWidget}
                    onPress={() => navigation.navigate('Alacak/Borç')}
                    activeOpacity={0.8}
                >
                    <View style={styles.liquidityLeft}>
                        <View style={styles.liquidityIconWrapper}>
                            <Ionicons name="swap-horizontal" size={18} color={Colors.secondary} />
                        </View>
                        <View>
                            <Text style={styles.liquidityTitle}>Net Alacak / Borç Dengesi</Text>
                            <Text style={styles.liquiditySubtitle}>
                                {recSummary.net >= 0 ? 'Pozitif alacak bakiyesi' : 'Ödenecek borç fazlası'}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.liquidityBadge}>
                        <Text
                            style={[
                                styles.liquidityBadgeText,
                                { color: recSummary.net >= 0 ? Colors.primary : Colors.error },
                            ]}
                        >
                            {recSummary.net >= 0 ? '+' : '-'}₺{formatMoney(Math.abs(recSummary.net))}
                        </Text>
                    </View>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background || '#09090B',
    },
    topAppBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 48,
        paddingBottom: 12,
        backgroundColor: '#09090B',
        borderBottomWidth: 1,
        borderBottomColor: Colors.border || 'rgba(255, 255, 255, 0.08)',
    },
    brandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    brandLogoWrapper: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: '#1C1C21',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    brandTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    brandName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FAFAFA',
        letterSpacing: -0.3,
    },
    proBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 9999,
        backgroundColor: 'rgba(232, 245, 74, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(232, 245, 74, 0.3)',
    },
    proBadgeText: {
        fontSize: 9,
        fontWeight: '700',
        color: Colors.secondary || '#E8F54A',
    },
    topActionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    iconButton: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: '#141417',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    notificationDot: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.secondary || '#E8F54A',
    },
    avatarButton: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: '#1C1C21',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.primary || '#22C55E',
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 24,
        gap: 14,
    },
    tickerRow: {
        flexDirection: 'row',
        gap: 8,
        overflow: 'hidden',
    },
    tickerChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 9999,
        backgroundColor: '#141417',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    tickerLabel: {
        fontSize: 10,
        color: Colors.textMuted || '#71717A',
        fontWeight: '500',
    },
    tickerValue: {
        fontSize: 11,
        fontWeight: '700',
        color: '#FAFAFA',
    },
    heroCard: {
        backgroundColor: '#141417',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 20,
        padding: 18,
        position: 'relative',
        overflow: 'hidden',
    },
    glowTopRight: {
        position: 'absolute',
        right: -30,
        top: -30,
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(34, 197, 94, 0.12)',
    },
    heroHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    heroHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    heroOverline: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.8,
        color: Colors.textMuted || '#71717A',
    },
    growthBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 9999,
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(34, 197, 94, 0.25)',
    },
    growthBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: Colors.primary || '#22C55E',
    },
    heroAmount: {
        fontSize: 32,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: -0.6,
        marginVertical: 4,
    },
    heroFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.06)',
    },
    heroCashflowRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.primary || '#22C55E',
    },
    heroCashflowText: {
        fontSize: 11,
        color: Colors.textSecondary || '#A1A1AA',
        fontWeight: '500',
    },
    portfolioLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    portfolioLinkText: {
        fontSize: 11,
        fontWeight: '700',
        color: Colors.secondary || '#E8F54A',
    },
    dualStackRow: {
        flexDirection: 'row',
        gap: 10,
    },
    stackCard: {
        flex: 1,
        backgroundColor: '#141417',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 16,
        padding: 14,
        justifyContent: 'space-between',
    },
    stackCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    stackCardTitle: {
        fontSize: 10,
        fontWeight: '700',
        color: '#71717A',
        letterSpacing: 0.4,
    },
    stackCardAmount: {
        fontSize: 18,
        fontWeight: '800',
        color: '#FFFFFF',
        marginVertical: 6,
    },
    warningPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.25)',
        alignSelf: 'flex-start',
    },
    pulseDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
    },
    warningPillText: {
        fontSize: 10,
        fontWeight: '600',
        color: Colors.warning || '#F59E0B',
    },
    progressContainer: {
        width: '100%',
        marginTop: 4,
    },
    progressLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    progressLabel: {
        fontSize: 9,
        color: '#71717A',
    },
    progressPercent: {
        fontSize: 10,
        fontWeight: '700',
        color: Colors.primary || '#22C55E',
    },
    progressBarTrack: {
        width: '100%',
        height: 4,
        backgroundColor: '#1C1C21',
        borderRadius: 9999,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: Colors.primary || '#22C55E',
        borderRadius: 9999,
    },
    actionGrid: {
        flexDirection: 'row',
        gap: 8,
    },
    voltActionButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 14,
        backgroundColor: Colors.secondary || '#E8F54A',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 6,
        shadowColor: Colors.secondary || '#E8F54A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
    },
    voltActionText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#09090B',
        marginTop: 2,
    },
    actionTile: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 14,
        backgroundColor: '#141417',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionTileText: {
        fontSize: 10,
        fontWeight: '600',
        color: Colors.textSecondary || '#A1A1AA',
        marginTop: 2,
    },
    listSection: {
        gap: 10,
    },
    listSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 2,
    },
    listSectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    seeAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    seeAllText: {
        fontSize: 11,
        fontWeight: '600',
        color: Colors.secondary || '#E8F54A',
    },
    emptyCard: {
        backgroundColor: '#141417',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    emptyText: {
        fontSize: 13,
        color: Colors.textSecondary || '#A1A1AA',
    },
    densityCard: {
        backgroundColor: '#141417',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    densityLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
        paddingRight: 8,
    },
    verticalStatusPill: {
        width: 4,
        height: 32,
        borderRadius: 2,
    },
    densityMeta: {
        flex: 1,
    },
    densityTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#FAFAFA',
        lineHeight: 16,
    },
    densitySubtitle: {
        fontSize: 11,
        color: Colors.textMuted || '#71717A',
        marginTop: 2,
    },
    densityRight: {
        alignItems: 'flex-end',
    },
    densityAmount: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FAFAFA',
    },
    densityDate: {
        fontSize: 10,
        fontWeight: '600',
        marginTop: 2,
    },
    liquidityWidget: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
        borderRadius: 14,
        backgroundColor: '#141417',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        marginTop: 2,
    },
    liquidityLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    liquidityIconWrapper: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: 'rgba(232, 245, 74, 0.12)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    liquidityTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FAFAFA',
    },
    liquiditySubtitle: {
        fontSize: 10,
        color: '#71717A',
        marginTop: 2,
    },
    liquidityBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
    },
    liquidityBadgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
});
