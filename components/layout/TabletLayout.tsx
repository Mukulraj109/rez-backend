import React, { useState } from 'react';
import { View, StyleSheet, ViewStyle, Dimensions, TouchableOpacity, DimensionValue, Platform } from 'react-native';
import { useResponsiveLayout, useResponsiveDimensions } from '../../hooks/useResponsiveLayout';
import { ThemedView } from '../ThemedView';
import { ThemedText } from '../ThemedText';

interface TabletLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  sidebarWidth?: number;
  collapsibleSidebar?: boolean;
  sidebarPosition?: 'left' | 'right';
  style?: ViewStyle;
}

export const TabletLayout: React.FC<TabletLayoutProps> = ({
  children,
  sidebar,
  header,
  footer,
  sidebarWidth,
  collapsibleSidebar = true,
  sidebarPosition = 'left',
  style,
}) => {
  const layout = useResponsiveLayout();
  const { getHorizontalPadding } = useResponsiveDimensions();
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  const defaultSidebarWidth = layout.isTablet ? 280 : 320;
  const actualSidebarWidth = sidebarWidth || defaultSidebarWidth;
  const collapsedSidebarWidth = 64;
  
  const currentSidebarWidth = sidebarCollapsed ? collapsedSidebarWidth : actualSidebarWidth;
  const contentWidth = layout.screenWidth - (sidebar ? currentSidebarWidth : 0);

  const toggleSidebar = () => {
    if (collapsibleSidebar) {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  if (!layout.isTablet && !layout.isDesktop) {
    // On phones, use a simpler layout without sidebar
    return (
      <ThemedView style={[styles.phoneContainer, style]}>
        {header && <View style={styles.header}>{header}</View>}
        <View style={styles.phoneContent}>{children}</View>
        {footer && <View style={styles.footer}>{footer}</View>}
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, style]}>
      {/* Header */}
      {header && (
        <View style={[styles.header, { paddingHorizontal: getHorizontalPadding() }]}>
          {header}
        </View>
      )}

      {/* Main content area */}
      <View style={styles.mainContent}>
        {/* Sidebar */}
        {sidebar && sidebarPosition === 'left' && (
          <View
            style={[
              styles.sidebar,
              styles.leftSidebar,
              {
                width: currentSidebarWidth,
              },
            ]}
          >
            <SidebarContent
              collapsed={sidebarCollapsed}
              onToggle={toggleSidebar}
              collapsible={collapsibleSidebar}
            >
              {sidebar}
            </SidebarContent>
          </View>
        )}

        {/* Content */}
        <View
          style={[
            styles.content,
            {
              width: contentWidth,
              paddingHorizontal: getHorizontalPadding(),
            },
          ]}
        >
          {children}
        </View>

        {/* Right sidebar */}
        {sidebar && sidebarPosition === 'right' && (
          <View
            style={[
              styles.sidebar,
              styles.rightSidebar,
              {
                width: currentSidebarWidth,
              },
            ]}
          >
            <SidebarContent
              collapsed={sidebarCollapsed}
              onToggle={toggleSidebar}
              collapsible={collapsibleSidebar}
            >
              {sidebar}
            </SidebarContent>
          </View>
        )}
      </View>

      {/* Footer */}
      {footer && (
        <View style={[styles.footer, { paddingHorizontal: getHorizontalPadding() }]}>
          {footer}
        </View>
      )}
    </ThemedView>
  );
};

interface SidebarContentProps {
  children: React.ReactNode;
  collapsed: boolean;
  onToggle: () => void;
  collapsible: boolean;
}

const SidebarContent: React.FC<SidebarContentProps> = ({
  children,
  collapsed,
  onToggle,
  collapsible,
}) => {
  return (
    <ThemedView style={styles.sidebarContent}>
      {collapsible && (
        <View style={styles.sidebarToggle}>
          <TouchableOpacity style={styles.toggleButton} onPress={onToggle}>
            <ThemedText style={styles.toggleIcon}>
              {collapsed ? '→' : '←'}
            </ThemedText>
          </TouchableOpacity>
        </View>
      )}
      
      <View style={[styles.sidebarBody, collapsed && styles.sidebarCollapsed]}>
        {children}
      </View>
    </ThemedView>
  );
};

interface SplitViewProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  leftPanelWidth?: number | string;
  rightPanelWidth?: number | string;
  spacing?: number;
  style?: ViewStyle;
  resizable?: boolean;
}

export const SplitView: React.FC<SplitViewProps> = ({
  leftPanel,
  rightPanel,
  leftPanelWidth = '50%',
  rightPanelWidth = '50%',
  spacing = 16,
  style,
  resizable = false,
}) => {
  const layout = useResponsiveLayout();
  
  // On phones, stack vertically
  if (layout.isPhone) {
    return (
      <View style={[styles.splitViewVertical, style]}>
        <View style={[styles.splitPanel, { marginBottom: spacing }]}>
          {leftPanel}
        </View>
        <View style={styles.splitPanel}>
          {rightPanel}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.splitViewHorizontal, style]}>
      <View style={[styles.splitPanel, { width: leftPanelWidth as DimensionValue, marginRight: spacing / 2 }]}>
        {leftPanel}
      </View>
      
      {resizable && <ResizeDivider />}
      
      <View style={[styles.splitPanel, { width: rightPanelWidth as DimensionValue, marginLeft: spacing / 2 }]}>
        {rightPanel}
      </View>
    </View>
  );
};

const ResizeDivider: React.FC = () => {
  return (
    <View style={styles.resizeDivider}>
      <View style={styles.resizeHandle} />
    </View>
  );
};

interface MasterDetailProps {
  masterPanel: React.ReactNode;
  detailPanel: React.ReactNode;
  masterWidth?: number;
  showMaster?: boolean;
  onMasterToggle?: () => void;
  style?: ViewStyle;
}

export const MasterDetail: React.FC<MasterDetailProps> = ({
  masterPanel,
  detailPanel,
  masterWidth = 320,
  showMaster = true,
  onMasterToggle,
  style,
}) => {
  const layout = useResponsiveLayout();
  
  // On phones, show only one panel at a time
  if (layout.isPhone) {
    return (
      <View style={[styles.masterDetailPhone, style]}>
        {showMaster ? (
          <View style={styles.masterPanel}>
            <View style={styles.masterHeader}>
              {onMasterToggle && (
                <TouchableOpacity style={styles.backButton} onPress={onMasterToggle}>
                  <ThemedText>← Back</ThemedText>
                </TouchableOpacity>
              )}
            </View>
            {masterPanel}
          </View>
        ) : (
          <View style={styles.detailPanel}>
            <View style={styles.detailHeader}>
              {onMasterToggle && (
                <TouchableOpacity style={styles.backButton} onPress={onMasterToggle}>
                  <ThemedText>← Back</ThemedText>
                </TouchableOpacity>
              )}
            </View>
            {detailPanel}
          </View>
        )}
      </View>
    );
  }

  // On tablets and larger, show both panels
  return (
    <View style={[styles.masterDetailTablet, style]}>
      {showMaster && (
        <View style={[styles.masterPanel, { width: masterWidth }]}>
          {masterPanel}
        </View>
      )}
      
      <View style={[styles.detailPanel, { flex: 1 }]}>
        {detailPanel}
      </View>
    </View>
  );
};

interface ResponsiveModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  maxWidth?: number;
  maxHeight?: number;
  style?: ViewStyle;
}

export const ResponsiveModal: React.FC<ResponsiveModalProps> = ({
  visible,
  onClose,
  children,
  title,
  maxWidth,
  maxHeight,
  style,
}) => {
  const { modalWidth, modalHeight, isPhone } = useResponsiveLayout();
  
  if (!visible) return null;

  const containerStyle = isPhone 
    ? styles.modalFullscreen 
    : [
        styles.modalCentered,
        {
          width: Math.min(modalWidth, maxWidth || modalWidth),
          height: Math.min(modalHeight, maxHeight || modalHeight),
        },
      ];

  return (
    <View style={styles.modalOverlay}>
      <ThemedView style={[containerStyle, style]}>
        {title && (
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>{title}</ThemedText>
            <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
              <ThemedText>×</ThemedText>
            </TouchableOpacity>
          </View>
        )}
        
        <View style={styles.modalContent}>
          {children}
        </View>
      </ThemedView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  phoneContainer: {
    flex: 1,
  },
  header: {
    height: 64,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  footer: {
    height: 48,
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  leftSidebar: {
    borderRightWidth: 1,
  },
  rightSidebar: {
    borderLeftWidth: 1,
    borderRightWidth: 0,
  },
  sidebarContent: {
    flex: 1,
  },
  sidebarToggle: {
    padding: 8,
    alignItems: 'flex-end',
  },
  toggleButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  toggleIcon: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  sidebarBody: {
    flex: 1,
    padding: 16,
  },
  sidebarCollapsed: {
    alignItems: 'center',
    padding: 8,
  },
  content: {
    flex: 1,
    paddingVertical: 16,
  },
  phoneContent: {
    flex: 1,
    padding: 16,
  },
  splitViewHorizontal: {
    flex: 1,
    flexDirection: 'row',
  },
  splitViewVertical: {
    flex: 1,
    flexDirection: 'column',
  },
  splitPanel: {
    flex: 1,
  },
  resizeDivider: {
    width: 8,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' && { cursor: 'col-resize' }),
  } as ViewStyle,
  resizeHandle: {
    width: 2,
    height: '100%',
    backgroundColor: '#D1D5DB',
  },
  masterDetailPhone: {
    flex: 1,
  },
  masterDetailTablet: {
    flex: 1,
    flexDirection: 'row',
  },
  masterPanel: {
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  detailPanel: {
    flex: 1,
  },
  masterHeader: {
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  detailHeader: {
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    borderRadius: 4,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalFullscreen: {
    flex: 1,
    margin: 16,
    borderRadius: 12,
  },
  modalCentered: {
    borderRadius: 12,
    maxWidth: '90%',
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
});