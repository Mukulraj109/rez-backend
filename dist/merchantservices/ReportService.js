"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportService = void 0;
const ExportService_1 = require("./ExportService");
class ReportService {
    // Initialize the automated reporting system
    static initialize() {
        // Check for scheduled reports every hour
        this.reportInterval = setInterval(() => {
            this.processScheduledReports();
        }, 60 * 60 * 1000); // 1 hour
        console.log('📊 Automated reporting service initialized');
    }
    // Create a new report schedule
    static createSchedule(scheduleData) {
        const id = `schedule_${this.scheduleCounter++}`;
        const now = new Date();
        const schedule = {
            id,
            ...scheduleData,
            nextScheduled: this.calculateNextScheduledDate(scheduleData.frequency),
            createdAt: now,
            updatedAt: now
        };
        this.schedules.set(id, schedule);
        console.log(`📅 Created report schedule: ${schedule.name} for merchant ${schedule.merchantId}`);
        return schedule;
    }
    // Update an existing schedule
    static updateSchedule(scheduleId, updates) {
        const schedule = this.schedules.get(scheduleId);
        if (!schedule)
            return null;
        const updatedSchedule = {
            ...schedule,
            ...updates,
            updatedAt: new Date()
        };
        // Recalculate next scheduled date if frequency changed
        if (updates.frequency) {
            updatedSchedule.nextScheduled = this.calculateNextScheduledDate(updates.frequency);
        }
        this.schedules.set(scheduleId, updatedSchedule);
        return updatedSchedule;
    }
    // Delete a schedule
    static deleteSchedule(scheduleId) {
        return this.schedules.delete(scheduleId);
    }
    // Get schedules for a merchant
    static getSchedulesByMerchant(merchantId) {
        return Array.from(this.schedules.values())
            .filter(schedule => schedule.merchantId === merchantId)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    // Get a specific schedule
    static getSchedule(scheduleId) {
        return this.schedules.get(scheduleId) || null;
    }
    // Calculate next scheduled date based on frequency
    static calculateNextScheduledDate(frequency) {
        const now = new Date();
        const next = new Date(now);
        switch (frequency) {
            case 'daily':
                next.setDate(now.getDate() + 1);
                next.setHours(9, 0, 0, 0); // 9 AM
                break;
            case 'weekly':
                next.setDate(now.getDate() + (7 - now.getDay() + 1) % 7 || 7); // Next Monday
                next.setHours(9, 0, 0, 0);
                break;
            case 'monthly':
                next.setMonth(now.getMonth() + 1, 1); // First day of next month
                next.setHours(9, 0, 0, 0);
                break;
            case 'quarterly':
                const currentQuarter = Math.floor(now.getMonth() / 3);
                const nextQuarter = (currentQuarter + 1) % 4;
                const nextYear = nextQuarter === 0 ? now.getFullYear() + 1 : now.getFullYear();
                next.setFullYear(nextYear, nextQuarter * 3, 1);
                next.setHours(9, 0, 0, 0);
                break;
        }
        return next;
    }
    // Process all scheduled reports that are due
    static async processScheduledReports() {
        const now = new Date();
        const dueSchedules = Array.from(this.schedules.values())
            .filter(schedule => schedule.isActive && schedule.nextScheduled <= now);
        console.log(`📊 Processing ${dueSchedules.length} scheduled reports`);
        for (const schedule of dueSchedules) {
            try {
                await this.generateScheduledReport(schedule);
                // Update next scheduled date
                schedule.nextScheduled = this.calculateNextScheduledDate(schedule.frequency);
                schedule.lastGenerated = now;
                schedule.updatedAt = now;
                this.schedules.set(schedule.id, schedule);
            }
            catch (error) {
                console.error(`❌ Failed to generate scheduled report ${schedule.id}:`, error);
                // Log the failure in history
                this.addToHistory({
                    scheduleId: schedule.id,
                    merchantId: schedule.merchantId,
                    reportType: schedule.frequency,
                    format: schedule.format,
                    generatedAt: now,
                    fileSize: 0,
                    emailSent: false,
                    recipients: schedule.recipients,
                    status: 'failed',
                    errorMessage: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }
    }
    // Generate a report for a specific schedule
    static async generateScheduledReport(schedule) {
        console.log(`📊 Generating ${schedule.frequency} report for merchant ${schedule.merchantId}`);
        // Determine date range based on frequency
        const dateRange = this.getDateRangeForFrequency(schedule.frequency);
        // Generate the report
        const exportResult = await ExportService_1.ExportService.exportDashboardData(schedule.merchantId, {
            format: schedule.format,
            sections: schedule.sections,
            dateRange
        });
        // Log to history
        const historyEntry = this.addToHistory({
            scheduleId: schedule.id,
            merchantId: schedule.merchantId,
            reportType: schedule.frequency,
            format: schedule.format,
            generatedAt: new Date(),
            fileSize: exportResult.data.length,
            emailSent: false,
            recipients: schedule.recipients,
            status: 'generated'
        });
        // In a real application, you would:
        // 1. Save the file to storage (S3, local filesystem, etc.)
        // 2. Send email with attachment to recipients
        // 3. Update history with email status
        console.log(`✅ Generated report ${historyEntry.id} for schedule ${schedule.id}`);
        // Simulate email sending
        await this.simulateEmailSending(historyEntry, exportResult);
        return historyEntry;
    }
    // Get date range for a frequency
    static getDateRangeForFrequency(frequency) {
        const now = new Date();
        const start = new Date();
        switch (frequency) {
            case 'daily':
                start.setDate(now.getDate() - 1);
                start.setHours(0, 0, 0, 0);
                break;
            case 'weekly':
                start.setDate(now.getDate() - 7);
                start.setHours(0, 0, 0, 0);
                break;
            case 'monthly':
                start.setMonth(now.getMonth() - 1, 1);
                start.setHours(0, 0, 0, 0);
                break;
            case 'quarterly':
                start.setMonth(now.getMonth() - 3, 1);
                start.setHours(0, 0, 0, 0);
                break;
        }
        return { start, end: now };
    }
    // Simulate email sending (in real app, use nodemailer or similar)
    static async simulateEmailSending(historyEntry, exportResult) {
        try {
            // Simulate email delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            // Update history as sent
            historyEntry.status = 'sent';
            historyEntry.emailSent = true;
            this.history.set(historyEntry.id, historyEntry);
            console.log(`📧 Simulated email sent for report ${historyEntry.id} to ${historyEntry.recipients.join(', ')}`);
        }
        catch (error) {
            historyEntry.status = 'failed';
            historyEntry.errorMessage = 'Failed to send email';
            this.history.set(historyEntry.id, historyEntry);
            console.error(`❌ Failed to send email for report ${historyEntry.id}:`, error);
        }
    }
    // Add entry to report history
    static addToHistory(historyData) {
        const id = `history_${this.historyCounter++}`;
        const historyEntry = {
            id,
            ...historyData
        };
        this.history.set(id, historyEntry);
        return historyEntry;
    }
    // Get report history for a merchant
    static getHistoryByMerchant(merchantId, limit = 50) {
        return Array.from(this.history.values())
            .filter(entry => entry.merchantId === merchantId)
            .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime())
            .slice(0, limit);
    }
    // Get report history for a schedule
    static getHistoryBySchedule(scheduleId, limit = 20) {
        return Array.from(this.history.values())
            .filter(entry => entry.scheduleId === scheduleId)
            .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime())
            .slice(0, limit);
    }
    // Generate an ad-hoc report
    static async generateAdHocReport(merchantId, reportConfig) {
        console.log(`📊 Generating ad-hoc report "${reportConfig.name}" for merchant ${merchantId}`);
        try {
            const exportResult = await ExportService_1.ExportService.exportDashboardData(merchantId, {
                format: reportConfig.format,
                sections: reportConfig.sections,
                dateRange: reportConfig.dateRange
            });
            const historyEntry = this.addToHistory({
                scheduleId: 'ad-hoc',
                merchantId,
                reportType: 'ad-hoc',
                format: reportConfig.format,
                generatedAt: new Date(),
                fileSize: exportResult.data.length,
                emailSent: false,
                recipients: reportConfig.recipients || [],
                status: 'generated'
            });
            // Send email if recipients provided
            if (reportConfig.recipients && reportConfig.recipients.length > 0) {
                await this.simulateEmailSending(historyEntry, exportResult);
            }
            console.log(`✅ Generated ad-hoc report ${historyEntry.id}`);
            return historyEntry;
        }
        catch (error) {
            const historyEntry = this.addToHistory({
                scheduleId: 'ad-hoc',
                merchantId,
                reportType: 'ad-hoc',
                format: reportConfig.format,
                generatedAt: new Date(),
                fileSize: 0,
                emailSent: false,
                recipients: reportConfig.recipients || [],
                status: 'failed',
                errorMessage: error instanceof Error ? error.message : 'Unknown error'
            });
            console.error(`❌ Failed to generate ad-hoc report:`, error);
            throw error;
        }
    }
    // Get report statistics
    static getReportStatistics(merchantId) {
        const schedules = this.getSchedulesByMerchant(merchantId);
        const history = this.getHistoryByMerchant(merchantId);
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const reportsThisMonth = history.filter(entry => entry.generatedAt >= startOfMonth).length;
        const successfulReports = history.filter(entry => entry.status === 'sent' || entry.status === 'generated').length;
        const successRate = history.length > 0 ? (successfulReports / history.length) * 100 : 0;
        return {
            totalSchedules: schedules.length,
            activeSchedules: schedules.filter(s => s.isActive).length,
            totalReportsGenerated: history.length,
            reportsThisMonth,
            successRate,
            lastReportGenerated: history.length > 0 ? history[0].generatedAt : undefined
        };
    }
    // Create sample schedules for testing
    static createSampleSchedules(merchantId) {
        const sampleSchedules = [
            {
                merchantId,
                name: 'Daily Sales Report',
                description: 'Daily summary of sales and orders',
                frequency: 'daily',
                format: 'csv',
                sections: ['dashboard', 'orders'],
                recipients: ['manager@example.com', 'owner@example.com'],
                isActive: true
            },
            {
                merchantId,
                name: 'Weekly Performance Report',
                description: 'Weekly business performance and analytics',
                frequency: 'weekly',
                format: 'excel',
                sections: ['dashboard', 'orders', 'products', 'analytics'],
                recipients: ['owner@example.com'],
                isActive: true
            },
            {
                merchantId,
                name: 'Monthly Cashback Report',
                description: 'Monthly cashback requests and approvals',
                frequency: 'monthly',
                format: 'csv',
                sections: ['cashback', 'analytics'],
                recipients: ['finance@example.com', 'owner@example.com'],
                isActive: true
            }
        ];
        sampleSchedules.forEach(scheduleData => {
            this.createSchedule(scheduleData);
        });
        console.log(`📅 Created ${sampleSchedules.length} sample report schedules for merchant ${merchantId}`);
    }
    // Cleanup method
    static cleanup() {
        if (this.reportInterval) {
            clearInterval(this.reportInterval);
            this.reportInterval = null;
        }
        console.log('📊 Automated reporting service stopped');
    }
    // Manual trigger for testing
    static async triggerScheduledReport(scheduleId) {
        const schedule = this.schedules.get(scheduleId);
        if (!schedule) {
            throw new Error('Schedule not found');
        }
        return await this.generateScheduledReport(schedule);
    }
    // Get upcoming scheduled reports
    static getUpcomingReports(merchantId, days = 7) {
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(now.getDate() + days);
        return Array.from(this.schedules.values())
            .filter(schedule => schedule.merchantId === merchantId &&
            schedule.isActive &&
            schedule.nextScheduled >= now &&
            schedule.nextScheduled <= futureDate)
            .map(schedule => ({
            schedule,
            daysUntilDue: Math.ceil((schedule.nextScheduled.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
        }))
            .sort((a, b) => a.schedule.nextScheduled.getTime() - b.schedule.nextScheduled.getTime());
    }
}
exports.ReportService = ReportService;
ReportService.schedules = new Map();
ReportService.history = new Map();
ReportService.scheduleCounter = 1;
ReportService.historyCounter = 1;
ReportService.reportInterval = null;
