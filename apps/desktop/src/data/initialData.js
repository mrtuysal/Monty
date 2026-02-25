export const INITIAL_ACCOUNTS = [
    { id: '1', institution: 'Nakit', name: 'Nakit Kasa', accountType: 'VADESIZ', type: 'CASH', balance: 4500, available: 4500, currency: 'TRY' },
    { id: '2', institution: 'Garanti BBVA', name: 'Vadesiz TL', accountType: 'VADESIZ', type: 'BANK', balance: 120000, available: 115000, currency: 'TRY' },
    { id: '3', institution: 'Garanti BBVA', name: 'Birikim Hesabı', accountType: 'VADELI', type: 'BANK', balance: 50000, available: 50000, currency: 'TRY' },
    { id: '4', institution: 'Enpara.com', name: 'Dolar Hesabı', accountType: 'VADESIZ', type: 'BANK', balance: 1500, available: 1500, currency: 'USD' },
    { id: '5', institution: 'Enpara.com', name: 'Vadesiz TL', accountType: 'VADESIZ', type: 'BANK', balance: 5000, available: 4800, currency: 'TRY' },
];

export const INITIAL_PAYMENTS = [
    // Feb 2026
    {
        id: '1',
        type: 'BILL',
        description: 'Şubat Dönem Borcu',
        institution: 'Turkcell',
        statementDate: '2026-02-05',
        dueDate: '2026-02-17',
        amount: 450,
        minPayment: 0,
        paymentAmount: 450,
        balance: 0,
        status: 'PENDING'
    },
    {
        id: '2',
        type: 'CREDIT_CARD',
        description: 'Bonus Kart Ekstresi',
        institution: 'Garanti BBVA',
        statementDate: '2026-02-10',
        dueDate: '2026-02-20',
        amount: 25000,
        minPayment: 5000,
        paymentAmount: 5000,
        balance: 20000,
        status: 'PENDING'
    },
    {
        id: '3',
        type: 'OTHER',
        description: 'Standart Paket',
        institution: 'Netflix',
        statementDate: '2026-02-01',
        dueDate: '2026-02-15',
        amount: 220,
        minPayment: 0,
        paymentAmount: 220,
        balance: 0,
        status: 'PAID'
    },
    // Jan 2026
    {
        id: '4',
        type: 'OTHER',
        description: 'Ocak Ayı Kirası',
        institution: 'Ev Sahibi',
        statementDate: '2026-01-01',
        dueDate: '2026-01-05',
        amount: 15000,
        minPayment: 0,
        paymentAmount: 15000,
        balance: 0,
        status: 'PAID'
    }
];

export const ACCOUNT_TYPE_LABELS = {
    'VADESIZ': 'Vadesiz Hesap',
    'VADELI': 'Vadeli Hesap',
    'YATIRIM': 'Yatırım Hesabı'
};
