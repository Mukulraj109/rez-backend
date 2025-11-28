// Fallback implementations for web
import React from 'react';
import { FlatList } from 'react-native';

// Fallback for react-native-draggable-flatlist on web
function DraggableFlatList(props) {
  const { renderItem, data, keyExtractor, onDragEnd, ...flatListProps } = props;
  
  // On web, just render a regular FlatList without drag functionality
  return React.createElement(FlatList, {
    data: data,
    renderItem: ({ item, index }) => {
      if (renderItem) {
        return renderItem({ item, index, drag: null, isActive: false });
      }
      return null;
    },
    keyExtractor: keyExtractor,
    ...flatListProps
  });
}

// Export as default and named export for compatibility
export default DraggableFlatList;
export { DraggableFlatList };
export const RenderItemParams = null;