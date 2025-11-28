import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getApiUrl } from '@/config/api';

// Conditional import for drag functionality
let DraggableFlatList: any = null;
let RenderItemParams: any = null;

if (Platform.OS !== 'web') {
  try {
    const DragModule = require('react-native-draggable-flatlist');
    DraggableFlatList = DragModule.default;
    RenderItemParams = DragModule.RenderItemParams;
  } catch (e) {
    console.log('Draggable FlatList not available for this platform');
  }
}

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';

// API_BASE_URL is now handled by getApiUrl() from config

interface CategoryOperation {
  type: 'rename_category' | 'merge_categories' | 'move_to_subcategory' | 'delete_category';
  oldCategory?: string;
  newCategory?: string;
  subcategory?: string;
  sourceCategories?: string[];
}

interface CategoryWithStats {
  id: string;
  name: string;
  parentId?: string;
  productCount: number;
  subcategories: CategoryWithStats[];
}

interface BulkOperation {
  id: string;
  type: CategoryOperation['type'];
  description: string;
  categories: string[];
  newName?: string;
  targetCategory?: string;
}

export default function OrganizeCategoriesScreen() {
  const { token } = useAuth();
  const [categories, setCategories] = useState<CategoryWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [operations, setOperations] = useState<BulkOperation[]>([]);
  const [showAddOperation, setShowAddOperation] = useState(false);
  const [dragEnabled, setDragEnabled] = useState(false);

  // Form state for new operations
  const [operationType, setOperationType] = useState<CategoryOperation['type']>('rename_category');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [targetCategory, setTargetCategory] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const response = await fetch(getApiUrl('merchant/categories?includeEmpty=true'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }

      const data = await response.json();
      setCategories(data.data.categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      Alert.alert('Error', 'Failed to load categories. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addOperation = () => {
    if (selectedCategories.length === 0) {
      Alert.alert('Error', 'Please select at least one category.');
      return;
    }

    if ((operationType === 'rename_category' || operationType === 'merge_categories') && !newCategoryName.trim()) {
      Alert.alert('Error', 'Please enter a new category name.');
      return;
    }

    if (operationType === 'move_to_subcategory' && !targetCategory.trim()) {
      Alert.alert('Error', 'Please select a target category.');
      return;
    }

    const newOperation: BulkOperation = {
      id: Date.now().toString(),
      type: operationType,
      categories: [...selectedCategories],
      newName: newCategoryName.trim() || undefined,
      targetCategory: targetCategory.trim() || undefined,
      description: generateOperationDescription(operationType, selectedCategories, newCategoryName, targetCategory),
    };

    setOperations(prev => [...prev, newOperation]);
    
    // Reset form
    setSelectedCategories([]);
    setNewCategoryName('');
    setTargetCategory('');
    setShowAddOperation(false);
  };

  const generateOperationDescription = (
    type: CategoryOperation['type'],
    categories: string[],
    newName?: string,
    target?: string
  ): string => {
    const categoryNames = categories.map(id => {
      const category = findCategoryById(id);
      return category?.name || id;
    }).join(', ');

    switch (type) {
      case 'rename_category':
        return `Rename "${categoryNames}" to "${newName}"`;
      case 'merge_categories':
        return `Merge ${categories.length} categories (${categoryNames}) into "${newName}"`;
      case 'move_to_subcategory':
        return `Move "${categoryNames}" as subcategory of "${target}"`;
      case 'delete_category':
        return `Delete "${categoryNames}" (products will be moved to "Uncategorized")`;
      default:
        return `${type} operation on ${categoryNames}`;
    }
  };

  const findCategoryById = (id: string): CategoryWithStats | null => {
    for (const category of categories) {
      if (category.id === id) return category;
      for (const subcat of category.subcategories) {
        if (subcat.id === id) return subcat;
      }
    }
    return null;
  };

  const removeOperation = (operationId: string) => {
    setOperations(prev => prev.filter(op => op.id !== operationId));
  };

  const executeOperations = async () => {
    if (operations.length === 0) {
      Alert.alert('No Operations', 'Please add some operations first.');
      return;
    }

    Alert.alert(
      'Execute Operations',
      `This will execute ${operations.length} operations and may affect your product categories. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Execute',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);

              // Convert operations to API format
              const apiOperations: CategoryOperation[] = operations.map(op => {
                const baseOp: CategoryOperation = {
                  type: op.type,
                };

                switch (op.type) {
                  case 'rename_category':
                    return {
                      ...baseOp,
                      oldCategory: op.categories[0],
                      newCategory: op.newName,
                    };
                  case 'merge_categories':
                    return {
                      ...baseOp,
                      sourceCategories: op.categories,
                      newCategory: op.newName,
                    };
                  case 'move_to_subcategory':
                    return {
                      ...baseOp,
                      oldCategory: op.categories[0],
                      subcategory: op.targetCategory,
                    };
                  case 'delete_category':
                    return {
                      ...baseOp,
                      oldCategory: op.categories[0],
                    };
                  default:
                    return baseOp;
                }
              });

              const response = await fetch(getApiUrl('merchant/categories/bulk-update'), {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ operations: apiOperations }),
              });

              if (!response.ok) {
                throw new Error('Failed to execute operations');
              }

              const data = await response.json();
              const successCount = data.data.results.filter((r: any) => r.success).length;

              Alert.alert(
                'Operations Complete',
                `Successfully executed ${successCount} out of ${operations.length} operations.`,
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      setOperations([]);
                      fetchCategories();
                    },
                  },
                ]
              );
            } catch (error) {
              console.error('Error executing operations:', error);
              Alert.alert('Error', 'Failed to execute operations. Please try again.');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const renderCategoryItem = ({ item, drag, isActive }: any) => (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        isActive && styles.draggingItem,
        selectedCategories.includes(item.id) && styles.selectedItem,
      ]}
      onPress={() => {
        if (showAddOperation) {
          setSelectedCategories(prev =>
            prev.includes(item.id)
              ? prev.filter(id => id !== item.id)
              : [...prev, item.id]
          );
        }
      }}
      onLongPress={dragEnabled && drag ? drag : undefined}
      disabled={isActive}
    >
      <View style={styles.categoryItemContent}>
        <View style={styles.categoryInfo}>
          <ThemedText style={styles.categoryName}>{item.name}</ThemedText>
          <ThemedText style={styles.productCount}>
            {item.productCount} products
          </ThemedText>
        </View>

        <View style={styles.categoryActions}>
          {showAddOperation && (
            <View style={[
              styles.checkbox,
              selectedCategories.includes(item.id) && styles.checkedBox,
            ]}>
              {selectedCategories.includes(item.id) && (
                <Ionicons name="checkmark" size={16} color={Colors.light.background} />
              )}
            </View>
          )}

          {dragEnabled && Platform.OS !== 'web' && (
            <Ionicons name="reorder-two" size={20} color={Colors.light.textSecondary} />
          )}
        </View>
      </View>

      {item.subcategories.length > 0 && (
        <View style={styles.subcategoriesContainer}>
          {item.subcategories.map((subcat: CategoryWithStats) => (
            <TouchableOpacity
              key={subcat.id}
              style={[
                styles.subcategoryItem,
                selectedCategories.includes(subcat.id) && styles.selectedSubcategory,
              ]}
              onPress={() => {
                if (showAddOperation) {
                  setSelectedCategories(prev =>
                    prev.includes(subcat.id)
                      ? prev.filter(id => id !== subcat.id)
                      : [...prev, subcat.id]
                  );
                }
              }}
            >
              <ThemedText style={styles.subcategoryName}>{subcat.name}</ThemedText>
              <ThemedText style={styles.subcategoryCount}>({subcat.productCount})</ThemedText>
              {showAddOperation && selectedCategories.includes(subcat.id) && (
                <View style={styles.smallCheckbox}>
                  <Ionicons name="checkmark" size={12} color={Colors.light.background} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );

  const renderOperationItem = (operation: BulkOperation, index: number) => (
    <View key={operation.id} style={styles.operationItem}>
      <View style={styles.operationHeader}>
        <View style={styles.operationIndex}>
          <ThemedText style={styles.operationNumber}>{index + 1}</ThemedText>
        </View>
        <ThemedText style={styles.operationDescription}>{operation.description}</ThemedText>
        <TouchableOpacity
          style={styles.removeOperationButton}
          onPress={() => removeOperation(operation.id)}
        >
          <Ionicons name="close" size={20} color={Colors.light.destructive} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderAddOperationModal = () => (
    <Modal
      visible={showAddOperation}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowAddOperation(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>Add Operation</ThemedText>
            <TouchableOpacity onPress={() => setShowAddOperation(false)}>
              <Ionicons name="close" size={24} color={Colors.light.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Operation Type */}
            <View style={styles.formGroup}>
              <ThemedText style={styles.label}>Operation Type</ThemedText>
              <View style={styles.segmentedControl}>
                {[
                  { value: 'rename_category', label: 'Rename' },
                  { value: 'merge_categories', label: 'Merge' },
                  { value: 'move_to_subcategory', label: 'Move' },
                  { value: 'delete_category', label: 'Delete' },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.segmentButton,
                      operationType === option.value && styles.segmentButtonActive,
                    ]}
                    onPress={() => setOperationType(option.value as CategoryOperation['type'])}
                  >
                    <ThemedText
                      style={[
                        styles.segmentText,
                        operationType === option.value && styles.segmentTextActive,
                      ]}
                    >
                      {option.label}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Category Selection */}
            <View style={styles.formGroup}>
              <ThemedText style={styles.label}>
                Select Categories {operationType === 'merge_categories' ? '(multiple)' : '(single)'}
              </ThemedText>
              <ThemedText style={styles.selectedCount}>
                {selectedCategories.length} selected
              </ThemedText>
            </View>

            {/* New Category Name */}
            {(operationType === 'rename_category' || operationType === 'merge_categories') && (
              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>New Category Name</ThemedText>
                <TextInput
                  style={styles.input}
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                  placeholder="Enter new category name"
                  placeholderTextColor={Colors.light.textSecondary}
                />
              </View>
            )}

            {/* Target Category */}
            {operationType === 'move_to_subcategory' && (
              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Target Category</ThemedText>
                <TextInput
                  style={styles.input}
                  value={targetCategory}
                  onChangeText={setTargetCategory}
                  placeholder="Enter target category name"
                  placeholderTextColor={Colors.light.textSecondary}
                />
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowAddOperation(false)}
            >
              <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addOperationButton}
              onPress={addOperation}
            >
              <ThemedText style={styles.addOperationButtonText}>Add Operation</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <ThemedText type="title" style={styles.title}>Organize Categories</ThemedText>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <ThemedText style={styles.loadingText}>Loading categories...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>Organize Categories</ThemedText>
        {Platform.OS !== 'web' && DraggableFlatList && (
          <TouchableOpacity
            style={styles.dragToggle}
            onPress={() => setDragEnabled(!dragEnabled)}
          >
            <Ionicons 
              name={dragEnabled ? "lock-open" : "lock-closed"} 
              size={20} 
              color={dragEnabled ? Colors.light.primary : Colors.light.textSecondary} 
            />
          </TouchableOpacity>
        )}
        {Platform.OS === 'web' && <View style={styles.placeholder} />}
      </View>

      <ScrollView style={styles.content}>
        {/* Operations Queue */}
        {operations.length > 0 && (
          <View style={styles.operationsContainer}>
            <View style={styles.operationsHeader}>
              <ThemedText style={styles.sectionTitle}>Queued Operations</ThemedText>
              <TouchableOpacity
                style={styles.executeButton}
                onPress={executeOperations}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={Colors.light.background} />
                ) : (
                  <>
                    <Ionicons name="play" size={16} color={Colors.light.background} />
                    <ThemedText style={styles.executeButtonText}>Execute All</ThemedText>
                  </>
                )}
              </TouchableOpacity>
            </View>
            
            {operations.map((operation, index) => renderOperationItem(operation, index))}
          </View>
        )}

        {/* Add Operation Button */}
        <View style={styles.addOperationContainer}>
          <TouchableOpacity
            style={styles.addOperationTrigger}
            onPress={() => setShowAddOperation(true)}
          >
            <Ionicons name="add" size={24} color={Colors.light.primary} />
            <ThemedText style={styles.addOperationText}>Add Bulk Operation</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Categories List */}
        <View style={styles.categoriesContainer}>
          <View style={styles.categoriesHeader}>
            <ThemedText style={styles.sectionTitle}>Categories</ThemedText>
            {dragEnabled && Platform.OS !== 'web' && (
              <ThemedText style={styles.dragHint}>Long press and drag to reorder</ThemedText>
            )}
          </View>
          
          {Platform.OS === 'web' || !DraggableFlatList ? (
            <FlatList
              data={categories}
              renderItem={({ item }) => renderCategoryItem({ item, drag: null, isActive: false })}
              keyExtractor={(item) => item.id}
              scrollEnabled={true}
            />
          ) : (
            <DraggableFlatList
              data={categories}
              renderItem={renderCategoryItem}
              keyExtractor={(item: CategoryWithStats) => item.id}
              onDragEnd={({ data }: { data: CategoryWithStats[] }) => setCategories(data)}
              scrollEnabled={!dragEnabled}
              activationDistance={dragEnabled ? 10 : 100}
            />
          )}
        </View>
      </ScrollView>

      {/* Add Operation Modal */}
      {renderAddOperationModal()}
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
  dragToggle: {
    padding: 8,
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: Colors.light.textSecondary,
  },
  operationsContainer: {
    backgroundColor: Colors.light.background,
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  operationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  executeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  executeButtonText: {
    color: Colors.light.background,
    fontSize: 14,
    fontWeight: '600',
  },
  operationItem: {
    backgroundColor: Colors.light.backgroundSecondary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  operationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  operationIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  operationNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.background,
  },
  operationDescription: {
    flex: 1,
    fontSize: 14,
    color: Colors.light.text,
  },
  removeOperationButton: {
    padding: 4,
  },
  addOperationContainer: {
    backgroundColor: Colors.light.background,
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
  },
  addOperationTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  addOperationText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.light.primary,
  },
  categoriesContainer: {
    backgroundColor: Colors.light.background,
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
  },
  categoriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dragHint: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  categoryItem: {
    backgroundColor: Colors.light.backgroundSecondary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  draggingItem: {
    opacity: 0.8,
    transform: [{ scale: 1.02 }],
  },
  selectedItem: {
    borderWidth: 2,
    borderColor: Colors.light.primary,
  },
  categoryItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  productCount: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  categoryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.light.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkedBox: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  subcategoriesContainer: {
    marginTop: 8,
    paddingLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: Colors.light.border,
  },
  subcategoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 8,
  },
  selectedSubcategory: {
    backgroundColor: Colors.light.primary + '20',
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  subcategoryName: {
    fontSize: 14,
    color: Colors.light.text,
  },
  subcategoryCount: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  smallCheckbox: {
    width: 16,
    height: 16,
    borderRadius: 2,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.light.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.text,
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.light.text,
    marginBottom: 8,
  },
  selectedCount: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 8,
    padding: 2,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  segmentButtonActive: {
    backgroundColor: Colors.light.primary,
  },
  segmentText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  segmentTextActive: {
    color: Colors.light.background,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.light.text,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: Colors.light.backgroundSecondary,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: Colors.light.text,
  },
  addOperationButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
  },
  addOperationButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.background,
  },
});