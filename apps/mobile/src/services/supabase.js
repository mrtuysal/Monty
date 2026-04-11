import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://qujihhdapedpciebvuax.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1amloaGRhcGVkcGNpZWJ2dWF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0OTAzMzgsImV4cCI6MjA4NzA2NjMzOH0.UTz1wml-gsS0f04IVwnQ8G3q2jYVsHTVJ6TuSW9REqI';

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false, // Important for React Native
    },
});
