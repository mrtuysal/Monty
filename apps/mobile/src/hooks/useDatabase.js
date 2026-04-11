import { useState, useEffect } from 'react';
import { DatabaseManager } from '@monty/core';

// Singleton instance (mock key for now)
const db = new DatabaseManager("my-secret-key-123");

export function useDatabase() {
    const [isLoaded, setIsLoaded] = useState(false);
    const [accounts, setAccounts] = useState([]);
    const [payments, setPayments] = useState([]);

    useEffect(() => {
        async function load() {
            if (!db.isLoaded) {
                await db.init();
            }
            setIsLoaded(true);
            fetchData();
        }
        load();
    }, []);

    const fetchData = () => {
        setAccounts([...db.getAccounts()]); // Create new array reference
        setPayments([...db.getPayments()]);
    };

    const addAccount = (account) => {
        db.addAccount(account);
        fetchData();
    };

    const addPayment = (payment) => {
        db.addPayment(payment);
        fetchData();
    };

    return { isLoaded, accounts, addAccount, payments, addPayment };
}
