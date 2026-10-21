import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Theme';
import { useData } from '../context/DataContext';

// Screens
import DashboardScreen from '../screens/DashboardScreen';
import PaymentsScreen from '../screens/PaymentsScreen';
import AccountsScreen from '../screens/AccountsScreen';
import ReceivablesScreen from '../screens/ReceivablesScreen';
import SettingsScreen from '../screens/SettingsScreen';
import LoginScreen from '../screens/LoginScreen';

const Tab = createBottomTabNavigator();

function MainTabs() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: Colors.surfaceLowest || '#0E0E10',
                    borderTopColor: Colors.border || 'rgba(255, 255, 255, 0.08)',
                    borderTopWidth: 1,
                    height: 64,
                    paddingBottom: 8,
                    paddingTop: 6,
                    elevation: 12,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.4,
                    shadowRadius: 16,
                },
                tabBarActiveTintColor: Colors.secondary || '#E8F54A',
                tabBarInactiveTintColor: Colors.textSecondary || '#A1A1AA',
                tabBarIcon: ({ focused, color }) => {
                    let iconName;
                    if (route.name === 'Ana Sayfa') iconName = focused ? 'grid' : 'grid-outline';
                    else if (route.name === 'Ödemeler') iconName = focused ? 'receipt' : 'receipt-outline';
                    else if (route.name === 'Hesaplar') iconName = focused ? 'wallet' : 'wallet-outline';
                    else if (route.name === 'Alacak/Borç') iconName = focused ? 'swap-horizontal' : 'swap-horizontal-outline';
                    else if (route.name === 'Ayarlar') iconName = focused ? 'settings' : 'settings-outline';
                    return (
                        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name={iconName} size={21} color={color} />
                            {focused && (
                                <View
                                    style={{
                                        width: 4,
                                        height: 4,
                                        borderRadius: 2,
                                        backgroundColor: Colors.secondary || '#E8F54A',
                                        marginTop: 2,
                                    }}
                                />
                            )}
                        </View>
                    );
                },
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: '600',
                    letterSpacing: 0.2,
                },
            })}
        >
            <Tab.Screen name="Ana Sayfa" component={DashboardScreen} />
            <Tab.Screen name="Ödemeler" component={PaymentsScreen} />
            <Tab.Screen name="Hesaplar" component={AccountsScreen} />
            <Tab.Screen name="Alacak/Borç" component={ReceivablesScreen} />
            <Tab.Screen name="Ayarlar" component={SettingsScreen} />
        </Tab.Navigator>
    );
}

export default function AppNavigator() {
    const { session, authLoading } = useData();

    if (authLoading) {
        return (
            <View style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <StatusBar style="light" />
            {session ? <MainTabs /> : <LoginScreen />}
        </NavigationContainer>
    );
}
