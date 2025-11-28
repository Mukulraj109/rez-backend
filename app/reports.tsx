import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';

export default function ReportsScreen() {
  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>Reports</ThemedText>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Coming Soon Section */}
        <View style={styles.comingSoonContainer}>
          <Ionicons name="bar-chart" size={64} color={Colors.light.textSecondary} />
          <ThemedText style={styles.comingSoonTitle}>Reports Coming Soon</ThemedText>
          <ThemedText style={styles.comingSoonSubtitle}>
            We're working on comprehensive reporting features including:
          </ThemedText>
          
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.light.primary} />
              <ThemedText style={styles.featureText}>Sales Analytics</ThemedText>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.light.primary} />
              <ThemedText style={styles.featureText}>Product Performance</ThemedText>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.light.primary} />
              <ThemedText style={styles.featureText}>Customer Insights</ThemedText>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.light.primary} />
              <ThemedText style={styles.featureText}>Cashback Reports</ThemedText>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.light.primary} />
              <ThemedText style={styles.featureText}>Financial Summaries</ThemedText>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.dashboardButton}
            onPress={() => router.push('/(dashboard)')}
          >
            <ThemedText style={styles.dashboardButtonText}>Back to Dashboard</ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  backButton: {
    padding: 4,
  },
  title: {
    color: Colors.light.text,
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  comingSoonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    minHeight: 400,
  },
  comingSoonTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.light.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  comingSoonSubtitle: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  featuresList: {
    alignSelf: 'stretch',
    maxWidth: 300,
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingLeft: 16,
  },
  featureText: {
    marginLeft: 12,
    fontSize: 16,
    color: Colors.light.text,
  },
  dashboardButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  dashboardButtonText: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: '600',
  },
});