"use strict";
// Change Detector Utility
// Detects changes between two objects for audit logging
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectChanges = detectChanges;
exports.formatChanges = formatChanges;
exports.getChangeSummary = getChangeSummary;
exports.filterChanges = filterChanges;
exports.hasFieldChanged = hasFieldChanged;
exports.getFieldChange = getFieldChange;
/**
 * Detect changes between two objects
 * @param before - Original object state
 * @param after - New object state
 * @returns Array of changes
 */
function detectChanges(before, after) {
    const changes = [];
    // If before is null/undefined, everything is new
    if (!before && after) {
        return Object.keys(after).map(key => ({
            field: key,
            before: undefined,
            after: after[key],
            type: 'added'
        }));
    }
    // If after is null/undefined, everything is removed
    if (before && !after) {
        return Object.keys(before).map(key => ({
            field: key,
            before: before[key],
            after: undefined,
            type: 'removed'
        }));
    }
    // Both exist - compare fields
    const allKeys = new Set([
        ...Object.keys(before || {}),
        ...Object.keys(after || {})
    ]);
    for (const key of allKeys) {
        // Skip internal MongoDB fields
        if (key.startsWith('_') || key === '__v' || key === 'createdAt' || key === 'updatedAt') {
            continue;
        }
        const beforeValue = before?.[key];
        const afterValue = after?.[key];
        // Field added
        if (beforeValue === undefined && afterValue !== undefined) {
            changes.push({
                field: key,
                before: undefined,
                after: afterValue,
                type: 'added'
            });
            continue;
        }
        // Field removed
        if (beforeValue !== undefined && afterValue === undefined) {
            changes.push({
                field: key,
                before: beforeValue,
                after: undefined,
                type: 'removed'
            });
            continue;
        }
        // Field modified - deep comparison
        if (!isEqual(beforeValue, afterValue)) {
            changes.push({
                field: key,
                before: beforeValue,
                after: afterValue,
                type: 'modified'
            });
        }
    }
    return changes;
}
/**
 * Deep equality check for values
 */
function isEqual(a, b) {
    // Same reference
    if (a === b)
        return true;
    // Both null/undefined
    if (a == null && b == null)
        return true;
    // One is null/undefined
    if (a == null || b == null)
        return false;
    // Different types
    if (typeof a !== typeof b)
        return false;
    // Primitive types
    if (typeof a !== 'object')
        return a === b;
    // Dates
    if (a instanceof Date && b instanceof Date) {
        return a.getTime() === b.getTime();
    }
    // Arrays
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length)
            return false;
        return a.every((item, index) => isEqual(item, b[index]));
    }
    // Objects
    if (typeof a === 'object' && typeof b === 'object') {
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        if (keysA.length !== keysB.length)
            return false;
        return keysA.every(key => isEqual(a[key], b[key]));
    }
    return false;
}
/**
 * Format changes for human-readable output
 */
function formatChanges(changes) {
    if (changes.length === 0)
        return 'No changes detected';
    return changes.map(change => {
        switch (change.type) {
            case 'added':
                return `Added ${change.field}: ${formatValue(change.after)}`;
            case 'removed':
                return `Removed ${change.field}: ${formatValue(change.before)}`;
            case 'modified':
                return `Changed ${change.field}: ${formatValue(change.before)} → ${formatValue(change.after)}`;
            default:
                return '';
        }
    }).join('\n');
}
/**
 * Format a value for display
 */
function formatValue(value) {
    if (value === undefined)
        return 'undefined';
    if (value === null)
        return 'null';
    if (typeof value === 'string')
        return `"${value}"`;
    if (typeof value === 'object')
        return JSON.stringify(value);
    return String(value);
}
/**
 * Get summary of changes
 */
function getChangeSummary(changes) {
    return {
        added: changes.filter(c => c.type === 'added').length,
        removed: changes.filter(c => c.type === 'removed').length,
        modified: changes.filter(c => c.type === 'modified').length,
        total: changes.length,
        fields: changes.map(c => c.field)
    };
}
/**
 * Filter changes by fields
 */
function filterChanges(changes, fields) {
    return changes.filter(change => fields.includes(change.field));
}
/**
 * Check if specific field changed
 */
function hasFieldChanged(changes, field) {
    return changes.some(change => change.field === field);
}
/**
 * Get change for specific field
 */
function getFieldChange(changes, field) {
    return changes.find(change => change.field === field);
}
