import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WidgetConfig } from '@/components/widgets/DashboardWidget';

export interface DashboardLayout {
  id: string;
  name: string;
  widgets: WidgetConfig[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_WIDGETS: WidgetConfig[] = [
  {
    id: 'revenue-metric',
    type: 'metric',
    title: 'Monthly Revenue',
    size: 'small',
    position: { x: 0, y: 0 },
    isVisible: true,
    refreshInterval: 30,
  },
  {
    id: 'orders-metric',
    type: 'metric',
    title: 'Total Orders',
    size: 'small',
    position: { x: 1, y: 0 },
    isVisible: true,
    refreshInterval: 30,
  },
  {
    id: 'customers-metric',
    type: 'metric',
    title: 'New Customers',
    size: 'small',
    position: { x: 0, y: 1 },
    isVisible: true,
    refreshInterval: 60,
  },
  {
    id: 'cashback-metric',
    type: 'metric',
    title: 'Pending Cashback',
    size: 'small',
    position: { x: 1, y: 1 },
    isVisible: true,
    refreshInterval: 60,
  },
  {
    id: 'revenue-chart',
    type: 'chart',
    title: 'Revenue Trend',
    size: 'medium',
    position: { x: 0, y: 2 },
    isVisible: true,
    refreshInterval: 300,
  },
  {
    id: 'recent-orders',
    type: 'list',
    title: 'Recent Orders',
    size: 'medium',
    position: { x: 0, y: 3 },
    isVisible: true,
    refreshInterval: 60,
  },
  {
    id: 'low-stock',
    type: 'notification',
    title: 'Low Stock Alerts',
    size: 'medium',
    position: { x: 0, y: 4 },
    isVisible: true,
    refreshInterval: 300,
  },
];

const STORAGE_KEYS = {
  LAYOUTS: '@dashboard_layouts',
  ACTIVE_LAYOUT: '@active_layout_id',
};

export const useDashboardWidgets = () => {
  const [layouts, setLayouts] = useState<DashboardLayout[]>([]);
  const [activeLayoutId, setActiveLayoutId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // Load layouts from storage
  const loadLayouts = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const [layoutsData, activeId] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.LAYOUTS),
        AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_LAYOUT),
      ]);

      let parsedLayouts: DashboardLayout[] = [];
      
      if (layoutsData) {
        parsedLayouts = JSON.parse(layoutsData).map((layout: any) => ({
          ...layout,
          createdAt: new Date(layout.createdAt),
          updatedAt: new Date(layout.updatedAt),
        }));
      }

      // Create default layout if none exist
      if (parsedLayouts.length === 0) {
        const defaultLayout: DashboardLayout = {
          id: 'default',
          name: 'Default Dashboard',
          widgets: DEFAULT_WIDGETS,
          isDefault: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        parsedLayouts = [defaultLayout];
        await saveLayouts([defaultLayout]);
      }

      setLayouts(parsedLayouts);
      
      // Set active layout
      const activeLayout = activeId ? parsedLayouts.find(l => l.id === activeId) : null;
      setActiveLayoutId(activeLayout?.id || parsedLayouts[0]?.id || 'default');

    } catch (error) {
      console.error('Error loading dashboard layouts:', error);
      // Fallback to default layout
      const defaultLayout: DashboardLayout = {
        id: 'default',
        name: 'Default Dashboard',
        widgets: DEFAULT_WIDGETS,
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setLayouts([defaultLayout]);
      setActiveLayoutId('default');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save layouts to storage
  const saveLayouts = async (layoutsToSave: DashboardLayout[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LAYOUTS, JSON.stringify(layoutsToSave));
    } catch (error) {
      console.error('Error saving dashboard layouts:', error);
    }
  };

  // Save active layout ID
  const saveActiveLayoutId = async (layoutId: string) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_LAYOUT, layoutId);
    } catch (error) {
      console.error('Error saving active layout ID:', error);
    }
  };

  // Get current active layout
  const activeLayout = layouts.find(layout => layout.id === activeLayoutId);

  // Get visible widgets from active layout
  const visibleWidgets = activeLayout?.widgets.filter(widget => widget.isVisible) || [];

  // Create a new layout
  const createLayout = useCallback(async (name: string, basedOn?: string) => {
    const baseLayout = basedOn ? layouts.find(l => l.id === basedOn) : activeLayout;
    const newLayout: DashboardLayout = {
      id: `layout_${Date.now()}`,
      name,
      widgets: baseLayout ? [...baseLayout.widgets] : [...DEFAULT_WIDGETS],
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedLayouts = [...layouts, newLayout];
    setLayouts(updatedLayouts);
    await saveLayouts(updatedLayouts);
    
    return newLayout;
  }, [layouts, activeLayout]);

  // Update a layout
  const updateLayout = useCallback(async (layoutId: string, updates: Partial<DashboardLayout>) => {
    const updatedLayouts = layouts.map(layout => 
      layout.id === layoutId 
        ? { ...layout, ...updates, updatedAt: new Date() }
        : layout
    );
    
    setLayouts(updatedLayouts);
    await saveLayouts(updatedLayouts);
  }, [layouts]);

  // Delete a layout
  const deleteLayout = useCallback(async (layoutId: string) => {
    const layoutToDelete = layouts.find(l => l.id === layoutId);
    if (layoutToDelete?.isDefault) {
      throw new Error('Cannot delete default layout');
    }

    const updatedLayouts = layouts.filter(layout => layout.id !== layoutId);
    setLayouts(updatedLayouts);
    await saveLayouts(updatedLayouts);

    // Switch to first available layout if deleting active layout
    if (layoutId === activeLayoutId && updatedLayouts.length > 0) {
      const newActiveId = updatedLayouts[0].id;
      setActiveLayoutId(newActiveId);
      await saveActiveLayoutId(newActiveId);
    }
  }, [layouts, activeLayoutId]);

  // Switch active layout
  const setActiveLayout = useCallback(async (layoutId: string) => {
    setActiveLayoutId(layoutId);
    await saveActiveLayoutId(layoutId);
  }, []);

  // Update widget in active layout
  const updateWidget = useCallback(async (widgetId: string, updates: Partial<WidgetConfig>) => {
    if (!activeLayout) return;

    const updatedWidgets = activeLayout.widgets.map(widget =>
      widget.id === widgetId
        ? { ...widget, ...updates }
        : widget
    );

    await updateLayout(activeLayout.id, { widgets: updatedWidgets });
  }, [activeLayout, updateLayout]);

  // Add widget to active layout
  const addWidget = useCallback(async (widget: Omit<WidgetConfig, 'id'>) => {
    if (!activeLayout) return;

    const newWidget: WidgetConfig = {
      ...widget,
      id: `widget_${Date.now()}`,
    };

    const updatedWidgets = [...activeLayout.widgets, newWidget];
    await updateLayout(activeLayout.id, { widgets: updatedWidgets });
  }, [activeLayout, updateLayout]);

  // Remove widget from active layout
  const removeWidget = useCallback(async (widgetId: string) => {
    if (!activeLayout) return;

    const updatedWidgets = activeLayout.widgets.filter(widget => widget.id !== widgetId);
    await updateLayout(activeLayout.id, { widgets: updatedWidgets });
  }, [activeLayout, updateLayout]);

  // Move widget position
  const moveWidget = useCallback(async (widgetId: string, position: { x: number; y: number }) => {
    await updateWidget(widgetId, { position });
  }, [updateWidget]);

  // Resize widget
  const resizeWidget = useCallback(async (widgetId: string, size: WidgetConfig['size']) => {
    await updateWidget(widgetId, { size });
  }, [updateWidget]);

  // Toggle widget visibility
  const toggleWidgetVisibility = useCallback(async (widgetId: string) => {
    if (!activeLayout) return;

    const widget = activeLayout.widgets.find(w => w.id === widgetId);
    if (widget) {
      await updateWidget(widgetId, { isVisible: !widget.isVisible });
    }
  }, [activeLayout, updateWidget]);

  // Reset layout to default
  const resetToDefault = useCallback(async () => {
    if (!activeLayout) return;

    await updateLayout(activeLayout.id, { 
      widgets: [...DEFAULT_WIDGETS],
      updatedAt: new Date(),
    });
  }, [activeLayout, updateLayout]);

  // Export layout configuration
  const exportLayout = useCallback((layoutId?: string) => {
    const layout = layoutId ? layouts.find(l => l.id === layoutId) : activeLayout;
    if (!layout) return null;

    return {
      name: layout.name,
      widgets: layout.widgets,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };
  }, [layouts, activeLayout]);

  // Import layout configuration
  const importLayout = useCallback(async (config: any, name?: string) => {
    try {
      const importedLayout: DashboardLayout = {
        id: `imported_${Date.now()}`,
        name: name || `Imported ${config.name || 'Layout'}`,
        widgets: config.widgets || DEFAULT_WIDGETS,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedLayouts = [...layouts, importedLayout];
      setLayouts(updatedLayouts);
      await saveLayouts(updatedLayouts);
      
      return importedLayout;
    } catch (error) {
      console.error('Error importing layout:', error);
      throw new Error('Invalid layout configuration');
    }
  }, [layouts]);

  // Get available widget types
  const getAvailableWidgetTypes = () => [
    { type: 'metric', label: 'Metric Card', icon: 'analytics' },
    { type: 'chart', label: 'Chart Widget', icon: 'bar-chart' },
    { type: 'list', label: 'List Widget', icon: 'list' },
    { type: 'notification', label: 'Notification Widget', icon: 'notifications' },
  ];

  // Initialize layouts on mount
  useEffect(() => {
    loadLayouts();
  }, [loadLayouts]);

  return {
    // State
    layouts,
    activeLayout,
    visibleWidgets,
    isLoading,
    isEditing,
    
    // Layout management
    createLayout,
    updateLayout,
    deleteLayout,
    setActiveLayout,
    resetToDefault,
    
    // Widget management
    addWidget,
    updateWidget,
    removeWidget,
    moveWidget,
    resizeWidget,
    toggleWidgetVisibility,
    
    // Import/Export
    exportLayout,
    importLayout,
    
    // Utilities
    getAvailableWidgetTypes,
    setIsEditing,
    
    // Refresh
    reloadLayouts: loadLayouts,
  };
};