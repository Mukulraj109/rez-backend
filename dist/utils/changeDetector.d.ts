export interface Change {
    field: string;
    before: any;
    after: any;
    type: 'added' | 'removed' | 'modified';
}
/**
 * Detect changes between two objects
 * @param before - Original object state
 * @param after - New object state
 * @returns Array of changes
 */
export declare function detectChanges(before: any, after: any): Change[];
/**
 * Format changes for human-readable output
 */
export declare function formatChanges(changes: Change[]): string;
/**
 * Get summary of changes
 */
export declare function getChangeSummary(changes: Change[]): {
    added: number;
    removed: number;
    modified: number;
    total: number;
    fields: string[];
};
/**
 * Filter changes by fields
 */
export declare function filterChanges(changes: Change[], fields: string[]): Change[];
/**
 * Check if specific field changed
 */
export declare function hasFieldChanged(changes: Change[], field: string): boolean;
/**
 * Get change for specific field
 */
export declare function getFieldChange(changes: Change[], field: string): Change | undefined;
