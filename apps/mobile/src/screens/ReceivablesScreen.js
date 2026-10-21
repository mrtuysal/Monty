import React, { useState, useMemo, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Modal, Alert, FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Colors, Typography, Layout } from '../constants/Theme';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';

const parseDateInput = (val) => {
    if (!val) return null;
    const str = String(val).trim();
    const trMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (trMatch) {
        return `${trMatch[3]}-${trMatch[2].padStart(2, '0')}-${trMatch[1].padStart(2, '0')}`;
    }
    return str.split('T')[0];
};

const getTodayFormatted = () => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}.${month}.${d.getFullYear()}`;
};

const initialForm = {
    type: 'RECEIVABLE', // RECEIVABLE or DEBT
    person: '',
    description: '',
    amount: '',
    date: getTodayFormatted(),
    dueDate: '',
    notes: '',
    status: 'PENDING',
};

export default function ReceivablesScreen() {
    const { colors, isDark } = useTheme();
    const { receivables, addReceivable, updateReceivable, deleteReceivable, formatMoney, formatDate } = useData();

    const [activeTab, setActiveTab] = useState('ALL'); // ALL, RECEIVABLE, DEBT
    const [modalVisible, setModalVisible] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [actionItem, setActionItem] = useState(null);
    const [form, setForm] = useState(initialForm);

    // Summary calculations
    const stats = useMemo(() => {
        let totalReceivable = 0;
        let totalDebt = 0;

        receivables.forEach(r => {
            const amount = parseFloat(r.amount) || 0;
            if (r.status !== 'DONE') {
                if (r.type === 'RECEIVABLE') totalReceivable += amount;
                else if (r.type === 'DEBT') totalDebt += amount;
            }
        });

        return {
            totalReceivable,
            totalDebt,
            net: totalReceivable - totalDebt
        };
    }, [receivables]);

    // Filtered list
    const filteredList = useMemo(() => {
        return receivables.filter(r => {
            if (activeTab === 'RECEIVABLE') return r.type === 'RECEIVABLE';
            if (activeTab === 'DEBT') return r.type === 'DEBT';
            return true;
        }).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    }, [receivables, activeTab]);

    const handleOpenAdd = () => {
        setEditingId(null);
        setForm({
            ...initialForm,
            type: activeTab === 'DEBT' ? 'DEBT' : 'RECEIVABLE',
            date: getTodayFormatted()
        });
        setModalVisible(true);
    };

    const handleOpenEdit = (item) => {
        setEditingId(item.id);
        setForm({
            type: item.type || 'RECEIVABLE',
            person: item.person || '',
            description: item.description || '',
            amount: item.amount ? String(item.amount) : '',
            date: formatDate(item.date || new Date()),
            dueDate: item.dueDate || item.due_date ? formatDate(item.dueDate || item.due_date) : '',
            notes: item.notes || '',
            status: item.status || 'PENDING',
        });
        setModalVisible(true);
    };

    const handleSave = useCallback(async () => {
        if (!form.person.trim()) {
            Alert.alert('Hata', 'Kişi veya kurum adı gereklidir.');
            return;
        }
        const parsedAmount = parseFloat(form.amount.replace(',', '.'));
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            Alert.alert('Hata', 'Geçerli bir tutar giriniz.');
            return;
        }

        const payload = {
            type: form.type,
            person: form.person.trim(),
            description: form.description.trim(),
            amount: parsedAmount,
            date: parseDateInput(form.date) || new Date().toISOString().split('T')[0],
            dueDate: parseDateInput(form.dueDate),
            notes: form.notes.trim(),
            status: form.status,
        };

        if (editingId) {
            await updateReceivable(editingId, payload);
        } else {
            await addReceivable(payload);
        }

        setModalVisible(false);
        setEditingId(null);
        setForm(initialForm);
    }, [form, editingId, addReceivable, updateReceivable]);

    const handleDelete = useCallback((item) => {
        Alert.alert(
            'Kaydı Sil',
            `"${item.person}" kaydını silmek istediğinize emin misiniz?`,
            [
                { text: 'İptal', style: 'cancel' },
                { text: 'Sil', style: 'destructive', onPress: () => deleteReceivable(item.id) },
            ]
        );
    }, [deleteReceivable]);

    const handleToggleDone = useCallback((item) => {
        const nextStatus = item.status === 'DONE' ? 'PENDING' : 'DONE';
        updateReceivable(item.id, { status: nextStatus });
    }, [updateReceivable]);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={[Typography.h1, { color: colors.text }]}>Alacak & Borç</Text>
                <TouchableOpacity onPress={handleOpenAdd}>
                    <LinearGradient
                        colors={[Colors.primary, '#5a52d5']}
                        style={styles.addButton}
                    >
                        <Ionicons name="add" size={24} color="#fff" />
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            {/* Summary Net Balance Card */}
            <LinearGradient
                colors={['#1c1a2e', '#13121f']}
                style={styles.netCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.netRow}>
                    <View>
                        <Text style={styles.netLabel}>Net Durum</Text>
                        <Text style={[styles.netAmount, { color: stats.net >= 0 ? Colors.success : Colors.error }]}>
                            ₺ {formatMoney(Math.abs(stats.net))}
                            <Text style={{ fontSize: 13, color: Colors.textSecondary }}>
                                {stats.net >= 0 ? ' (Artıda)' : ' (Ekside)'}
                            </Text>
                        </Text>
                    </View>
                    <Ionicons
                        name={stats.net >= 0 ? 'trending-up' : 'trending-down'}
                        size={32}
                        color={stats.net >= 0 ? Colors.success : Colors.error}
                    />
                </View>

                <View style={styles.statsSplit}>
                    <View style={styles.statBox}>
                        <Text style={styles.statBoxLabel}>Alacaklarım</Text>
                        <Text style={[styles.statBoxVal, { color: Colors.success }]}>
                            +₺ {formatMoney(stats.totalReceivable)}
                        </Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statBox}>
                        <Text style={styles.statBoxLabel}>Borçlarım</Text>
                        <Text style={[styles.statBoxVal, { color: Colors.error }]}>
                            -₺ {formatMoney(stats.totalDebt)}
                        </Text>
                    </View>
                </View>
            </LinearGradient>

            {/* Tab Filter */}
            <View style={styles.tabContainer}>
                {[
                    { key: 'ALL', label: 'Tümü' },
                    { key: 'RECEIVABLE', label: 'Alacaklarım' },
                    { key: 'DEBT', label: 'Borçlarım' },
                ].map(t => (
                    <TouchableOpacity
                        key={t.key}
                        style={[styles.tabBtn, activeTab === t.key && styles.tabBtnActive]}
                        onPress={() => setActiveTab(t.key)}
                    >
                        <Text style={[styles.tabBtnText, activeTab === t.key && styles.tabBtnTextActive]}>
                            {t.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* List */}
            <FlatList
                data={filteredList}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="documents-outline" size={48} color={Colors.textSecondary} />
                        <Text style={styles.emptyText}>Henüz kayıt bulunmuyor.</Text>
                    </View>
                }
                renderItem={({ item }) => {
                    const isReceivable = item.type === 'RECEIVABLE';
                    const isDone = item.status === 'DONE';

                    return (
                        <View style={[styles.compactCard, isDone && { opacity: 0.75 }]}>
                            {/* Sol / Orta İçerik Alanı (2 Kompakt Satır) */}
                            <TouchableOpacity
                                style={styles.cardContentArea}
                                activeOpacity={0.7}
                                onPress={() => handleOpenEdit(item)}
                            >
                                {/* 1. Üst Satır: Daha büyük şekilde isim, karşısında tutar */}
                                <View style={styles.cardRow}>
                                    <View style={styles.leftRowGroup}>
                                        <Text style={styles.personText} numberOfLines={1}>
                                            {item.person}
                                        </Text>
                                        <View style={[
                                            styles.miniTypeBadge,
                                            { backgroundColor: isReceivable ? 'rgba(50,215,75,0.15)' : 'rgba(255,69,58,0.15)' }
                                        ]}>
                                            <Text style={[
                                                styles.miniTypeText,
                                                { color: isReceivable ? Colors.success : Colors.error }
                                            ]}>
                                                {isReceivable ? 'Alacak' : 'Borç'}
                                            </Text>
                                        </View>
                                    </View>

                                    <Text style={[
                                        styles.amountText,
                                        { color: isDone ? Colors.textSecondary : isReceivable ? Colors.success : Colors.error }
                                    ]}>
                                        {isReceivable ? '+' : '-'}₺ {formatMoney(item.amount)}
                                    </Text>
                                </View>

                                {/* 2. Alt Satır: İsim altında açıklama, karşısında tarih */}
                                <View style={[styles.cardRow, { marginTop: 4 }]}>
                                    <Text style={styles.descText} numberOfLines={1}>
                                        {item.description || (isReceivable ? 'Alacak Kaydı' : 'Borç Kaydı')}
                                    </Text>

                                    <View style={styles.dateBadge}>
                                        <Ionicons
                                            name={(item.dueDate || item.due_date) ? "time-outline" : "calendar-outline"}
                                            size={11}
                                            color={(item.dueDate || item.due_date) ? '#FF9500' : Colors.textSecondary}
                                        />
                                        <Text style={[
                                            styles.dateText,
                                            (item.dueDate || item.due_date) && { color: '#FF9500', fontWeight: '600' }
                                        ]}>
                                            {(item.dueDate || item.due_date)
                                                ? `Vade: ${formatDate(item.dueDate || item.due_date)}`
                                                : formatDate(item.date)}
                                        </Text>
                                    </View>
                                </View>
                            </TouchableOpacity>

                            {/* En Sağda: İki Satırı da Kapsayan Dikey Durum Rengi Çubuğu */}
                            <TouchableOpacity
                                style={[
                                    styles.verticalStatusBar,
                                    { backgroundColor: isDone ? '#32d74b' : '#ff9500' }
                                ]}
                                activeOpacity={0.7}
                                onPress={() => setActionItem(item)}
                            >
                                <Ionicons
                                    name={isDone ? 'checkmark-circle' : 'time'}
                                    size={18}
                                    color="#fff"
                                />
                                <Text style={styles.verticalStatusText}>
                                    {isDone ? (isReceivable ? 'TAHSİL' : 'ÖDENDİ') : 'BEKLİYOR'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    );
                }}
            />

            {/* Add / Edit Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAwareScrollView contentContainerStyle={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {editingId ? 'Kaydı Düzenle' : 'Yeni Alacak / Borç'}
                            </Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        {/* Type Picker */}
                        <View style={styles.typeSelector}>
                            <TouchableOpacity
                                style={[
                                    styles.typeSelectorBtn,
                                    form.type === 'RECEIVABLE' && { backgroundColor: 'rgba(50,215,75,0.2)', borderColor: Colors.success }
                                ]}
                                onPress={() => setForm(f => ({ ...f, type: 'RECEIVABLE' }))}
                            >
                                <Ionicons name="arrow-down" size={18} color={Colors.success} />
                                <Text style={[styles.typeSelectorText, form.type === 'RECEIVABLE' && { color: Colors.success }]}>
                                    Alacak
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.typeSelectorBtn,
                                    form.type === 'DEBT' && { backgroundColor: 'rgba(255,69,58,0.2)', borderColor: Colors.error }
                                ]}
                                onPress={() => setForm(f => ({ ...f, type: 'DEBT' }))}
                            >
                                <Ionicons name="arrow-up" size={18} color={Colors.error} />
                                <Text style={[styles.typeSelectorText, form.type === 'DEBT' && { color: Colors.error }]}>
                                    Borç
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Person Name */}
                        <Text style={styles.inputLabel}>Kişi veya Kurum Adı *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Örn: Ahmet Yılmaz, ABC Ltd."
                            placeholderTextColor={Colors.textSecondary}
                            value={form.person}
                            onChangeText={(val) => setForm(f => ({ ...f, person: val }))}
                        />

                        {/* Amount */}
                        <Text style={styles.inputLabel}>Tutar (₺) *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="0,00"
                            placeholderTextColor={Colors.textSecondary}
                            keyboardType="numeric"
                            value={form.amount}
                            onChangeText={(val) => setForm(f => ({ ...f, amount: val }))}
                        />

                        {/* Description */}
                        <Text style={styles.inputLabel}>Açıklama</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Örn: Yemek parası, Proje avansı"
                            placeholderTextColor={Colors.textSecondary}
                            value={form.description}
                            onChangeText={(val) => setForm(f => ({ ...f, description: val }))}
                        />

                        {/* Date and Due Date */}
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.inputLabel}>İşlem Tarihi</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="GG.AA.YYYY"
                                    placeholderTextColor={Colors.textSecondary}
                                    value={form.date}
                                    onChangeText={(val) => setForm(f => ({ ...f, date: val }))}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.inputLabel}>Vade Tarihi</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="GG.AA.YYYY (Opsiyonel)"
                                    placeholderTextColor={Colors.textSecondary}
                                    value={form.dueDate}
                                    onChangeText={(val) => setForm(f => ({ ...f, dueDate: val }))}
                                />
                            </View>
                        </View>

                        {/* Notes */}
                        <Text style={styles.inputLabel}>Notlar</Text>
                        <TextInput
                            style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
                            placeholder="Ek notlar ekleyin..."
                            placeholderTextColor={Colors.textSecondary}
                            multiline
                            value={form.notes}
                            onChangeText={(val) => setForm(f => ({ ...f, notes: val }))}
                        />

                        {/* Save Button */}
                        <TouchableOpacity style={{ marginTop: 20 }} onPress={handleSave}>
                            <LinearGradient
                                colors={[Colors.primary, '#5a52d5']}
                                style={styles.saveBtn}
                            >
                                <Text style={styles.saveBtnText}>
                                    {editingId ? 'Güncelle' : 'Kaydet'}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </KeyboardAwareScrollView>
            </Modal>

            {/* Durum Rengi Çubuğuna Basıldığında Açılan İşlem Seçenekleri Modalı */}
            <Modal visible={!!actionItem} animationType="fade" transparent onRequestClose={() => setActionItem(null)}>
                <TouchableOpacity
                    style={styles.actionModalOverlay}
                    activeOpacity={1}
                    onPress={() => setActionItem(null)}
                >
                    <View style={styles.actionModalSheet}>
                        <View style={styles.actionModalHeader}>
                            <Text style={styles.actionModalTitle} numberOfLines={1}>
                                {actionItem?.person}
                            </Text>
                            <Text style={[
                                styles.actionModalSub,
                                { color: actionItem?.type === 'RECEIVABLE' ? Colors.success : Colors.error }
                            ]}>
                                {actionItem?.type === 'RECEIVABLE' ? 'Alacak: +' : 'Borç: -'}₺ {formatMoney(actionItem?.amount)}
                            </Text>
                        </View>

                        {/* Durum Değiştir Butonu */}
                        <TouchableOpacity
                            style={[
                                styles.actionBtn,
                                { backgroundColor: actionItem?.status === 'DONE' ? 'rgba(255,149,0,0.15)' : 'rgba(50,215,75,0.15)' }
                            ]}
                            onPress={() => {
                                const target = actionItem;
                                setActionItem(null);
                                handleToggleDone(target);
                            }}
                        >
                            <Ionicons
                                name={actionItem?.status === 'DONE' ? 'time' : 'checkmark-circle'}
                                size={20}
                                color={actionItem?.status === 'DONE' ? '#ff9500' : '#32d74b'}
                            />
                            <Text style={[
                                styles.actionBtnText,
                                { color: actionItem?.status === 'DONE' ? '#ff9500' : '#32d74b' }
                            ]}>
                                {actionItem?.status === 'DONE'
                                    ? 'Bekliyor Olarak Değiştir'
                                    : (actionItem?.type === 'RECEIVABLE' ? 'Tahsil Edildi Olarak İşaretle' : 'Ödendi Olarak İşaretle')}
                            </Text>
                        </TouchableOpacity>

                        {/* Düzenle Butonu */}
                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => {
                                const target = actionItem;
                                setActionItem(null);
                                handleOpenEdit(target);
                            }}
                        >
                            <Ionicons name="create-outline" size={20} color={Colors.primary} />
                            <Text style={[styles.actionBtnText, { color: Colors.primary }]}>
                                Kaydı Düzenle
                            </Text>
                        </TouchableOpacity>

                        {/* Sil Butonu */}
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: 'rgba(255,69,58,0.1)' }]}
                            onPress={() => {
                                const target = actionItem;
                                setActionItem(null);
                                handleDelete(target);
                            }}
                        >
                            <Ionicons name="trash-outline" size={20} color={Colors.error} />
                            <Text style={[styles.actionBtnText, { color: Colors.error }]}>
                                Kaydı Sil
                            </Text>
                        </TouchableOpacity>

                        {/* Kapat Butonu */}
                        <TouchableOpacity
                            style={[styles.actionBtn, { marginTop: 6, backgroundColor: 'rgba(255,255,255,0.06)' }]}
                            onPress={() => setActionItem(null)}
                        >
                            <Text style={[styles.actionBtnText, { color: Colors.textSecondary }]}>
                                Kapat
                            </Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background, paddingTop: 50 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Layout.screenPadding,
        marginBottom: 12,
    },
    addButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    netCard: {
        marginHorizontal: Layout.screenPadding,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        marginBottom: 12,
    },
    netRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    netLabel: {
        color: Colors.textSecondary,
        fontSize: 12.5,
        fontWeight: '500',
    },
    netAmount: {
        fontSize: 22,
        fontWeight: '700',
        marginTop: 2,
    },
    statsSplit: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.08)',
        paddingTop: 10,
    },
    statBox: {
        flex: 1,
    },
    statBoxLabel: {
        color: Colors.textSecondary,
        fontSize: 11.5,
    },
    statBoxVal: {
        fontSize: 15,
        fontWeight: '600',
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        backgroundColor: 'rgba(255,255,255,0.08)',
        marginHorizontal: 12,
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: Layout.screenPadding,
        gap: 8,
        marginBottom: 10,
    },
    tabBtn: {
        paddingVertical: 7,
        paddingHorizontal: 14,
        borderRadius: 18,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    tabBtnActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    tabBtnText: {
        color: Colors.textSecondary,
        fontSize: 12.5,
        fontWeight: '600',
    },
    tabBtnTextActive: {
        color: Colors.text,
    },
    listContent: {
        paddingHorizontal: Layout.screenPadding,
        paddingBottom: 35,
    },

    // Kompakt 2 Satırlı Kart
    compactCard: {
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
    },
    personText: {
        color: Colors.text,
        fontSize: 15.5,
        fontWeight: 'bold',
        maxWidth: 160,
    },
    miniTypeBadge: {
        paddingHorizontal: 5,
        paddingVertical: 1.5,
        borderRadius: 4,
    },
    miniTypeText: {
        fontSize: 10,
        fontWeight: '700',
    },
    amountText: {
        fontSize: 15.5,
        fontWeight: 'bold',
        textAlign: 'right',
    },
    descText: {
        color: Colors.textSecondary,
        fontSize: 12,
        maxWidth: 150,
    },
    dateBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    dateText: {
        color: Colors.textSecondary,
        fontSize: 11.5,
    },

    // Dikey Durum Rengi Barı
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
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 50,
    },
    emptyText: {
        color: Colors.textSecondary,
        fontSize: 14,
        marginTop: 10,
    },
    modalOverlay: {
        flexGrow: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    modalContent: {
        backgroundColor: '#161618',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        color: Colors.text,
        fontSize: 18,
        fontWeight: '700',
    },
    typeSelector: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    typeSelectorBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    typeSelectorText: {
        color: Colors.textSecondary,
        fontSize: 14,
        fontWeight: '600',
    },
    inputLabel: {
        color: Colors.textSecondary,
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 6,
        marginTop: 10,
    },
    input: {
        backgroundColor: '#1f1f22',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        color: Colors.text,
        fontSize: 15,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    saveBtn: {
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    saveBtnText: {
        color: Colors.text,
        fontSize: 16,
        fontWeight: '600',
    },
});
