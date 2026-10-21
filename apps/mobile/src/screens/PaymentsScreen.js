import React, { useState, useMemo, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Modal, Alert, FlatList, Platform, Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Colors, Typography, Layout } from '../constants/Theme';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import {
    getNextRecurringPayment,
    parseRecurringConfig,
    encodeRecurringConfig
} from '../services/recurringPaymentService';

const PAYMENT_TYPES = [
    { key: 'CREDIT_CARD', label: 'Kredi Kartı', emoji: '💳' },
    { key: 'BILL', label: 'Fatura', emoji: '📄' },
    { key: 'LOAN', label: 'Kredi', emoji: '🏦' },
    { key: 'OTHER', label: 'Diğer', emoji: '📋' },
];

const FILTER_TABS = [
    { key: 'ALL', label: 'Tümü', icon: 'apps-outline', activeIcon: 'apps' },
    { key: 'CREDIT_CARD', label: 'Kart', icon: 'card-outline', activeIcon: 'card' },
    { key: 'BILL', label: 'Fatura', icon: 'receipt-outline', activeIcon: 'receipt' },
    { key: 'LOAN', label: 'Kredi', icon: 'cash-outline', activeIcon: 'cash' },
    { key: 'OTHER', label: 'Diğer', icon: 'grid-outline', activeIcon: 'grid' },
];

const MONTH_NAMES = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

const STATUS_MAP = {
    PENDING: { label: 'Bekliyor', color: '#FF9500' },
    PAID: { label: 'Ödendi', color: Colors.success },
    OVERDUE: { label: 'Gecikmiş', color: Colors.error },
};

const FREQUENCIES = [
    { key: 'WEEKLY', label: 'Haftalık' },
    { key: 'MONTHLY', label: 'Aylık' },
    { key: 'QUARTERLY', label: '3 Aylık' },
    { key: 'YEARLY', label: 'Yıllık' },
];

const initialForm = {
    type: 'CREDIT_CARD',
    institution: '',
    description: '',
    amount: '',
    dueDate: '',
    statementDate: '',
    status: 'PENDING',
    isRecurring: false,
    recurringFrequency: 'MONTHLY',
    recurringType: 'INFINITE',
    recurringTotalCount: '12',
};

export default function PaymentsScreen() {
    const { colors, isDark } = useTheme();
    const { payments, addPayment, updatePayment, deletePayment, formatMoney, formatDate } = useData();
    const [modalVisible, setModalVisible] = useState(false);
    const [form, setForm] = useState(initialForm);
    const [filter, setFilter] = useState('ALL');
    const [editingId, setEditingId] = useState(null);
    const [actionPayment, setActionPayment] = useState(null);
    const [showDatePicker, setShowDatePicker] = useState({ visible: false, field: null });

    // Ay ve Yıl Filtresi - Varsayılan: Mevcut Ay ve Yıl
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0-11 veya 'ALL'
    const [isMonthPickerVisible, setIsMonthPickerVisible] = useState(false);

    const handleDateChange = (event, selectedDate) => {
        if (Platform.OS === 'android') {
            setShowDatePicker({ visible: false, field: null });
        }
        if (event.type === 'set' && selectedDate) {
            const formattedDate = selectedDate.toISOString().split('T')[0];
            setForm(prev => ({ ...prev, [showDatePicker.field]: formattedDate }));
        } else if (Platform.OS === 'ios') {
            if (selectedDate) {
                const formattedDate = selectedDate.toISOString().split('T')[0];
                setForm(prev => ({ ...prev, [showDatePicker.field]: formattedDate }));
            }
        }
    };

    const filteredPayments = useMemo(() => {
        // 1. Ay ve Yıl Filtresi
        const monthFiltered = (payments || []).filter(payment => {
            const dateStr = payment.dueDate || payment.statementDate;
            if (selectedMonth === 'ALL') {
                if (!dateStr) return true;
                const date = new Date(dateStr);
                return isNaN(date.getFullYear()) || date.getFullYear() === selectedYear;
            }
            if (!dateStr) {
                // Tarihi olmayan ödemeleri gözden kaçmaması için mevcut ayda göster
                return selectedMonth === new Date().getMonth() && selectedYear === new Date().getFullYear();
            }
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) {
                return selectedMonth === new Date().getMonth() && selectedYear === new Date().getFullYear();
            }
            return date.getFullYear() === selectedYear && date.getMonth() === selectedMonth;
        });

        // 2. Kategori Filtresi
        const categoryFiltered = monthFiltered.filter(p => filter === 'ALL' || p.type === filter);

        // 3. Sıralama: Kredi Kartı > Fatura > Kredi > Diğer, ardından Tarih
        const typeOrder = { 'CREDIT_CARD': 1, 'BILL': 2, 'LOAN': 3, 'OTHER': 4 };

        return categoryFiltered.sort((a, b) => {
            const orderA = typeOrder[a.type] || 4;
            const orderB = typeOrder[b.type] || 4;
            if (orderA !== orderB) return orderA - orderB;

            const dateA = new Date(a.dueDate || a.statementDate || 0);
            const dateB = new Date(b.dueDate || b.statementDate || 0);
            return dateA - dateB;
        });
    }, [payments, filter, selectedYear, selectedMonth]);

    // Seçili yıldaki aylara göre ödeme sayıları
    const monthStats = useMemo(() => {
        const counts = {};
        (payments || []).forEach(p => {
            const dateStr = p.dueDate || p.statementDate;
            if (!dateStr) return;
            const d = new Date(dateStr);
            if (!isNaN(d.getTime()) && d.getFullYear() === selectedYear) {
                const m = d.getMonth();
                counts[m] = (counts[m] || 0) + 1;
            }
        });
        return counts;
    }, [payments, selectedYear]);

    const totals = useMemo(() => {
        let total = 0;
        let paid = 0;
        let pending = 0;
        filteredPayments.forEach(p => {
            const amt = parseFloat(p.amount) || 0;
            total += amt;
            if (p.status === 'PAID') {
                paid += amt;
            } else {
                pending += amt;
            }
        });
        return { total, paid, pending, count: filteredPayments.length };
    }, [filteredPayments]);

    const handleSave = useCallback(async () => {
        if (!form.institution) {
            Alert.alert('Hata', 'Kurum adı gereklidir.');
            return;
        }
        if (!form.dueDate) {
            Alert.alert('Hata', 'Son ödeme tarihi gereklidir.');
            return;
        }

        const recurringFrequency = form.isRecurring
            ? encodeRecurringConfig({
                frequency: form.recurringFrequency || 'MONTHLY',
                type: form.recurringType || 'INFINITE',
                totalCount: parseInt(form.recurringTotalCount, 10) || 12,
                currentIndex: 1
            })
            : (form.recurringFrequency || 'MONTHLY');

        const paymentData = {
            ...form,
            amount: parseFloat(form.amount) || 0,
            recurringFrequency
        };

        if (editingId) {
            await updatePayment(editingId, paymentData);
        } else {
            await addPayment(paymentData);
        }
        setForm(initialForm);
        setEditingId(null);
        setModalVisible(false);

        // Kaydedilen ödemenin dönemine otomatik git
        if (paymentData.dueDate) {
            const d = new Date(paymentData.dueDate);
            if (!isNaN(d.getTime())) {
                setSelectedYear(d.getFullYear());
                setSelectedMonth(d.getMonth());
            }
        }
    }, [form, addPayment, updatePayment, editingId]);

    const handleEdit = useCallback((payment) => {
        const parsedRec = parseRecurringConfig(payment.recurringFrequency);
        setForm({
            type: payment.type || 'CREDIT_CARD',
            institution: payment.institution || '',
            description: payment.description || '',
            amount: (payment.amount || '').toString(),
            dueDate: payment.dueDate || '',
            statementDate: payment.statementDate || '',
            status: payment.status || 'PENDING',
            isRecurring: payment.isRecurring || false,
            recurringFrequency: parsedRec.frequency || 'MONTHLY',
            recurringType: parsedRec.type || 'INFINITE',
            recurringTotalCount: (parsedRec.totalCount || 12).toString(),
        });
        setEditingId(payment.id);
        setModalVisible(true);
    }, []);

    const handleStatusToggle = useCallback(async (payment) => {
        const newStatus = payment.status === 'PAID' ? 'PENDING' : 'PAID';
        await updatePayment(payment.id, { status: newStatus });

        if (newStatus === 'PAID' && payment.isRecurring) {
            const nextPayment = getNextRecurringPayment(payment, payments);
            if (nextPayment) {
                await addPayment(nextPayment);
            }
        }
    }, [updatePayment, payments, addPayment]);

    const handleDelete = useCallback((payment) => {
        Alert.alert(
            'Ödemeyi Sil',
            `"${payment.institution}" ödemesini silmek istediğinize emin misiniz?`,
            [
                { text: 'İptal', style: 'cancel' },
                { text: 'Sil', style: 'destructive', onPress: () => deletePayment(payment.id) },
            ]
        );
    }, [deletePayment]);

    const typeEmoji = (type) => PAYMENT_TYPES.find(t => t.key === type)?.emoji || '📋';

    const renderPayment = ({ item }) => {
        const isPaid = item.status === 'PAID';
        const isOverdue = !isPaid && new Date(item.dueDate) < new Date();
        const statusColor = isPaid ? '#32d74b' : isOverdue ? '#ff453a' : '#ff9500';

        return (
            <View style={styles.compactPaymentCard}>
                {/* Sol İçerik Alanı (2 Kompakt Satır) */}
                <TouchableOpacity
                    style={styles.cardContentArea}
                    activeOpacity={0.7}
                    onPress={() => handleEdit(item)}
                >
                    {/* 1. Üst Satır: Kurum, HK, Karşısında Borç Tutarı */}
                    <View style={styles.cardRow}>
                        <View style={styles.leftRowGroup}>
                            <Text style={styles.institutionText} numberOfLines={1}>
                                {item.institution || item.description}
                            </Text>
                            {item.isRecurring && (() => {
                                const parsed = parseRecurringConfig(item.recurringFrequency);
                                return (
                                    <View style={styles.miniRecurringBadge}>
                                        <Ionicons name="repeat" size={10} color={Colors.primary} />
                                        <Text style={styles.miniRecurringText}>{parsed.label}</Text>
                                    </View>
                                );
                            })()}
                            {item.statementDate ? (
                                <Text style={styles.statementText}>HK: {formatDate(item.statementDate)}</Text>
                            ) : null}
                        </View>

                        <Text style={styles.debtAmountText}>
                            ₺ {formatMoney(item.amount)}
                        </Text>
                    </View>

                    {/* 2. Alt Satır: Açıklama, Son Ödeme Tarihi, Karşısında Ödenecek Tutar */}
                    <View style={[styles.cardRow, { marginTop: 4 }]}>
                        <View style={styles.leftRowGroup}>
                            <Text style={styles.descText} numberOfLines={1}>
                                {item.description || typeEmoji(item.type)}
                            </Text>
                            <View style={styles.dueDateBadge}>
                                <Ionicons
                                    name="calendar-outline"
                                    size={11}
                                    color={isOverdue ? Colors.error : Colors.textSecondary}
                                />
                                <Text style={[styles.dueDateText, isOverdue && { color: Colors.error, fontWeight: '700' }]}>
                                    SÖ: {formatDate(item.dueDate)}
                                </Text>
                            </View>
                        </View>

                        <Text style={[styles.paymentAmountText, isPaid && { color: Colors.textSecondary }]}>
                            {item.paymentAmount && item.paymentAmount !== item.amount
                                ? `Ödenecek: ₺ ${formatMoney(item.paymentAmount)}`
                                : (isPaid ? 'Ödendi' : `₺ ${formatMoney(item.amount)}`)}
                        </Text>
                    </View>
                </TouchableOpacity>

                {/* Sağ Taraf: Her İki Satırı Kapsayan Dikey Durum Rengi Barı */}
                <TouchableOpacity
                    style={[styles.verticalStatusBar, { backgroundColor: statusColor }]}
                    activeOpacity={0.7}
                    onPress={() => setActionPayment(item)}
                >
                    <Ionicons
                        name={isPaid ? 'checkmark-circle' : isOverdue ? 'alert-circle' : 'time'}
                        size={18}
                        color="#fff"
                    />
                    <Text style={styles.verticalStatusText}>
                        {isPaid ? 'ÖDENDİ' : isOverdue ? 'GECİKTİ' : 'BEKLİYOR'}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={[Typography.h1, { color: colors.text }]}>Ödemeler</Text>
                <TouchableOpacity onPress={() => { setEditingId(null); setForm(initialForm); setModalVisible(true); }}>
                    <LinearGradient
                        colors={[Colors.primary, '#5a52d5']}
                        style={styles.addButton}
                    >
                        <Ionicons name="add" size={24} color="#fff" />
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            {/* Ay ve Yıl Gezinti Çubuğu */}
            <View style={styles.monthNavigator}>
                <TouchableOpacity
                    style={styles.monthNavBtn}
                    onPress={() => {
                        if (selectedMonth === 'ALL') {
                            setSelectedMonth(new Date().getMonth());
                        } else if (selectedMonth === 0) {
                            setSelectedMonth(11);
                            setSelectedYear(prev => prev - 1);
                        } else {
                            setSelectedMonth(prev => prev - 1);
                        }
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Ionicons name="chevron-back" size={18} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.monthCenter}
                    onPress={() => setIsMonthPickerVisible(true)}
                    activeOpacity={0.7}
                >
                    <Ionicons name="calendar-outline" size={14} color={Colors.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.monthTitle}>
                        {selectedMonth === 'ALL' ? `Tüm Yıl (${selectedYear})` : `${MONTH_NAMES[selectedMonth]} ${selectedYear}`}
                    </Text>
                    <Ionicons name="chevron-down" size={13} color={Colors.textSecondary} style={{ marginLeft: 4 }} />
                    {selectedMonth !== 'ALL' && selectedMonth === new Date().getMonth() && selectedYear === new Date().getFullYear() && (
                        <View style={styles.currentMonthBadge}>
                            <Text style={styles.currentMonthBadgeText}>Bu Ay</Text>
                        </View>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.monthNavBtn}
                    onPress={() => {
                        if (selectedMonth === 'ALL') {
                            setSelectedMonth(new Date().getMonth());
                        } else if (selectedMonth === 11) {
                            setSelectedMonth(0);
                            setSelectedYear(prev => prev + 1);
                        } else {
                            setSelectedMonth(prev => prev + 1);
                        }
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Ionicons name="chevron-forward" size={18} color="#fff" />
                </TouchableOpacity>

                {/* Hızlı Tüm Yıl / Aylık Geçiş Butonu */}
                <TouchableOpacity
                    style={[styles.allYearPill, selectedMonth === 'ALL' && styles.allYearPillActive]}
                    onPress={() => {
                        if (selectedMonth === 'ALL') {
                            setSelectedMonth(new Date().getMonth());
                            setSelectedYear(new Date().getFullYear());
                        } else {
                            setSelectedMonth('ALL');
                        }
                    }}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.allYearPillText, selectedMonth === 'ALL' && styles.allYearPillTextActive]}>
                        {selectedMonth === 'ALL' ? 'Aylık' : 'Tüm Yıl'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Kategori Filtre Butonları - Tek Satırda Eşit Genişlikte */}
            <View style={styles.filterRow}>
                {FILTER_TABS.map(tab => {
                    const isActive = filter === tab.key;
                    return (
                        <TouchableOpacity
                            key={tab.key}
                            style={[styles.filterTab, isActive && styles.filterTabActive]}
                            onPress={() => setFilter(tab.key)}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name={isActive ? tab.activeIcon : tab.icon}
                                size={14}
                                color={isActive ? '#fff' : Colors.textSecondary}
                            />
                            <Text
                                style={[styles.filterTabText, isActive && styles.filterTabTextActive]}
                                numberOfLines={1}
                            >
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Toplam Özeti */}
            <View style={{
                flexDirection: 'row',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                marginHorizontal: Layout.screenPadding,
                marginBottom: 10,
                borderRadius: 12,
                padding: 12,
                justifyContent: 'space-between',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.08)'
            }}>
                <View>
                    <Text style={{ color: Colors.textSecondary, fontSize: 11, textTransform: 'uppercase' }}>Toplam ({totals.count})</Text>
                    <Text style={{ color: Colors.text, fontSize: 15, fontWeight: 'bold', marginTop: 2 }}>₺{totals.total.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                    <Text style={{ color: Colors.textSecondary, fontSize: 11, textTransform: 'uppercase' }}>Ödenen</Text>
                    <Text style={{ color: '#4caf50', fontSize: 15, fontWeight: 'bold', marginTop: 2 }}>₺{totals.paid.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: Colors.textSecondary, fontSize: 11, textTransform: 'uppercase' }}>Kalan</Text>
                    <Text style={{ color: '#ff9800', fontSize: 15, fontWeight: 'bold', marginTop: 2 }}>₺{totals.pending.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                </View>
            </View>

            {/* List */}
            <FlatList
                data={filteredPayments}
                renderItem={renderPayment}
                keyExtractor={(item) => item.id?.toString()}
                contentContainerStyle={{ padding: Layout.screenPadding, paddingBottom: 30 }}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="document-text-outline" size={50} color={Colors.textSecondary} />
                        <Text style={{ color: Colors.textSecondary, marginTop: 10, fontSize: 14, textAlign: 'center' }}>
                            {selectedMonth === 'ALL'
                                ? `${selectedYear} yılı için ödeme bulunamadı`
                                : `${MONTH_NAMES[selectedMonth]} ${selectedYear} için ödeme bulunmuyor`}
                        </Text>
                    </View>
                }
            />

            {/* Add Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{editingId ? 'Ödeme Düzenle' : 'Yeni Ödeme'}</Text>
                            <TouchableOpacity onPress={() => { setModalVisible(false); setForm(initialForm); setEditingId(null); }}>
                                <Ionicons name="close-circle" size={28} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <KeyboardAwareScrollView showsVerticalScrollIndicator={false} extraScrollHeight={50} enableOnAndroid>
                            {/* Type Selection */}
                            <Text style={styles.label}>Tür</Text>
                            <View style={styles.typeRow}>
                                {PAYMENT_TYPES.map(t => (
                                    <TouchableOpacity
                                        key={t.key}
                                        style={[styles.typeChip, form.type === t.key && styles.typeChipActive]}
                                        onPress={() => setForm({ ...form, type: t.key })}
                                    >
                                        <Text style={{ fontSize: 18 }}>{t.emoji}</Text>
                                        <Text style={[
                                            styles.typeChipText,
                                            form.type === t.key && { color: Colors.text }
                                        ]}>{t.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.label}>Kurum</Text>
                            <TextInput
                                style={styles.modalInput}
                                placeholder="Garanti, Turkcell..."
                                placeholderTextColor={Colors.textSecondary}
                                value={form.institution}
                                onChangeText={(t) => setForm({ ...form, institution: t })}
                            />

                            <Text style={styles.label}>Açıklama (opsiyonel)</Text>
                            <TextInput
                                style={styles.modalInput}
                                placeholder="Yıllık aidat, telefon faturası..."
                                placeholderTextColor={Colors.textSecondary}
                                value={form.description}
                                onChangeText={(t) => setForm({ ...form, description: t })}
                            />

                            <Text style={styles.label}>Tutar (₺)</Text>
                            <TextInput
                                style={styles.modalInput}
                                placeholder="1.250,00"
                                placeholderTextColor={Colors.textSecondary}
                                keyboardType="decimal-pad"
                                value={form.amount}
                                onChangeText={(t) => setForm({ ...form, amount: t })}
                            />

                            <Text style={styles.label}>Son Ödeme Tarihi</Text>
                            <TouchableOpacity onPress={() => setShowDatePicker({ visible: true, field: 'dueDate' })}>
                                <View pointerEvents="none">
                                    <TextInput
                                        style={styles.modalInput}
                                        placeholder="Tarih seçin..."
                                        placeholderTextColor={Colors.textSecondary}
                                        value={form.dueDate ? formatDate(form.dueDate) : ''}
                                        editable={false}
                                    />
                                </View>
                            </TouchableOpacity>

                            {form.type === 'CREDIT_CARD' && (
                                <>
                                    <Text style={styles.label}>Hesap Kesim Tarihi</Text>
                                    <TouchableOpacity onPress={() => setShowDatePicker({ visible: true, field: 'statementDate' })}>
                                        <View pointerEvents="none">
                                            <TextInput
                                                style={styles.modalInput}
                                                placeholder="Tarih seçin..."
                                                placeholderTextColor={Colors.textSecondary}
                                                value={form.statementDate ? formatDate(form.statementDate) : ''}
                                                editable={false}
                                            />
                                        </View>
                                    </TouchableOpacity>
                                </>
                            )}

                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 }}>
                                <Text style={[styles.label, { marginTop: 0, marginBottom: 0 }]}>Tekrarlayan Düzenli Ödeme</Text>
                                <Switch
                                    value={form.isRecurring}
                                    onValueChange={(val) => setForm({ ...form, isRecurring: val })}
                                    trackColor={{ false: Colors.surface, true: Colors.primary }}
                                    thumbColor="#fff"
                                />
                            </View>

                            {form.isRecurring && (
                                <View style={{ marginTop: 15, padding: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
                                    <Text style={[styles.label, { marginTop: 0, marginBottom: 8, fontSize: 12 }]}>Tekrar Sıklığı</Text>
                                    <View style={styles.typeRow}>
                                        {FREQUENCIES.map(f => (
                                            <TouchableOpacity
                                                key={f.key}
                                                style={[styles.typeChip, form.recurringFrequency === f.key && styles.typeChipActive]}
                                                onPress={() => setForm({ ...form, recurringFrequency: f.key })}
                                            >
                                                <Text style={[
                                                    styles.typeChipText,
                                                    form.recurringFrequency === f.key && { color: Colors.text }
                                                ]}>{f.label}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>

                                    <Text style={[styles.label, { marginTop: 14, marginBottom: 8, fontSize: 12 }]}>Tekrar Süresi / Limiti</Text>
                                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                                        <TouchableOpacity
                                            style={[styles.typeChip, { flex: 1 }, form.recurringType === 'INFINITE' && styles.typeChipActive]}
                                            onPress={() => setForm({ ...form, recurringType: 'INFINITE' })}
                                        >
                                            <Text style={[styles.typeChipText, form.recurringType === 'INFINITE' && { color: Colors.text, fontWeight: 'bold' }]}>
                                                ♾️ Sonsuz (Süresiz)
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.typeChip, { flex: 1 }, form.recurringType === 'COUNT' && styles.typeChipActive]}
                                            onPress={() => setForm({ ...form, recurringType: 'COUNT' })}
                                        >
                                            <Text style={[styles.typeChipText, form.recurringType === 'COUNT' && { color: Colors.text, fontWeight: 'bold' }]}>
                                                🔢 Belirli Sayıda
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                    {form.recurringType === 'COUNT' && (
                                        <View style={{ marginTop: 6 }}>
                                            <Text style={[styles.label, { marginTop: 0, marginBottom: 6, fontSize: 11, color: Colors.textSecondary }]}>
                                                Toplam Tekrar / Taksit Sayısı
                                            </Text>
                                            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                                                {['3', '6', '9', '12'].map(cnt => (
                                                    <TouchableOpacity
                                                        key={cnt}
                                                        style={[
                                                            styles.typeChip,
                                                            { flex: 1, paddingVertical: 6 },
                                                            form.recurringTotalCount === cnt && styles.typeChipActive
                                                        ]}
                                                        onPress={() => setForm({ ...form, recurringTotalCount: cnt })}
                                                    >
                                                        <Text style={[
                                                            styles.typeChipText,
                                                            form.recurringTotalCount === cnt && { color: Colors.text, fontWeight: 'bold' }
                                                        ]}>{cnt}</Text>
                                                    </TouchableOpacity>
                                                ))}
                                                <TextInput
                                                    style={[styles.input, { width: 60, textAlign: 'center', marginBottom: 0, paddingVertical: 6 }]}
                                                    keyboardType="numeric"
                                                    value={form.recurringTotalCount}
                                                    onChangeText={(val) => setForm({ ...form, recurringTotalCount: val.replace(/\D/g, '') })}
                                                    placeholder="Özel"
                                                    placeholderTextColor={Colors.textSecondary}
                                                />
                                            </View>
                                        </View>
                                    )}
                                </View>
                            )}

                            <TouchableOpacity onPress={handleSave} style={{ marginTop: 10 }}>
                                <LinearGradient
                                    colors={[Colors.primary, '#5a52d5']}
                                    style={styles.saveButton}
                                >
                                    <Text style={styles.saveButtonText}>{editingId ? 'Güncelle' : 'Kaydet'}</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </KeyboardAwareScrollView>

                        {showDatePicker.visible && (
                            <DateTimePicker
                                value={form[showDatePicker.field] ? new Date(form[showDatePicker.field]) : new Date()}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={handleDateChange}
                            />
                        )}
                        {Platform.OS === 'ios' && showDatePicker.visible && (
                            <TouchableOpacity
                                style={{ alignItems: 'center', marginVertical: 10 }}
                                onPress={() => setShowDatePicker({ visible: false, field: null })}
                            >
                                <Text style={{ color: Colors.primary, fontSize: 16, fontWeight: 'bold' }}>Bitti</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Durum Rengine Dokunulduğunda Açılan İşlem Seçenekleri Modalı */}
            <Modal visible={!!actionPayment} animationType="fade" transparent onRequestClose={() => setActionPayment(null)}>
                <TouchableOpacity
                    style={styles.actionModalOverlay}
                    activeOpacity={1}
                    onPress={() => setActionPayment(null)}
                >
                    <View style={styles.actionModalSheet}>
                        <View style={styles.actionModalHeader}>
                            <Text style={styles.actionModalTitle} numberOfLines={1}>
                                {actionPayment?.institution || actionPayment?.description}
                            </Text>
                            <Text style={styles.actionModalSub}>
                                ₺ {formatMoney(actionPayment?.amount)}
                            </Text>
                        </View>

                        {/* Durum Değiştir Butonu */}
                        <TouchableOpacity
                            style={[
                                styles.actionBtn,
                                { backgroundColor: actionPayment?.status === 'PAID' ? 'rgba(255,149,0,0.15)' : 'rgba(50,215,75,0.15)' }
                            ]}
                            onPress={() => {
                                const target = actionPayment;
                                setActionPayment(null);
                                handleStatusToggle(target);
                            }}
                        >
                            <Ionicons
                                name={actionPayment?.status === 'PAID' ? 'time' : 'checkmark-circle'}
                                size={20}
                                color={actionPayment?.status === 'PAID' ? '#ff9500' : '#32d74b'}
                            />
                            <Text style={[
                                styles.actionBtnText,
                                { color: actionPayment?.status === 'PAID' ? '#ff9500' : '#32d74b' }
                            ]}>
                                {actionPayment?.status === 'PAID' ? 'Bekliyor Olarak İşaretle' : 'Ödendi Olarak İşaretle'}
                            </Text>
                        </TouchableOpacity>

                        {/* Düzenle Butonu */}
                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => {
                                const target = actionPayment;
                                setActionPayment(null);
                                handleEdit(target);
                            }}
                        >
                            <Ionicons name="create-outline" size={20} color={Colors.primary} />
                            <Text style={[styles.actionBtnText, { color: Colors.primary }]}>
                                Ödemeyi Düzenle
                            </Text>
                        </TouchableOpacity>

                        {/* Sil Butonu */}
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: 'rgba(255,69,58,0.1)' }]}
                            onPress={() => {
                                const target = actionPayment;
                                setActionPayment(null);
                                handleDelete(target);
                            }}
                        >
                            <Ionicons name="trash-outline" size={20} color={Colors.error} />
                            <Text style={[styles.actionBtnText, { color: Colors.error }]}>
                                Ödemeyi Sil
                            </Text>
                        </TouchableOpacity>

                        {/* Kapat Butonu */}
                        <TouchableOpacity
                            style={[styles.actionBtn, { marginTop: 6, backgroundColor: 'rgba(255,255,255,0.06)' }]}
                            onPress={() => setActionPayment(null)}
                        >
                            <Text style={[styles.actionBtnText, { color: Colors.textSecondary }]}>
                                Kapat
                            </Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Ay Seçici Modal */}
            <Modal visible={isMonthPickerVisible} animationType="fade" transparent onRequestClose={() => setIsMonthPickerVisible(false)}>
                <TouchableOpacity
                    style={styles.monthModalOverlay}
                    activeOpacity={1}
                    onPress={() => setIsMonthPickerVisible(false)}
                >
                    <TouchableOpacity style={styles.monthModalContent} activeOpacity={1}>
                        <View style={styles.monthModalHeader}>
                            <View style={styles.yearSelectorRow}>
                                <TouchableOpacity
                                    style={styles.monthNavBtn}
                                    onPress={() => setSelectedYear(prev => prev - 1)}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                    <Ionicons name="chevron-back" size={18} color="#fff" />
                                </TouchableOpacity>
                                <Text style={styles.yearTitle}>{selectedYear}</Text>
                                <TouchableOpacity
                                    style={styles.monthNavBtn}
                                    onPress={() => setSelectedYear(prev => prev + 1)}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                    <Ionicons name="chevron-forward" size={18} color="#fff" />
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity onPress={() => setIsMonthPickerVisible(false)}>
                                <Ionicons name="close-circle" size={24} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.monthGrid}>
                            {MONTH_NAMES.map((name, idx) => {
                                const isSelected = selectedMonth === idx;
                                const count = monthStats[idx] || 0;
                                const isCurrent = idx === new Date().getMonth() && selectedYear === new Date().getFullYear();

                                return (
                                    <TouchableOpacity
                                        key={idx}
                                        style={[
                                            styles.monthGridBtn,
                                            isSelected && styles.monthGridBtnActive,
                                            isCurrent && !isSelected && styles.monthGridBtnCurrent
                                        ]}
                                        onPress={() => {
                                            setSelectedMonth(idx);
                                            setIsMonthPickerVisible(false);
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[styles.monthGridBtnText, isSelected && styles.monthGridBtnTextActive]}>
                                            {name}
                                        </Text>
                                        <Text style={[styles.monthBadgeCount, isSelected && styles.monthBadgeCountActive]}>
                                            {count > 0 ? `${count} ödeme` : '-'}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Tüm Yılı Göster Seçeneği */}
                        <TouchableOpacity
                            style={[styles.modalAllYearBtn, selectedMonth === 'ALL' && styles.modalAllYearBtnActive]}
                            onPress={() => {
                                setSelectedMonth('ALL');
                                setIsMonthPickerVisible(false);
                            }}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="calendar" size={16} color={selectedMonth === 'ALL' ? '#fff' : Colors.primary} />
                            <Text style={[styles.modalAllYearBtnText, selectedMonth === 'ALL' && styles.modalAllYearBtnTextActive]}>
                                {selectedYear} Yılının Tüm Ödemelerini Göster
                            </Text>
                        </TouchableOpacity>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background, paddingTop: 50 },
    header: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', paddingHorizontal: Layout.screenPadding,
    },
    addButton: {
        width: 44, height: 44, borderRadius: 14,
        alignItems: 'center', justifyContent: 'center',
    },

    // Ay Gezinti Barı
    monthNavigator: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Layout.screenPadding,
        marginVertical: 10,
        gap: 6,
    },
    monthNavBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    monthCenter: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        paddingVertical: 7,
        paddingHorizontal: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    monthTitle: {
        color: Colors.text,
        fontSize: 13,
        fontWeight: '700',
    },
    currentMonthBadge: {
        marginLeft: 6,
        backgroundColor: Colors.primary + '25',
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: Colors.primary + '40',
    },
    currentMonthBadgeText: {
        color: Colors.primary,
        fontSize: 9.5,
        fontWeight: '700',
    },
    allYearPill: {
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    allYearPillActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    allYearPillText: {
        color: Colors.textSecondary,
        fontSize: 11.5,
        fontWeight: '600',
    },
    allYearPillTextActive: {
        color: Colors.text,
        fontWeight: '700',
    },

    // Kategori Filtre Butonları (Tek Satır, 5 Buton)
    filterRow: {
        flexDirection: 'row',
        paddingHorizontal: Layout.screenPadding,
        gap: 5,
        marginBottom: 10,
    },
    filterTab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 7,
        paddingHorizontal: 2,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        gap: 3,
    },
    filterTabActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    filterTabText: {
        color: Colors.textSecondary,
        fontSize: 11,
        fontWeight: '600',
        includeFontPadding: false,
    },
    filterTabTextActive: {
        color: Colors.text,
        fontWeight: '700',
    },

    // Ay Seçici Modal Stilleri
    monthModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    monthModalContent: {
        width: '100%',
        maxWidth: 360,
        backgroundColor: Colors.surface,
        borderRadius: 18,
        padding: 18,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    monthModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    yearSelectorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    yearTitle: {
        color: Colors.text,
        fontSize: 16,
        fontWeight: '700',
    },
    monthGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        justifyContent: 'space-between',
    },
    monthGridBtn: {
        width: '31%',
        paddingVertical: 9,
        borderRadius: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    monthGridBtnActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    monthGridBtnCurrent: {
        borderColor: Colors.primary + '80',
    },
    monthGridBtnText: {
        color: Colors.text,
        fontSize: 12,
        fontWeight: '600',
    },
    monthGridBtnTextActive: {
        color: Colors.text,
        fontWeight: '800',
    },
    monthBadgeCount: {
        marginTop: 2,
        fontSize: 9.5,
        color: Colors.textSecondary,
    },
    monthBadgeCountActive: {
        color: 'rgba(255,255,255,0.9)',
        fontWeight: '700',
    },
    modalAllYearBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 14,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    modalAllYearBtnActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    modalAllYearBtnText: {
        color: Colors.primary,
        fontSize: 12.5,
        fontWeight: '700',
    },
    modalAllYearBtnTextActive: {
        color: Colors.text,
        fontWeight: '700',
    },

    // Kompakt 2 Satırlı Ödeme Kartı
    compactPaymentCard: {
        flexDirection: 'row',
        backgroundColor: Colors.surface,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        overflow: 'hidden',
    },
    cardContentArea: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 12,
        justifyContent: 'center',
    },
    cardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    leftRowGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1,
        marginRight: 10,
        overflow: 'hidden',
    },
    institutionText: {
        color: Colors.text,
        fontSize: 14.5,
        fontWeight: '700',
        maxWidth: 150,
    },
    statementText: {
        fontSize: 10.5,
        color: Colors.textSecondary,
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 4,
    },
    debtAmountText: {
        color: Colors.text,
        fontSize: 15,
        fontWeight: 'bold',
        textAlign: 'right',
    },
    descText: {
        color: Colors.textSecondary,
        fontSize: 12,
        maxWidth: 130,
    },
    dueDateBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    dueDateText: {
        color: Colors.textSecondary,
        fontSize: 11,
    },
    paymentAmountText: {
        color: Colors.primary,
        fontSize: 12.5,
        fontWeight: '600',
        textAlign: 'right',
    },
    miniRecurringBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        backgroundColor: 'rgba(56, 189, 248, 0.15)',
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 4,
    },
    miniRecurringText: {
        color: Colors.primary,
        fontSize: 9.5,
        fontWeight: '700',
    },

    // Sağ Dikey Durum Rengi Barı
    verticalStatusBar: {
        width: 38,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 6,
        gap: 4,
    },
    verticalStatusText: {
        color: Colors.text,
        fontSize: 8,
        fontWeight: '800',
        letterSpacing: 0.5,
    },

    // İşlem Seçenekleri Modalı
    actionModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.65)',
        justifyContent: 'flex-end',
        padding: 16,
    },
    actionModalSheet: {
        backgroundColor: '#1a1a2e',
        borderRadius: 20,
        padding: 18,
        gap: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    actionModalHeader: {
        alignItems: 'center',
        marginBottom: 10,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    actionModalTitle: {
        color: Colors.text,
        fontSize: 16,
        fontWeight: 'bold',
    },
    actionModalSub: {
        color: Colors.primary,
        fontSize: 14,
        fontWeight: '600',
        marginTop: 2,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 13,
        borderRadius: 12,
        backgroundColor: Colors.surface,
    },
    actionBtnText: {
        fontSize: 14.5,
        fontWeight: '600',
    },

    emptyState: { alignItems: 'center', paddingTop: 80 },
    // Modal
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Colors.background, borderTopLeftRadius: 24,
        borderTopRightRadius: 24, padding: 25, maxHeight: '85%',
    },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 20,
    },
    modalTitle: { color: Colors.text, fontSize: 22, fontWeight: 'bold' },
    label: {
        color: Colors.textSecondary, fontSize: 13, fontWeight: '600',
        marginBottom: 6, marginTop: 12,
    },
    typeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    typeChip: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 14, paddingVertical: 10,
        borderRadius: 12, backgroundColor: Colors.surface,
        borderWidth: 1, borderColor: Colors.border,
    },
    typeChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '20' },
    typeChipText: { color: Colors.textSecondary, fontSize: 13 },
    modalInput: {
        backgroundColor: Colors.surface, borderRadius: 12,
        padding: 14, color: Colors.text, fontSize: 15,
        borderWidth: 1, borderColor: Colors.border,
        textAlign: 'right', // Rakamlar ve yazılar sağa dayalı
    },
    saveButton: {
        borderRadius: 14, paddingVertical: 16,
        alignItems: 'center', marginBottom: 20,
    },
    saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
