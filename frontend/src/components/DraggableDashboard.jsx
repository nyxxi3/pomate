import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from "lucide-react";
import { getUserPreferences, updateDashboardLayout } from "../lib/userPreferencesApi";
import toast from "react-hot-toast";

// Component IDs for tracking
const COMPONENT_IDS = {
  QUICK_START: 'quick-start',
  ACTIVE_ROOMS: 'active-rooms', 
  HABITS: 'habits',
  PROGRESS: 'progress',
  GOALS: 'goals'
};

// Default layout order
const DEFAULT_LAYOUT = [
  { id: COMPONENT_IDS.QUICK_START, component: 'QuickStartCard', column: 'left' },
  { id: COMPONENT_IDS.ACTIVE_ROOMS, component: 'ActiveRooms', column: 'left' },
  { id: COMPONENT_IDS.HABITS, component: 'HabitTracker', column: 'left' },
  { id: COMPONENT_IDS.PROGRESS, component: 'ProgressCard', column: 'right' },
  { id: COMPONENT_IDS.GOALS, component: 'GoalsCard', column: 'right' }
];

// Sortable wrapper for each component
const SortableComponent = ({ id, children, isDesktop = true }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Only show drag handle on desktop
  if (!isDesktop) {
    return <div ref={setNodeRef} style={style}>{children}</div>;
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${isDragging ? 'z-50' : ''}`}
    >
      {/* Drag Handle - Desktop Only */}
      <div
        {...attributes}
        {...listeners}
        className="absolute -left-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-grab active:cursor-grabbing bg-base-100 border border-base-300 rounded-lg p-1 shadow-sm hover:shadow-md hover:scale-105"
        title="Drag to reorder components"
      >
        <GripVertical className="w-4 h-4 text-base-content/60" />
      </div>
      
      {children}
    </div>
  );
};

const DraggableDashboard = ({ 
  QuickStartCard, 
  ActiveRooms, 
  HabitTracker, 
  ProgressCard, 
  GoalsCard,
  activeSolo,
  remaining,
  isDesktop = true 
}) => {
  const [layout, setLayout] = useState(DEFAULT_LAYOUT);
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load saved layout from localStorage
  useEffect(() => {
    const loadLayout = async () => {
      try {
        const preferences = await getUserPreferences();
        if (preferences.dashboardLayout && preferences.dashboardLayout.length > 0) {
          setLayout(preferences.dashboardLayout);
        }
      } catch (error) {
        console.error('Error loading dashboard layout:', error);
        // Fallback to localStorage if database fails
        const savedLayout = localStorage.getItem('dashboard-layout');
        if (savedLayout) {
          try {
            const parsedLayout = JSON.parse(savedLayout);
            setLayout(parsedLayout);
          } catch (parseError) {
            console.error('Failed to load saved layout:', parseError);
          }
        }
      }
    };
    
    loadLayout();
  }, []);

  // Save layout to database
  useEffect(() => {
    const saveLayout = async () => {
      try {
        await updateDashboardLayout(layout);
        // Also save to localStorage as backup
        localStorage.setItem('dashboard-layout', JSON.stringify(layout));
      } catch (error) {
        console.error('Error saving dashboard layout:', error);
        // Fallback to localStorage only
        localStorage.setItem('dashboard-layout', JSON.stringify(layout));
      }
    };
    
    // Only save if layout is not empty (avoid saving on initial load)
    if (layout.length > 0) {
      saveLayout();
    }
  }, [layout]);

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (active.id !== over.id) {
      setLayout((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        
        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // Determine target column based on drop position
        // If dropping on a right column item, move to right column
        // Otherwise, move to left column
        const targetColumn = rightColumnComponents.some(item => item.id === over.id) ? 'right' : 'left';
        
        // Update the moved item's column
        return newItems.map((item, index) => {
          if (item.id === active.id) {
            return { ...item, column: targetColumn };
          }
          return item;
        });
      });
    }
  };

  const resetLayout = async () => {
    try {
      setLayout(DEFAULT_LAYOUT);
      await updateDashboardLayout(DEFAULT_LAYOUT);
      localStorage.removeItem('dashboard-layout');
      toast.success('Layout reset to default');
    } catch (error) {
      console.error('Error resetting layout:', error);
      // Still reset locally even if database fails
      setLayout(DEFAULT_LAYOUT);
      localStorage.removeItem('dashboard-layout');
      toast.success('Layout reset to default');
    }
  };

  // Listen for reset layout event from Dashboard
  useEffect(() => {
    const handleResetLayout = () => {
      resetLayout();
    };

    window.addEventListener('resetLayout', handleResetLayout);
    return () => window.removeEventListener('resetLayout', handleResetLayout);
  }, []);

  // Separate components by column
  const leftColumnComponents = layout.filter(item => item.column === 'left');
  const rightColumnComponents = layout.filter(item => item.column === 'right');

  // Component mapping
  const componentMap = {
    QuickStartCard: <QuickStartCard activeSolo={activeSolo} remaining={remaining} />,
    ActiveRooms: <ActiveRooms />,
    HabitTracker: <HabitTracker />,
    ProgressCard: <ProgressCard colorToken="primary" />,
    GoalsCard: <GoalsCard />
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      
      <SortableContext items={layout.map(item => item.id)} strategy={verticalListSortingStrategy}>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-3 space-y-6">
            {leftColumnComponents.map((item) => (
              <SortableComponent key={item.id} id={item.id} isDesktop={isDesktop}>
                {componentMap[item.component]}
              </SortableComponent>
            ))}
          </div>

          {/* Right Column */}
          <div className="lg:col-span-1 space-y-4">
            {rightColumnComponents.map((item) => (
              <SortableComponent key={item.id} id={item.id} isDesktop={isDesktop}>
                {componentMap[item.component]}
              </SortableComponent>
            ))}
          </div>
        </div>
      </SortableContext>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeId ? (
          <div className="opacity-80 rotate-2 scale-105 shadow-2xl border-2 border-primary rounded-xl overflow-hidden">
            {componentMap[layout.find(item => item.id === activeId)?.component]}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default DraggableDashboard;
