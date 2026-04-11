import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Layout } from '../constants/Theme';

export default function PremiumButton({ title, onPress, variant = 'primary', style }) {
    const isPrimary = variant === 'primary';
    const gradientColors = isPrimary
        ? [Colors.primary, '#5a52d5']
        : [Colors.surface, Colors.cardGradientEnd];

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[styles.container, style]}>
            <LinearGradient
                colors={gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
            >
                <Text style={[styles.text, !isPrimary && { color: Colors.textSecondary }]}>{title}</Text>
            </LinearGradient>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: Layout.borderRadius,
        overflow: 'hidden',
        height: 50,
        marginVertical: 10,
    },
    gradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
        letterSpacing: 0.5
    }
});
