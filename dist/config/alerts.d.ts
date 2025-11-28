export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export interface AlertConfig {
    name: string;
    condition: () => boolean | Promise<boolean>;
    message: string;
    severity: AlertSeverity;
    cooldown?: number;
}
export declare function checkAlerts(): Promise<void>;
export declare function addAlert(alert: AlertConfig): void;
export declare function removeAlert(name: string): void;
export declare function getAlerts(): AlertConfig[];
export declare function startAlertMonitoring(): void;
export declare function stopAlertMonitoring(): void;
