import { exec as execCallback } from 'child_process';
import { promisify } from 'util';

const exec = promisify(execCallback);

/**
 * Execute a shell command
 * @param {string} cmd - Command to execute
 * @returns {Promise<string>} - Command output
 */
export async function execCommand(cmd) {
    const { stdout, stderr } = await exec(cmd);
    if (stderr) {
        console.warn(`[EXEC WARNING] ${cmd}:`, stderr);
    }
    return stdout.trim();
}

/**
 * Omit specified fields from a row
 * @param {Array<string>} fields - Fields to omit
 * @returns {Function}
 */
export function omitRow(fields) {
    return (row) => {
        if (!row) return row;
        const result = { ...row };
        fields.forEach((field) => {
            const parts = field.split('.');
            if (parts.length === 1) {
                delete result[field];
            } else {
                // Handle nested fields like 'owner.is_deleted'
                let current = result;
                for (let i = 0; i < parts.length - 1; i++) {
                    if (current[parts[i]]) {
                        current = current[parts[i]];
                    }
                }
                if (current) {
                    delete current[parts[parts.length - 1]];
                }
            }
        });
        return result;
    };
}

/**
 * Omit specified fields from multiple rows
 * @param {Array<string>} fields - Fields to omit
 * @returns {Function}
 */
export function omitRows(fields) {
    return (rows) => {
        if (!Array.isArray(rows)) return rows;
        return rows.map(omitRow(fields));
    };
}

/**
 * Generate a random string
 * @param {number} length - Length of the string
 * @returns {string}
 */
export function randomString(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export default {
    exec: execCommand,
    omitRow,
    omitRows,
    randomString,
};
