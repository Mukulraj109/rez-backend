/**
 * API Test Runner Component
 * 
 * A simple UI component to run integration tests for the merchant app.
 * Add this to your app during development to verify all services work.
 * 
 * Usage:
 * import { ApiTestRunner } from './tests/integration/TestRunner';
 * 
 * // In your component
 * <ApiTestRunner />
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { runAllTests, quickTest, tests } from './api-tests';

interface TestResult {
    name: string;
    passed: boolean;
    error?: string;
    duration?: number;
}

export const ApiTestRunner: React.FC = () => {
    const [running, setRunning] = useState(false);
    const [results, setResults] = useState<TestResult[]>([]);
    const [summary, setSummary] = useState<{ total: number; passed: number; failed: number } | null>(null);

    const handleRunAllTests = async () => {
        setRunning(true);
        setResults([]);
        setSummary(null);

        try {
            const testResults = await runAllTests();
            setResults(testResults.results);
            setSummary({
                total: testResults.total,
                passed: testResults.passed,
                failed: testResults.failed
            });
        } catch (error) {
            console.error('Test runner error:', error);
        } finally {
            setRunning(false);
        }
    };

    const handleQuickTest = async () => {
        setRunning(true);
        setResults([]);
        setSummary(null);

        try {
            await quickTest();
            alert('Quick test completed! Check console for details.');
        } catch (error: any) {
            alert(`Quick test failed: ${error.message}`);
        } finally {
            setRunning(false);
        }
    };

    const handleRunIndividualTest = async (testName: string, testFn: () => Promise<void>) => {
        setRunning(true);

        try {
            await testFn();
            alert(`✅ ${testName} passed!`);
        } catch (error: any) {
            alert(`❌ ${testName} failed: ${error.message}`);
        } finally {
            setRunning(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>🧪 API Integration Tests</Text>
                <Text style={styles.subtitle}>Test all new services and endpoints</Text>
            </View>

            {/* Main Test Buttons */}
            <View style={styles.section}>
                <TouchableOpacity
                    style={[styles.button, styles.primaryButton]}
                    onPress={handleRunAllTests}
                    disabled={running}
                >
                    {running ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Run All Tests</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.secondaryButton]}
                    onPress={handleQuickTest}
                    disabled={running}
                >
                    <Text style={styles.buttonTextSecondary}>Quick Test</Text>
                </TouchableOpacity>
            </View>

            {/* Individual Test Sections */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Sync Service Tests</Text>
                <TouchableOpacity
                    style={styles.testButton}
                    onPress={() => handleRunIndividualTest('Get Sync Status', tests.sync.getStatus)}
                    disabled={running}
                >
                    <Text style={styles.testButtonText}>Get Sync Status</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.testButton}
                    onPress={() => handleRunIndividualTest('Get Sync History', tests.sync.getHistory)}
                    disabled={running}
                >
                    <Text style={styles.testButtonText}>Get Sync History</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.testButton}
                    onPress={() => handleRunIndividualTest('Trigger Sync', tests.sync.trigger)}
                    disabled={running}
                >
                    <Text style={styles.testButtonText}>Trigger Sync</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Profile Service Tests</Text>
                <TouchableOpacity
                    style={styles.testButton}
                    onPress={() => handleRunIndividualTest('Get Customer View', tests.profile.getCustomerView)}
                    disabled={running}
                >
                    <Text style={styles.testButtonText}>Get Customer View</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.testButton}
                    onPress={() => handleRunIndividualTest('Get Visibility', tests.profile.getVisibility)}
                    disabled={running}
                >
                    <Text style={styles.testButtonText}>Get Visibility Settings</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Bulk Operations Tests</Text>
                <TouchableOpacity
                    style={styles.testButton}
                    onPress={() => handleRunIndividualTest('Download Template', tests.bulk.downloadTemplate)}
                    disabled={running}
                >
                    <Text style={styles.testButtonText}>Download Template</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.testButton}
                    onPress={() => handleRunIndividualTest('Export Products', tests.bulk.exportProducts)}
                    disabled={running}
                >
                    <Text style={styles.testButtonText}>Export Products</Text>
                </TouchableOpacity>
            </View>

            {/* Results Summary */}
            {summary && (
                <View style={styles.summary}>
                    <Text style={styles.summaryTitle}>📊 Test Results</Text>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Total:</Text>
                        <Text style={styles.summaryValue}>{summary.total}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>✅ Passed:</Text>
                        <Text style={[styles.summaryValue, styles.passedText]}>{summary.passed}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>❌ Failed:</Text>
                        <Text style={[styles.summaryValue, styles.failedText]}>{summary.failed}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Success Rate:</Text>
                        <Text style={styles.summaryValue}>
                            {((summary.passed / summary.total) * 100).toFixed(1)}%
                        </Text>
                    </View>
                </View>
            )}

            {/* Individual Results */}
            {results.length > 0 && (
                <View style={styles.results}>
                    <Text style={styles.resultsTitle}>Test Details</Text>
                    {results.map((result, index) => (
                        <View
                            key={index}
                            style={[
                                styles.resultItem,
                                result.passed ? styles.resultPassed : styles.resultFailed
                            ]}
                        >
                            <Text style={styles.resultName}>
                                {result.passed ? '✅' : '❌'} {result.name}
                            </Text>
                            <Text style={styles.resultDuration}>{result.duration}ms</Text>
                            {result.error && (
                                <Text style={styles.resultError}>{result.error}</Text>
                            )}
                        </View>
                    ))}
                </View>
            )}

            <View style={styles.footer}>
                <Text style={styles.footerText}>
                    Check console for detailed logs
                </Text>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        backgroundColor: '#fff',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    section: {
        backgroundColor: '#fff',
        padding: 16,
        marginTop: 12,
        borderRadius: 8,
        marginHorizontal: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    button: {
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 12,
    },
    primaryButton: {
        backgroundColor: '#007AFF',
    },
    secondaryButton: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#007AFF',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    buttonTextSecondary: {
        color: '#007AFF',
        fontSize: 16,
        fontWeight: '600',
    },
    testButton: {
        padding: 12,
        backgroundColor: '#f0f0f0',
        borderRadius: 6,
        marginBottom: 8,
    },
    testButtonText: {
        color: '#333',
        fontSize: 14,
    },
    summary: {
        backgroundColor: '#fff',
        padding: 16,
        marginTop: 12,
        borderRadius: 8,
        marginHorizontal: 12,
    },
    summaryTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
        color: '#333',
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    summaryLabel: {
        fontSize: 14,
        color: '#666',
    },
    summaryValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    passedText: {
        color: '#10b981',
    },
    failedText: {
        color: '#ef4444',
    },
    results: {
        backgroundColor: '#fff',
        padding: 16,
        marginTop: 12,
        borderRadius: 8,
        marginHorizontal: 12,
    },
    resultsTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
        color: '#333',
    },
    resultItem: {
        padding: 12,
        borderRadius: 6,
        marginBottom: 8,
    },
    resultPassed: {
        backgroundColor: '#f0fdf4',
        borderLeftWidth: 3,
        borderLeftColor: '#10b981',
    },
    resultFailed: {
        backgroundColor: '#fef2f2',
        borderLeftWidth: 3,
        borderLeftColor: '#ef4444',
    },
    resultName: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
    resultDuration: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    resultError: {
        fontSize: 12,
        color: '#ef4444',
        marginTop: 4,
        fontStyle: 'italic',
    },
    footer: {
        padding: 20,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 12,
        color: '#999',
    },
});

export default ApiTestRunner;
