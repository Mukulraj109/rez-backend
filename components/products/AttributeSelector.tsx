/**
 * AttributeSelector Component
 * Multi-attribute selection component with support for various attribute types
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface Attribute {
  name: string;
  value: string;
  type?: 'color' | 'size' | 'material' | 'weight' | 'dimensions' | 'text';
  color?: string; // For color type
  unit?: string; // For weight/dimensions
}

interface AttributeSelectorProps {
  attributes: Attribute[];
  onChange: (attributes: Attribute[]) => void;
  maxAttributes?: number;
  allowCustom?: boolean;
}

const PREDEFINED_ATTRIBUTES = {
  color: [
    { name: 'Black', value: '#000000' },
    { name: 'White', value: '#FFFFFF' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Green', value: '#10B981' },
    { name: 'Yellow', value: '#F59E0B' },
    { name: 'Purple', value: '#8B5CF6' },
    { name: 'Pink', value: '#EC4899' },
    { name: 'Gray', value: '#6B7280' },
    { name: 'Navy', value: '#1E3A8A' },
    { name: 'Brown', value: '#92400E' },
    { name: 'Orange', value: '#F97316' },
  ],
  size: [
    { name: 'XXS', value: 'XXS' },
    { name: 'XS', value: 'XS' },
    { name: 'S', value: 'S' },
    { name: 'M', value: 'M' },
    { name: 'L', value: 'L' },
    { name: 'XL', value: 'XL' },
    { name: 'XXL', value: 'XXL' },
    { name: 'XXXL', value: 'XXXL' },
  ],
  material: [
    { name: 'Cotton', value: 'Cotton' },
    { name: 'Polyester', value: 'Polyester' },
    { name: 'Wool', value: 'Wool' },
    { name: 'Silk', value: 'Silk' },
    { name: 'Leather', value: 'Leather' },
    { name: 'Denim', value: 'Denim' },
    { name: 'Linen', value: 'Linen' },
    { name: 'Nylon', value: 'Nylon' },
    { name: 'Spandex', value: 'Spandex' },
  ],
  style: [
    { name: 'Casual', value: 'Casual' },
    { name: 'Formal', value: 'Formal' },
    { name: 'Sport', value: 'Sport' },
    { name: 'Business', value: 'Business' },
  ],
  fit: [
    { name: 'Slim', value: 'Slim' },
    { name: 'Regular', value: 'Regular' },
    { name: 'Relaxed', value: 'Relaxed' },
    { name: 'Oversized', value: 'Oversized' },
  ],
};

const AttributeSelector: React.FC<AttributeSelectorProps> = ({
  attributes,
  onChange,
  maxAttributes = 5,
  allowCustom = true,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [attributeType, setAttributeType] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');
  const [customValue, setCustomValue] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>('#000000');

  const handleAddAttribute = (name: string, value: string, type?: string, color?: string) => {
    if (attributes.length >= maxAttributes) return;

    const newAttribute: Attribute = {
      name,
      value,
      type: type as Attribute['type'],
      ...(color && { color }),
    };

    onChange([...attributes, newAttribute]);
  };

  const handleRemoveAttribute = (index: number) => {
    const newAttributes = attributes.filter((_, i) => i !== index);
    onChange(newAttributes);
  };

  const handleAddCustomAttribute = () => {
    if (!customName.trim() || !customValue.trim()) return;

    handleAddAttribute(
      customName.trim(),
      customValue.trim(),
      'text'
    );

    setCustomName('');
    setCustomValue('');
    setShowModal(false);
  };

  const handleAddColorAttribute = (colorName: string, colorValue: string) => {
    handleAddAttribute(colorName, colorName, 'color', colorValue);
    setShowModal(false);
  };

  const handleAddPredefinedAttribute = (type: string, name: string, value: string) => {
    handleAddAttribute(name, value, type);
    setShowModal(false);
  };

  const renderAttributeModal = () => (
    <Modal
      visible={showModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowModal(false)}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => setShowModal(false)}
        style={styles.modalBackdrop}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Attribute</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
          </View>

          {!attributeType ? (
            <ScrollView style={styles.typeSelector}>
              <Text style={styles.typeLabel}>Select Attribute Type</Text>

              <TouchableOpacity
                style={styles.typeButton}
                onPress={() => setAttributeType('color')}
              >
                <Ionicons name="color-palette-outline" size={24} color="#3B82F6" />
                <Text style={styles.typeButtonText}>Color</Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.typeButton}
                onPress={() => setAttributeType('size')}
              >
                <Ionicons name="resize-outline" size={24} color="#3B82F6" />
                <Text style={styles.typeButtonText}>Size</Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.typeButton}
                onPress={() => setAttributeType('material')}
              >
                <Ionicons name="shirt-outline" size={24} color="#3B82F6" />
                <Text style={styles.typeButtonText}>Material</Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.typeButton}
                onPress={() => setAttributeType('style')}
              >
                <Ionicons name="sparkles-outline" size={24} color="#3B82F6" />
                <Text style={styles.typeButtonText}>Style</Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.typeButton}
                onPress={() => setAttributeType('fit')}
              >
                <Ionicons name="body-outline" size={24} color="#3B82F6" />
                <Text style={styles.typeButtonText}>Fit</Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              {allowCustom && (
                <TouchableOpacity
                  style={styles.typeButton}
                  onPress={() => setAttributeType('custom')}
                >
                  <Ionicons name="add-circle-outline" size={24} color="#8B5CF6" />
                  <Text style={styles.typeButtonText}>Custom Attribute</Text>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </ScrollView>
          ) : attributeType === 'custom' ? (
            <View style={styles.customForm}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setAttributeType(null)}
              >
                <Ionicons name="arrow-back" size={20} color="#3B82F6" />
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Attribute Name</Text>
              <TextInput
                style={styles.input}
                value={customName}
                onChangeText={setCustomName}
                placeholder="e.g., Pattern, Neckline"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.inputLabel}>Attribute Value</Text>
              <TextInput
                style={styles.input}
                value={customValue}
                onChangeText={setCustomValue}
                placeholder="e.g., Striped, V-Neck"
                placeholderTextColor="#9CA3AF"
              />

              <TouchableOpacity
                style={[
                  styles.addButton,
                  (!customName.trim() || !customValue.trim()) && styles.addButtonDisabled,
                ]}
                onPress={handleAddCustomAttribute}
                disabled={!customName.trim() || !customValue.trim()}
              >
                <Text style={styles.addButtonText}>Add Custom Attribute</Text>
              </TouchableOpacity>
            </View>
          ) : attributeType === 'color' ? (
            <View style={styles.colorSelector}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setAttributeType(null)}
              >
                <Ionicons name="arrow-back" size={20} color="#3B82F6" />
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>

              <Text style={styles.typeLabel}>Select Color</Text>
              <View style={styles.colorGrid}>
                {PREDEFINED_ATTRIBUTES.color.map((color) => (
                  <TouchableOpacity
                    key={color.name}
                    style={styles.colorOption}
                    onPress={() => handleAddColorAttribute(color.name, color.value)}
                  >
                    <View
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: color.value },
                        color.value === '#FFFFFF' && styles.whiteColor,
                      ]}
                    />
                    <Text style={styles.colorName}>{color.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.optionsList}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setAttributeType(null)}
              >
                <Ionicons name="arrow-back" size={20} color="#3B82F6" />
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>

              <Text style={styles.typeLabel}>
                Select {attributeType?.charAt(0).toUpperCase() + attributeType?.slice(1)}
              </Text>
              <ScrollView>
                {PREDEFINED_ATTRIBUTES[attributeType as keyof typeof PREDEFINED_ATTRIBUTES]?.map(
                  (option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={styles.optionButton}
                      onPress={() =>
                        handleAddPredefinedAttribute(
                          attributeType,
                          option.name,
                          option.value
                        )
                      }
                    >
                      <Text style={styles.optionText}>{option.name}</Text>
                    </TouchableOpacity>
                  )
                )}
              </ScrollView>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Variant Attributes</Text>
        <Text style={styles.subtitle}>
          Add attributes to create product variants ({attributes.length}/{maxAttributes})
        </Text>
      </View>

      <View style={styles.attributesList}>
        {attributes.map((attr, index) => (
          <View key={index} style={styles.attributeChip}>
            {attr.type === 'color' && attr.color && (
              <View
                style={[
                  styles.colorIndicator,
                  { backgroundColor: attr.color },
                  attr.color === '#FFFFFF' && styles.whiteColor,
                ]}
              />
            )}
            <Text style={styles.attributeText}>
              {attr.name}: {attr.value}
            </Text>
            <TouchableOpacity onPress={() => handleRemoveAttribute(index)}>
              <Ionicons name="close-circle" size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>
        ))}

        {attributes.length < maxAttributes && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              setAttributeType(null);
              setShowModal(true);
            }}
          >
            <Ionicons name="add" size={20} color="#3B82F6" />
            <Text style={styles.addButtonText}>Add Attribute</Text>
          </TouchableOpacity>
        )}
      </View>

      {attributes.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="options-outline" size={40} color="#D1D5DB" />
          <Text style={styles.emptyText}>No attributes added yet</Text>
          <Text style={styles.emptySubtext}>
            Attributes help define different variants of your product
          </Text>
        </View>
      )}

      {renderAttributeModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  attributesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  attributeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  colorIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  whiteColor: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  attributeText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1E40AF',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    gap: 4,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#3B82F6',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
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
  typeSelector: {
    padding: 16,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  typeButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 4,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3B82F6',
  },
  customForm: {
    padding: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    marginBottom: 16,
  },
  colorSelector: {
    padding: 16,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    alignItems: 'center',
    width: '22%',
    marginBottom: 12,
  },
  colorSwatch: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  colorName: {
    fontSize: 12,
    color: '#374151',
    textAlign: 'center',
  },
  optionsList: {
    padding: 16,
  },
  optionButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
});

export default AttributeSelector;
