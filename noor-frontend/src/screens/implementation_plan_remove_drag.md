# Implementation Plan - Remove Drag Functionality

## Objective
Remove all drag-and-drop functionality from the Admin Dashboard to simplify the UI and resolve potential issues with nested scroll containers.

## Changes Implemented

### 1. `AdminDashboardScreen.tsx`
- **Replaced List Component**: Replaced `NestableDraggableFlatList` with a standard mapped `View` list for rendering tasks.
- **Removed Drag UI**: Removed the `ScaleDecorator` and the specific drag handle icon (`reorder-three-outline`) from the task items.
- **Cleaned Up Logic**: 
    - Removed `isActive` state usage.
    - Removed `onDragEnd` handler (`handleTaskReorder`).
    - Removed `handleTaskReorder` function definition entirely.
- **Updated Imports**: Removed imports from `react-native-draggable-flatlist`.
- **Refactored Container**: Changed `SafeScrollContainer` to directly use `ScrollView` from `react-native`, removing the dependency on `NestableScrollContainer`.

## Verification
- **Visuals**: The task list now renders as a static list. Drag handles are gone.
- **Functionality**: Reordering is disabled. Task interactions (completion, edit, delete, assign) remain functional.
- **Code Quality**: Unused imports and dead code (reorder handler) have been removed.

## Notes
- The `react-native-draggable-flatlist` package is no longer used in `AdminDashboardScreen.tsx` and appears unused in the rest of `src`. It can be safely uninstalled if desired.
