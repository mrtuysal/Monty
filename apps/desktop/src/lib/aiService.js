/**
 * AI Service — Gemini Vision for document scanning
 * 
 * Reads invoices, credit card statements, bills from images/PDFs
 * and extracts structured payment data.
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const EXTRACTION_PROMPT = `Sen bir Türk fatura ve banka ekstresi uzmanısın. Verilen belge görselini analiz et ve ödeme bilgilerini çıkar.

Belge bir kredi kartı ekstresi, fatura (elektrik, su, doğalgaz, internet, telefon), kredi ödeme planı veya başka bir ödeme belgesi olabilir.

Aşağıdaki bilgileri JSON formatında döndür. Bulamadığın alanları null olarak bırak.
Birden fazla ödeme satırı varsa (örneğin birden fazla fatura içeren bir döküman), her birini ayrı obje olarak dizi içinde döndür.

JSON Formatı (dizi olarak döndür):
[
  {
    "institution": "Kurum veya banka adı (örn: Akbank, Türk Telekom, TEDAŞ)",
    "title": "Ödeme başlığı (örn: Akbank Kredi Kartı, Vodafone Fatura)",
    "description": "Kısa açıklama",
    "type": "CREDIT_CARD veya BILL veya LOAN veya OTHER",
    "amount": 0.00,
    "minPayment": null,
    "paymentAmount": null,
    "balance": null,
    "dueDate": "YYYY-MM-DD",
    "statementDate": "YYYY-MM-DD veya null",
    "currency": "TRY veya USD veya EUR"
  }
]

Kurallar:
- Tutarları sayı olarak döndür (string değil), virgüllü Türk formatını düzgün parse et
- Tarihleri YYYY-MM-DD formatında döndür
- type alanını belge türüne göre belirle
- Kredi kartlarında: amount = toplam borç, minPayment = minimum ödeme, statementDate = hesap kesim
- Faturalarda: amount = toplam tutar, dueDate = son ödeme tarihi
- currency default olarak TRY
- Sadece JSON döndür, başka metin ekleme
- Eğer belgede ödeme bilgisi bulamazsan boş dizi döndür: []`;

/**
 * Convert a file to base64
 */
const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            // Remove the data:...;base64, prefix
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
    });
};

/**
 * Get MIME type for Gemini API
 */
const getGeminiMimeType = (file) => {
    const type = file.type;
    if (type === 'application/pdf') return 'application/pdf';
    if (type === 'image/jpeg' || type === 'image/jpg') return 'image/jpeg';
    if (type === 'image/png') return 'image/png';
    if (type === 'image/webp') return 'image/webp';
    return type;
};

/**
 * Send an image/PDF to Gemini Vision and extract payment data
 * 
 * @param {File} file - The uploaded file (JPEG, PNG, PDF)
 * @returns {{ success: boolean, payments?: Array, error?: string }}
 */
export const extractPaymentsFromFile = async (file) => {
    if (!GEMINI_API_KEY) {
        return {
            success: false,
            error: 'Gemini API anahtarı bulunamadı. .env dosyasına VITE_GEMINI_API_KEY ekleyin.'
        };
    }

    try {
        const base64Data = await fileToBase64(file);
        const mimeType = getGeminiMimeType(file);

        const requestBody = {
            contents: [{
                parts: [
                    { text: EXTRACTION_PROMPT },
                    {
                        inline_data: {
                            mime_type: mimeType,
                            data: base64Data
                        }
                    }
                ]
            }],
            generationConfig: {
                temperature: 0.1,
                topP: 0.8,
                maxOutputTokens: 4096,
                responseMimeType: 'application/json'
            }
        };

        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `API hatası: ${response.status}`);
        }

        const data = await response.json();

        // Extract text from response
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
            throw new Error('API yanıtında metin bulunamadı.');
        }

        // Parse JSON from response
        let payments;
        try {
            // Clean potential markdown code blocks
            const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            payments = JSON.parse(cleaned);
        } catch (parseErr) {
            throw new Error('API yanıtı geçerli JSON değil: ' + text.substring(0, 200));
        }

        // Ensure array
        if (!Array.isArray(payments)) {
            payments = [payments];
        }

        // Validate and clean each payment
        payments = payments
            .filter(p => p && (p.institution || p.title || p.amount))
            .map(p => ({
                institution: p.institution || '',
                title: p.title || p.institution || '',
                description: p.description || '',
                type: ['CREDIT_CARD', 'BILL', 'LOAN', 'OTHER'].includes(p.type) ? p.type : 'OTHER',
                amount: typeof p.amount === 'number' ? p.amount : parseFloat(p.amount) || 0,
                minPayment: p.minPayment != null ? (typeof p.minPayment === 'number' ? p.minPayment : parseFloat(p.minPayment)) : null,
                paymentAmount: p.paymentAmount != null ? (typeof p.paymentAmount === 'number' ? p.paymentAmount : parseFloat(p.paymentAmount)) : null,
                balance: p.balance != null ? (typeof p.balance === 'number' ? p.balance : parseFloat(p.balance)) : null,
                dueDate: p.dueDate || null,
                statementDate: p.statementDate || null,
                currency: p.currency || 'TRY',
                status: 'PENDING',
                isRecurring: true,
                recurringFrequency: 'MONTHLY',
                autoPayment: false
            }));

        return { success: true, payments };

    } catch (err) {
        console.error('AI extraction failed:', err);
        return { success: false, error: err.message };
    }
};

/**
 * Check if AI service is configured
 */
export const isAIConfigured = () => {
    return !!GEMINI_API_KEY;
};
