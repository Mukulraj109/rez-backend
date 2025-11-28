import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { apiClient } from '@/services/api';
import { useStore } from '@/contexts/StoreContext';
import { BottomNav, BOTTOM_NAV_HEIGHT_CONSTANT } from '@/components/navigation/BottomNav';

const { width } = Dimensions.get('window');
const imageSize = (width - 48) / 3; // 3 columns with padding

interface UGCContent {
  id: string;
  _id: string;
  userId: string;
  user: {
    _id: string;
    profile: {
      firstName: string;
      lastName: string;
      avatar: string;
    };
  };
  type: 'video' | 'image';
  url: string;
  thumbnail: string;
  caption: string;
  tags: string[];
  likes: number;
  comments: number;
  shares: number;
  views: number;
  isLiked: boolean;
  isBookmarked: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function StoreUGCScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const storeId = params.id as string;
  const { stores } = useStore();
  const store = stores.find(s => s._id === storeId);

  const [ugcContent, setUgcContent] = useState<UGCContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | 'photo' | 'video'>('all');

  useEffect(() => {
    loadUGC();
  }, [storeId, typeFilter]);

  const loadUGC = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get(`/merchant/stores/${storeId}/ugc`, {
        type: typeFilter === 'all' ? undefined : typeFilter,
        limit: 50,
        offset: 0,
      });
      if (response.success && response.data) {
        setUgcContent((response.data as any).content || []);
      } else {
        setError('Failed to load UGC content');
      }
    } catch (err: any) {
      console.error('Error loading UGC:', err);
      setError(err.message || 'Failed to load UGC content');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUGC();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`;
    return `${Math.ceil(diffDays / 365)} years ago`;
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>UGC Content</ThemedText>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
        <BottomNav />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>UGC Content</ThemedText>
        <View style={styles.placeholder} />
      </View>

      {store && (
        <View style={styles.storeInfo}>
          <ThemedText style={styles.storeName}>{store.name}</ThemedText>
          <ThemedText style={styles.storeSubtext}>User-generated content for your store</ThemedText>
        </View>
      )}

      {/* Type Filter */}
      <View style={styles.filtersContainer}>
        {(['all', 'photo', 'video'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.filterButton, typeFilter === t && styles.filterButtonActive]}
            onPress={() => setTypeFilter(t)}
          >
            <Ionicons
              name={t === 'photo' ? 'image' : t === 'video' ? 'videocam' : 'grid'}
              size={18}
              color={typeFilter === t ? '#FFFFFF' : '#6B7280'}
            />
            <ThemedText style={[styles.filterText, typeFilter === t && styles.filterTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <TouchableOpacity onPress={loadUGC} style={styles.retryButton}>
            <ThemedText style={styles.retryText}>Retry</ThemedText>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.contentList}
        contentContainerStyle={styles.contentGrid}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {ugcContent.length === 0 && !loading ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="images-outline" size={64} color="#9CA3AF" />
            <ThemedText style={styles.emptyText}>No UGC content yet</ThemedText>
            <ThemedText style={styles.emptySubtext}>User-generated content will appear here</ThemedText>
          </View>
        ) : (
          <View style={styles.grid}>
            {ugcContent.map((item) => (
              <TouchableOpacity key={item.id || item._id} style={styles.gridItem}>
                <Image
                  source={{ uri: item.thumbnail || item.url }}
                  style={styles.gridImage}
                  resizeMode="cover"
                />
                {item.type === 'video' && (
                  <View style={styles.videoBadge}>
                    <Ionicons name="play" size={16} color="#FFFFFF" />
                  </View>
                )}
                <View style={styles.gridOverlay}>
                  <View style={styles.gridStats}>
                    <View style={styles.statItem}>
                      <Ionicons name="heart" size={12} color="#FFFFFF" />
                      <Text style={styles.statText}>{item.likes}</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Ionicons name="chatbubble" size={12} color="#FFFFFF" />
                      <Text style={styles.statText}>{item.comments}</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Ionicons name="eye" size={12} color="#FFFFFF" />
                      <Text style={styles.statText}>{item.views}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  placeholder: {
    width: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeInfo: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  storeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  storeSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  filtersContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
  },
  filterText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  errorContainer: {
    padding: 16,
    alignItems: 'center',
  },
  errorText: {
    color: '#EF4444',
    marginBottom: 8,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  contentList: {
    flex: 1,
  },
  contentGrid: {
    padding: 16,
    paddingBottom: BOTTOM_NAV_HEIGHT_CONSTANT + 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridItem: {
    width: imageSize,
    height: imageSize,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  videoBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    padding: 4,
  },
  gridOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 8,
  },
  gridStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
});




