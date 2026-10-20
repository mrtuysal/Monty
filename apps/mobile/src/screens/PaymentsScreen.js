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
    const { payments, addPayment, updatePayment, deletePayment, formatMoney, formatDate } = useData();
    const [modalVisible, setModalVisible] = useState(false);
    const [form, setForm] = useState(initialForm);
    const [filter, setFilter] = useState('ALL');
    const [editingId, setEditingId] = useState(null);
    const [showDatePicker, setShowDatePicker] = useState({ visible: false, field: null });

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
        return [...payments]
            .filter(p => filter === 'ALL' || p.type === filter)
            .sort((a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0));
    }, [payments, filter]);

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
        const status = STATUS_MAP[item.status] || STATUS_MAP.PENDING;
        return (
            <TouchableOpacity
                style={styles.paymentCard}
                activeOpacity={0.7}
                onPress={() => handleEdit(item)}
            >
                <View style={styles.paymentHeader}>
                    <Text style={{ fontSize: 24 }}>{typeEmoji(item.type)}</Text>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Text style={styles.paymentInstitution}>
                                {item.institution || item.description}
                            </Text>
                            {item.isRecurring && (() => {
                                const parsed = parseRecurringConfig(item.recurringFrequency);
                                return (
                                    <View style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        backgroundColor: 'rgba(56, 189, 248, 0.15)',
                                        paddingHorizontal: 6,
                                        paddingVertical: 2,
                                        borderRadius: 4,
                                        gap: 3
                                    }}>
                                        <Ionicons name="repeat" size={11} color={Colors.primary} />
                                        <Text style={{ color: Colors.primary, fontSize: 10, fontWeight: '700' }}>
                                            {parsed.label}
                                        </Text>
                                    </View>
                                );
                            })()}
                        </View>
                        {item.description && item.institution && (
                            <Text style={styles.paymentDesc}>{item.description}</Text>
                        )}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity onPress={() => handleEdit(item)}>
                            <Ionicons name="create-outline" size={18} color={Colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDelete(item)}>
                            <Ionicons name="trash-outline" size={18} color={Colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.paymentDetails}>
                    <View style={styles.detailItem}>
                        <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
                        <Text style={styles.detailText}>{formatDate(item.dueDate)}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
                        <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                        <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                    </View>
                </View>

                <View style={styles.paymentFooter}>
                    <Text style={styles.paymentAmount}>₺ {formatMoney(item.amount)}</Text>
                    <TouchableOpacity
                        onPress={() => handleStatusToggle(item)}
                        style={[
                            styles.toggleBtn,
                            item.status === 'PAID' && styles.toggleBtnPaid,
                        ]}
                    >
                        <Ionicons
                            name={item.status === 'PAID' ? 'checkmark-circle' : 'checkmark-circle-outline'}
                            size={18}
                            color={item.status === 'PAID' ? Colors.success : Colors.textSecondary}
                        />
                        <Text style={{
                            color: item.status === 'PAID' ? Colors.success : Colors.textSecondary,
                            fontSize: 13, fontWeight: '600',
                        }}>
                            {item.status === 'PAID' ? 'Ödendi' : 'Öde'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={Typography.h1}>Ödemeler</Text>
                <TouchableOpacity onPress={() => { setEditingId(null); setForm(initialForm); setModalVisible(true); }}>
                    <LinearGradient
                        colors={[Colors.primary, '#5a52d5']}
                        style={styles.addButton}
                    >
                        <Ionicons name="add" size={24} color="#fff" />
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            {/* Filters */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
                <TouchableOpacity
                    style={[styles.filterChip, filter === 'ALL' && styles.filterActive]}
                    onPress={() => setFilter('ALL')}
                >
                    <Text style={[styles.filterText, filter === 'ALL' && styles.filterActiveText]}>Tümü</Text>
                </TouchableOpacity>
                {PAYMENT_TYPES.map(t => (
                    <TouchableOpacity
                        key={t.key}
                        style={[styles.filterChip, filter === t.key && styles.filterActive]}
                        onPress={() => setFilter(t.key)}
                    >
                        <Text style={[styles.filterText, filter === t.key && styles.filterActiveText]}>
                            {t.emoji} {t.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

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
                    <Text style={{ color: '#fff', fontSize: 15, fontWeight: 'bold', marginTop: 2 }}>₺{totals.total.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
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
                        <Text style={{ color: Colors.textSecondary, marginTop: 10, fontSize: 15 }}>
                            Henüz ödeme yok
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
                                            form.type === t.key && { color: '#fff' }
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
                                                    form.recurringFrequency === f.key && { color: '#fff' }
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
                                            <Text style={[styles.typeChipText, form.recurringType === 'INFINITE' && { color: '#fff', fontWeight: 'bold' }]}>
                                                ♾️ Sonsuz (Süresiz)
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.typeChip, { flex: 1 }, form.recurringType === 'COUNT' && styles.typeChipActive]}
                                            onPress={() => setForm({ ...form, recurringType: 'COUNT' })}
                                        >
                                            <Text style={[styles.typeChipText, form.recurringType === 'COUNT' && { color: '#fff', fontWeight: 'bold' }]}>
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
                                                            form.recurringTotalCount === cnt && { color: '#fff', fontWeight: 'bold' }
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
    filterBar: { paddingHorizontal: 15, marginVertical: 15, flexGrow: 0 },
    filterChip: {
        paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
        marginRight: 8, backgroundColor: Colors.surface,
        borderWidth: 1, borderColor: Colors.border,
    },
    filterActive: { backgroundColor: Colors.primary + '20', borderColor: Colors.primary },
    filterText: { color: Colors.textSecondary, fontSize: 13 },
    filterActiveText: { color: Colors.primary, fontWeight: '600' },
    paymentCard: {
        backgroundColor: Colors.surface, borderRadius: 16, padding: 16,
        marginBottom: 12, borderWidth: 1, borderColor: Colors.border,
    },
    paymentHeader: { flexDirection: 'row', alignItems: 'center' },
    paymentInstitution: { color: '#fff', fontSize: 16, fontWeight: '600' },
    paymentDesc: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
    paymentDetails: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginTop: 12,
    },
    detailItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    detailText: { color: Colors.textSecondary, fontSize: 12 },
    statusBadge: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, gap: 5,
    },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: 12, fontWeight: '600' },
    paymentFooter: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginTop: 12, paddingTop: 12,
        borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
    },
    paymentAmount: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
    toggleBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 14, paddingVertical: 8,
        borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)',
    },
    toggleBtnPaid: { backgroundColor: 'rgba(50,215,75,0.1)' },
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
    modalTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
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
        padding: 14, color: '#fff', fontSize: 15,
        borderWidth: 1, borderColor: Colors.border,
        textAlign: 'right', // Rakamlar ve yazılar sağa dayalı
    },
    saveButton: {
        borderRadius: 14, paddingVertical: 16,
        alignItems: 'center', marginBottom: 20,
    },
    saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
