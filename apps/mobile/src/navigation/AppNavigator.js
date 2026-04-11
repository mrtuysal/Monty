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
import SettingsScreen from '../screens/SettingsScreen';
import LoginScreen from '../screens/LoginScreen';

const Tab = createBottomTabNavigator();

function MainTabs() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: '#0f0f0f',
                    borderTopColor: '#2c2c2e',
                    height: 65,
                    paddingBottom: 10,
                    paddingTop: 5,
                },
                tabBarActiveTintColor: Colors.primary,
                tabBarInactiveTintColor: Colors.textSecondary,
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;
                    if (route.name === 'Ana Sayfa') iconName = focused ? 'home' : 'home-outline';
                    else if (route.name === 'Ödemeler') iconName = focused ? 'card' : 'card-outline';
                    else if (route.name === 'Hesaplar') iconName = focused ? 'wallet' : 'wallet-outline';
                    else if (route.name === 'Ayarlar') iconName = focused ? 'settings' : 'settings-outline';
                    return <Ionicons name={iconName} size={22} color={color} />;
                },
                tabBarLabelStyle: { fontSize: 11 },
            })}
        >
            <Tab.Screen name="Ana Sayfa" component={DashboardScreen} />
            <Tab.Screen name="Ödemeler" component={PaymentsScreen} />
            <Tab.Screen name="Hesaplar" component={AccountsScreen} />
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
