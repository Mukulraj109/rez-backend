import React from 'react';
import { View, StyleSheet, ViewStyle, ScrollView } from 'react-native';
import { useResponsiveLayout, useResponsiveDimensions } from '../../hooks/useResponsiveLayout';

interface ResponsiveGridProps {
  children: React.ReactNode[];
  columns?: number;
  spacing?: number;
  contentContainerStyle?: ViewStyle;
  style?: ViewStyle;
  scrollable?: boolean;
  showsVerticalScrollIndicator?: boolean;
  onScroll?: (event: any) => void;
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  columns,
  spacing,
  contentContainerStyle,
  style,
  scrollable = true,
  showsVerticalScrollIndicator = false,
  onScroll,
}) => {
  const layout = useResponsiveLayout();
  const { getGridItemWidth, getSpacing } = useResponsiveDimensions();

  const gridColumns = columns || layout.gridColumns;
  const gridSpacing = spacing || getSpacing();
  const itemWidth = getGridItemWidth(gridColumns);

  const renderGridItems = () => {
    const rows = [];
    for (let i = 0; i < children.length; i += gridColumns) {
      const rowItems = children.slice(i, i + gridColumns);
      
      const row = (
        <View key={`row-${i}`} style={[styles.row, { marginBottom: gridSpacing }]}>
          {rowItems.map((child, index) => (
            <View
              key={`item-${i}-${index}`}
              style={[
                styles.gridItem,
                {
                  width: itemWidth,
                  marginRight: index < rowItems.length - 1 ? gridSpacing : 0,
                },
              ]}
            >
              {child}
            </View>
          ))}
          
          {/* Fill remaining columns with empty views for consistent spacing */}
          {rowItems.length < gridColumns &&
            Array.from({ length: gridColumns - rowItems.length }, (_, index) => (
              <View
                key={`empty-${i}-${index}`}
                style={[
                  styles.gridItem,
                  {
                    width: itemWidth,
                    marginRight: index < gridColumns - rowItems.length - 1 ? gridSpacing : 0,
                  },
                ]}
              />
            ))}
        </View>
      );
      
      rows.push(row);
    }
    return rows;
  };

  const gridContent = (
    <View style={[styles.container, contentContainerStyle]}>
      {renderGridItems()}
    </View>
  );

  if (scrollable) {
    return (
      <ScrollView
        style={[styles.scrollContainer, style]}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        onScroll={onScroll}
        contentContainerStyle={{ paddingHorizontal: layout.margin }}
      >
        {gridContent}
      </ScrollView>
    );
  }

  return (
    <View style={[styles.scrollContainer, style, { paddingHorizontal: layout.margin }]}>
      {gridContent}
    </View>
  );
};

interface ResponsiveCardGridProps {
  children: React.ReactNode[];
  minCardWidth?: number;
  maxCardWidth?: number;
  aspectRatio?: number;
  spacing?: number;
  style?: ViewStyle;
  onCardPress?: (index: number) => void;
}

export const ResponsiveCardGrid: React.FC<ResponsiveCardGridProps> = ({
  children,
  minCardWidth = 280,
  maxCardWidth = 400,
  aspectRatio = 1.5,
  spacing,
  style,
  onCardPress,
}) => {
  const layout = useResponsiveLayout();
  const { getSpacing } = useResponsiveDimensions();

  const gridSpacing = spacing || getSpacing();
  
  // Calculate optimal number of columns based on card size constraints
  const availableWidth = layout.usableWidth;
  const maxColumns = Math.floor((availableWidth + gridSpacing) / (minCardWidth + gridSpacing));
  const minColumns = Math.floor((availableWidth + gridSpacing) / (maxCardWidth + gridSpacing));
  
  const optimalColumns = Math.max(1, Math.min(maxColumns, Math.max(minColumns, 1)));
  const cardWidth = (availableWidth - (gridSpacing * (optimalColumns - 1))) / optimalColumns;
  const cardHeight = cardWidth / aspectRatio;

  const renderCards = () => {
    const rows = [];
    for (let i = 0; i < children.length; i += optimalColumns) {
      const rowItems = children.slice(i, i + optimalColumns);
      
      const row = (
        <View key={`card-row-${i}`} style={[styles.row, { marginBottom: gridSpacing }]}>
          {rowItems.map((child, index) => (
            <View
              key={`card-${i}-${index}`}
              style={[
                styles.cardItem,
                {
                  width: cardWidth,
                  height: cardHeight,
                  marginRight: index < rowItems.length - 1 ? gridSpacing : 0,
                },
              ]}
              onTouchEnd={() => onCardPress?.(i + index)}
            >
              {child}
            </View>
          ))}
        </View>
      );
      
      rows.push(row);
    }
    return rows;
  };

  return (
    <View style={[styles.container, style, { paddingHorizontal: layout.margin }]}>
      {renderCards()}
    </View>
  );
};

interface MasonryGridProps {
  children: React.ReactNode[];
  columns?: number;
  spacing?: number;
  style?: ViewStyle;
}

export const MasonryGrid: React.FC<MasonryGridProps> = ({
  children,
  columns,
  spacing,
  style,
}) => {
  const layout = useResponsiveLayout();
  const { getSpacing } = useResponsiveDimensions();

  const gridColumns = columns || layout.gridColumns;
  const gridSpacing = spacing || getSpacing();
  const columnWidth = (layout.usableWidth - (gridSpacing * (gridColumns - 1))) / gridColumns;

  // Distribute children across columns
  const columnArrays: React.ReactNode[][] = Array.from({ length: gridColumns }, () => []);
  
  children.forEach((child, index) => {
    const columnIndex = index % gridColumns;
    columnArrays[columnIndex].push(child);
  });

  return (
    <View style={[styles.masonryContainer, style, { paddingHorizontal: layout.margin }]}>
      {columnArrays.map((columnChildren, columnIndex) => (
        <View
          key={`masonry-column-${columnIndex}`}
          style={[
            styles.masonryColumn,
            {
              width: columnWidth,
              marginRight: columnIndex < gridColumns - 1 ? gridSpacing : 0,
            },
          ]}
        >
          {columnChildren.map((child, childIndex) => (
            <View
              key={`masonry-item-${columnIndex}-${childIndex}`}
              style={[styles.masonryItem, { marginBottom: gridSpacing }]}
            >
              {child}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
};

interface AdaptiveListProps {
  children: React.ReactNode[];
  breakpoint?: number;
  listSpacing?: number;
  gridSpacing?: number;
  gridColumns?: number;
  style?: ViewStyle;
}

export const AdaptiveList: React.FC<AdaptiveListProps> = ({
  children,
  breakpoint = 768,
  listSpacing = 8,
  gridSpacing = 16,
  gridColumns,
  style,
}) => {
  const layout = useResponsiveLayout();
  
  const shouldUseGrid = layout.screenWidth >= breakpoint;
  
  if (shouldUseGrid) {
    return (
      <ResponsiveGrid
        columns={gridColumns}
        spacing={gridSpacing}
        style={style}
        scrollable={false}
      >
        {children}
      </ResponsiveGrid>
    );
  }

  return (
    <View style={[styles.listContainer, style, { paddingHorizontal: layout.margin }]}>
      {children.map((child, index) => (
        <View
          key={`list-item-${index}`}
          style={[
            styles.listItem,
            { marginBottom: index < children.length - 1 ? listSpacing : 0 },
          ]}
        >
          {child}
        </View>
      ))}
    </View>
  );
};

interface ResponsiveSectionProps {
  title?: string;
  children: React.ReactNode;
  headerComponent?: React.ReactNode;
  footerComponent?: React.ReactNode;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}

export const ResponsiveSection: React.FC<ResponsiveSectionProps> = ({
  title,
  children,
  headerComponent,
  footerComponent,
  style,
  contentStyle,
}) => {
  const layout = useResponsiveLayout();

  return (
    <View style={[styles.section, style]}>
      {(title || headerComponent) && (
        <View style={[styles.sectionHeader, { paddingHorizontal: layout.margin }]}>
          {headerComponent || (
            title && (
              <View style={styles.titleContainer}>
                {/* Title would be rendered here with themed text */}
              </View>
            )
          )}
        </View>
      )}
      
      <View style={[styles.sectionContent, contentStyle]}>
        {children}
      </View>
      
      {footerComponent && (
        <View style={[styles.sectionFooter, { paddingHorizontal: layout.margin }]}>
          {footerComponent}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  gridItem: {
    flexShrink: 0,
  },
  cardItem: {
    flexShrink: 0,
    borderRadius: 8,
    overflow: 'hidden',
  },
  masonryContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  masonryColumn: {
    flex: 1,
  },
  masonryItem: {
    width: '100%',
  },
  listContainer: {
    flex: 1,
  },
  listItem: {
    width: '100%',
  },
  section: {
    flex: 1,
  },
  sectionHeader: {
    paddingVertical: 12,
  },
  sectionContent: {
    flex: 1,
  },
  sectionFooter: {
    paddingVertical: 12,
  },
  titleContainer: {
    // Title styling would go here
  },
});