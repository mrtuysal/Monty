/**
 * Supabase Storage Backup Service
 * 
 * Handles cloud backup operations:
 * - Upload backup JSON to Supabase Storage
 * - Download/restore from cloud backups
 * - List available backups
 * - Delete old backups
 * 
 * Storage structure: backups/{user_id}/monty_backup_{timestamp}.json
 */

import { supabase } from './supabase';

const BUCKET = 'backups';
const MAX_BACKUPS = 10; // Keep last 10 backups, auto-delete older ones

/**
 * Generate a backup file path for the current user
 */
const getBackupPath = (userId, timestamp = new Date()) => {
    const date = timestamp.toISOString().slice(0, 10); // YYYY-MM-DD
    const time = timestamp.toISOString().slice(11, 19).replace(/:/g, '-'); // HH-MM-SS
    return `${userId}/monty_backup_${date}_${time}.json`;
};

/**
 * Upload a backup to Supabase Storage
 * @param {string} userId - The user's ID
 * @param {Object} backupData - The data to backup (accounts, payments, profile)
 * @returns {{ success: boolean, path?: string, error?: string }}
 */
export const uploadBackup = async (userId, backupData) => {
    try {
        const filePath = getBackupPath(userId);
        const jsonStr = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });

        const { data, error } = await supabase.storage
            .from(BUCKET)
            .upload(filePath, blob, {
                contentType: 'application/json',
                upsert: false // Don't overwrite — each backup is unique
            });

        if (error) throw error;

        // Auto-cleanup: remove old backups if exceeding MAX_BACKUPS
        await cleanupOldBackups(userId);

        return { success: true, path: data.path };
    } catch (err) {
        console.error('Backup upload failed:', err);
        return { success: false, error: err.message };
    }
};

/**
 * List all backups for the current user
 * @param {string} userId 
 * @returns {Array<{ name, created_at, size }>}
 */
export const listBackups = async (userId) => {
    try {
        const { data, error } = await supabase.storage
            .from(BUCKET)
            .list(userId, {
                limit: 50,
                sortBy: { column: 'created_at', order: 'desc' }
            });

        if (error) throw error;

        return (data || [])
            .filter(f => f.name.endsWith('.json'))
            .map(f => ({
                name: f.name,
                fullPath: `${userId}/${f.name}`,
                createdAt: f.created_at,
                size: f.metadata?.size || 0,
                // Extract human-readable date from filename
                displayDate: extractDateFromFilename(f.name)
            }));
    } catch (err) {
        console.error('Failed to list backups:', err);
        return [];
    }
};

/**
 * Download and parse a specific backup
 * @param {string} fullPath - Full path in storage (userId/filename.json)
 * @returns {{ success: boolean, data?: Object, error?: string }}
 */
export const downloadBackup = async (fullPath) => {
    try {
        const { data, error } = await supabase.storage
            .from(BUCKET)
            .download(fullPath);

        if (error) throw error;

        const text = await data.text();
        const parsed = JSON.parse(text);

        return { success: true, data: parsed };
    } catch (err) {
        console.error('Backup download failed:', err);
        return { success: false, error: err.message };
    }
};

/**
 * Delete a specific backup
 * @param {string} fullPath 
 */
export const deleteBackup = async (fullPath) => {
    try {
        const { error } = await supabase.storage
            .from(BUCKET)
            .remove([fullPath]);

        if (error) throw error;
        return { success: true };
    } catch (err) {
        console.error('Backup delete failed:', err);
        return { success: false, error: err.message };
    }
};

/**
 * Auto-cleanup: keep only the last MAX_BACKUPS, delete older ones
 */
const cleanupOldBackups = async (userId) => {
    try {
        const backups = await listBackups(userId);

        if (backups.length > MAX_BACKUPS) {
            const toDelete = backups
                .slice(MAX_BACKUPS) // Already sorted by created_at desc
                .map(b => b.fullPath);

            if (toDelete.length > 0) {
                await supabase.storage.from(BUCKET).remove(toDelete);
            }
        }
    } catch (err) {
        console.error('Backup cleanup failed:', err);
    }
};

/**
 * Extract a human-readable date from the backup filename
 * monty_backup_2026-02-25_11-30-00.json → "25.02.2026 11:30"
 */
const extractDateFromFilename = (filename) => {
    const match = filename.match(/monty_backup_(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})/);
    if (match) {
        const [, y, m, d, h, min] = match;
        return `${d}.${m}.${y} ${h}:${min}`;
    }
    return filename;
};
