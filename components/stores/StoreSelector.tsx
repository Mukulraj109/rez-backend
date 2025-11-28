import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useStore } from '@/contexts/StoreContext';
import { router } from 'expo-router';
import { Store } from '@/services/api/stores';

interface StoreSelectorProps {
  compact?: boolean;
}

export const StoreSelector: React.FC<StoreSelectorProps> = ({ compact = false }) => {
  const { stores, activeStore, isLoading, setActiveStore } = useStore();
  const [isModalVisible, setIsModalVisible] = useState(false);

  const handleSelectStore = async (store: Store) => {
    try {
      await setActiveStore(store);
      setIsModalVisible(false);
    } catch (error) {
      console.error('Failed to switch store:', error);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#3B82F6" />
      </View>
    );
  }

  if (!activeStore) {
    return (
      <TouchableOpacity
        style={[styles.selector, compact && styles.compact]}
        onPress={() => router.push('/stores/add')}
        activeOpacity={0.8}
      >
        <Ionicons name="add-circle-outline" size={22} color="#FFFFFF" />
        <Text style={styles.addStoreText}>Add Store</Text>
      </TouchableOpacity>
    );
  }

  return (
    <>
      <View style={styles.selectorContainer}>
        <TouchableOpacity
          style={[styles.selector, compact && styles.compact]}
          onPress={() => setIsModalVisible(true)}
          activeOpacity={0.8}
        >
          {activeStore.logo ? (
            <Image source={{ uri: activeStore.logo }} style={styles.logo} />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Ionicons name="storefront" size={16} color="#FFFFFF" />
            </View>
          )}
          <View style={styles.storeInfo}>
            <Text style={styles.storeName} numberOfLines={1}>
              {activeStore.name}
            </Text>
            {!compact && (
              <Text style={styles.storeLocation} numberOfLines={1}>
                {activeStore.location.city}
              </Text>
            )}
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{stores.length}</Text>
          </View>
          <Ionicons name="chevron-down" size={16} color="rgba(255, 255, 255, 0.9)" />
        </TouchableOpacity>
        {/* View Store Details Icon Button */}
        <TouchableOpacity
          style={styles.viewDetailsButton}
          onPress={() => router.push(`/stores/${activeStore._id}/details`)}
          activeOpacity={0.8}
        >
          <Ionicons name="information-circle-outline" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Store</Text>
              <TouchableOpacity
                onPress={() => setIsModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={stores}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => {
                const isActive = activeStore?._id === item._id;
                return (
                  <TouchableOpacity
                    style={[styles.storeItem, isActive && styles.activeStoreItem]}
                    onPress={() => handleSelectStore(item)}
                    activeOpacity={0.7}
                  >
                    {item.logo ? (
                      <Image source={{ uri: item.logo }} style={styles.storeLogo} />
                    ) : (
                      <View style={styles.storeLogoPlaceholder}>
                        <Ionicons name="storefront" size={24} color="#6B7280" />
                      </View>
                    )}
                    <View style={styles.storeItemInfo}>
                      <Text style={styles.storeItemName}>{item.name}</Text>
                      <Text style={styles.storeItemLocation}>
                        {item.location.city}, {item.location.state || ''}
                      </Text>
                      {!item.isActive && (
                        <Text style={styles.inactiveBadge}>Inactive</Text>
                      )}
                    </View>
                    {isActive && (
                      <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
                    )}
                  </TouchableOpacity>
                );
              }}
              ListFooterComponent={
                <>
                  <TouchableOpacity
                    style={styles.manageStoresButton}
                    onPress={() => {
                      setIsModalVisible(false);
                      router.push('/stores');
                    }}
                  >
                    <Ionicons name="storefront" size={24} color="#3B82F6" />
                    <Text style={styles.manageStoresButtonText}>Manage All Stores</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.addStoreButton}
                    onPress={() => {
                      setIsModalVisible(false);
                      router.push('/stores/add');
                    }}
                  >
                    <Ionicons name="add-circle" size={24} color="#3B82F6" />
                    <Text style={styles.addStoreButtonText}>Add New Store</Text>
                  </TouchableOpacity>
                </>
              }
            />
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    padding: 8,
  },
  selectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 8,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    minWidth: 200,
    maxWidth: 250,
  },
  compact: {
    padding: 6,
    paddingHorizontal: 8,
    minWidth: 120,
    maxWidth: 140,
  },
  viewDetailsButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  logo: {
    width: 28,
    height: 28,
    borderRadius: 6,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  logoPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  storeInfo: {
    flex: 1,
    marginRight: 6,
    minWidth: 0,
  },
  storeName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
  storeLocation: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 1,
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 4,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  addStoreText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
    letterSpacing: 0.2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  storeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  activeStoreItem: {
    backgroundColor: '#EFF6FF',
  },
  storeLogo: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
  },
  storeLogoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  storeItemInfo: {
    flex: 1,
  },
  storeItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  storeItemLocation: {
    fontSize: 14,
    color: '#6B7280',
  },
  inactiveBadge: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  manageStoresButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  manageStoresButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
    marginLeft: 8,
  },
  addStoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  addStoreButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
    marginLeft: 8,
  },
});

