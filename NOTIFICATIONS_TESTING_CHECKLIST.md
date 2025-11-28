# Notification Center Testing Checklist

## ✅ Pre-Testing Setup

- [ ] Backend is running and accessible
- [ ] Socket.IO server is running
- [ ] Test merchant account is created
- [ ] App is running on simulator/device
- [ ] React Native Debugger or console is open

---

## 📱 Screen Testing

### Main Notification Center (`/notifications`)

#### Tab Navigation
- [ ] All tab displays all notifications
- [ ] Unread tab displays only unread notifications
- [ ] Order tab displays only order notifications
- [ ] Product tab displays only product notifications
- [ ] Team tab displays only team notifications
- [ ] System tab displays only system notifications
- [ ] Badge counts are correct on each tab
- [ ] Badge counts update when notifications are read

#### Notification List
- [ ] Notifications display with correct icon
- [ ] Notifications display with correct color
- [ ] Title is displayed and truncated if needed
- [ ] Message is displayed and truncated to 2 lines
- [ ] Timestamp shows relative time ("2m ago")
- [ ] Unread indicator (blue dot) shows on unread notifications
- [ ] Read notifications don't show blue dot

#### Actions
- [ ] Tapping notification navigates to detail screen
- [ ] Mark as read button works on unread notifications
- [ ] Mark as read button is disabled on read notifications
- [ ] Delete button shows confirmation dialog
- [ ] Delete button removes notification from list
- [ ] "Mark all as read" button works
- [ ] "Mark all as read" button disables while loading
- [ ] "Mark all as read" updates all notification statuses

#### List Behavior
- [ ] Pull-to-refresh works
- [ ] Pull-to-refresh shows loading indicator
- [ ] Pull-to-refresh updates notification list
- [ ] Infinite scroll loads more notifications
- [ ] Infinite scroll shows loading indicator at bottom
- [ ] Infinite scroll stops when no more notifications
- [ ] Empty state shows when no notifications exist
- [ ] Loading state shows on initial load

---

### Notification Detail (`/notifications/:id`)

#### Display
- [ ] Large icon displays with correct color
- [ ] Title displays correctly
- [ ] Message displays correctly
- [ ] Description displays if present
- [ ] Received timestamp shows in full format
- [ ] Read timestamp shows if notification was read
- [ ] Metadata section shows template variables

#### Actions
- [ ] Primary action button displays correct label
- [ ] Primary action button navigates correctly
- [ ] "Mark as Read" button works on unread notifications
- [ ] "Mark as Read" button is disabled on read notifications
- [ ] Delete button shows confirmation dialog
- [ ] Delete button navigates back after deletion
- [ ] Back button works

#### Behavior
- [ ] Notification auto-marks as read when opened
- [ ] Unread count updates after marking as read
- [ ] Loading state shows while fetching
- [ ] Error state shows if notification not found
- [ ] Error state has "Go Back" button

---

### Notification Preferences (`/notifications/preferences`)

#### Push Notifications Section
- [ ] Master toggle enables/disables all push notifications
- [ ] Category toggles show when push is enabled
- [ ] Category toggles hide when push is disabled
- [ ] Order notifications toggle works
- [ ] Product notifications toggle works
- [ ] Team notifications toggle works
- [ ] System notifications toggle works
- [ ] Cashback notifications toggle works
- [ ] Payment notifications toggle works

#### Email Notifications Section
- [ ] Daily digest toggle works
- [ ] Weekly summary toggle works
- [ ] Marketing emails toggle works

#### In-App Notifications Section
- [ ] Sound toggle works
- [ ] Vibration toggle works

#### Quiet Hours Section
- [ ] Enable quiet hours toggle works
- [ ] Start time picker shows when enabled
- [ ] Start time picker updates time
- [ ] End time picker shows when enabled
- [ ] End time picker updates time
- [ ] Allow urgent notifications toggle works

#### Save Button
- [ ] Save button is always visible at bottom
- [ ] Save button shows loading state when saving
- [ ] Save button shows success message
- [ ] Changes persist after saving
- [ ] Changes are reflected immediately (optimistic updates)

---

### Advanced Settings (`/notifications/settings`)

#### Notification Retention
- [ ] 7 days option is selectable
- [ ] 30 days option is selectable
- [ ] 90 days option is selectable
- [ ] Forever option is selectable
- [ ] Selected option shows checkmark

#### Auto-Delete Read Notifications
- [ ] Never option is selectable
- [ ] 7 days option is selectable
- [ ] 30 days option is selectable
- [ ] Selected option shows checkmark

#### Notification Grouping
- [ ] None option is selectable
- [ ] By type option is selectable
- [ ] By date option is selectable
- [ ] Selected option shows checkmark

#### Badge Count Display
- [ ] All notifications option is selectable
- [ ] Unread only option is selectable
- [ ] Selected option shows checkmark

#### Actions
- [ ] "Send Test Notification" button shows loading state
- [ ] "Send Test Notification" button sends notification
- [ ] Test notification appears in toast
- [ ] "Clear All Notifications" shows confirmation dialog
- [ ] "Clear All Notifications" clears all notifications
- [ ] "Export Notification History" shows permission badge if no permission
- [ ] "Export Notification History" works if permission granted
- [ ] Export triggers email or download

---

## 🔔 Real-Time Testing

### Toast Notifications
- [ ] Toast appears at top of screen
- [ ] Toast shows correct icon and color
- [ ] Toast shows notification title
- [ ] Toast shows notification message (truncated)
- [ ] Toast auto-dismisses after 5 seconds
- [ ] Toast progress bar animates
- [ ] Tapping toast navigates to detail
- [ ] Tapping close button dismisses toast
- [ ] Swipe up gesture dismisses toast
- [ ] Multiple toasts queue properly

### Socket.IO Integration
- [ ] New notification triggers `notification:new` event
- [ ] Unread count updates in real-time
- [ ] Toast shows when new notification received
- [ ] Badge count updates when notification read
- [ ] Notification list refreshes on socket event
- [ ] Socket reconnects after disconnect
- [ ] Socket events work after app background/foreground

---

## 🔐 Permission Testing

### notifications:view
- [ ] User with permission can view notifications
- [ ] User without permission sees error or redirect

### notifications:manage
- [ ] User with permission can access preferences
- [ ] User with permission can access settings
- [ ] User without permission sees disabled state

### notifications:export
- [ ] User with permission sees enabled export button
- [ ] User without permission sees permission badge
- [ ] Export button is disabled for users without permission

---

## 🎯 Edge Cases

### Empty States
- [ ] Empty state shows when no notifications exist
- [ ] Empty state shows appropriate message per tab
- [ ] Empty state shows icon

### Error States
- [ ] Network error shows error message
- [ ] 404 error shows "not found" message
- [ ] 500 error shows "server error" message
- [ ] Error state has retry button

### Loading States
- [ ] Initial load shows loading spinner
- [ ] Infinite scroll shows loading at bottom
- [ ] Pull-to-refresh shows loading indicator
- [ ] Mutation loading shows on buttons

### Navigation
- [ ] Back button works from all screens
- [ ] Deep linking to notification detail works
- [ ] Navigation state persists across app restarts
- [ ] Tab state persists when navigating back

---

## 📊 Performance Testing

### List Performance
- [ ] List scrolls smoothly with 100+ items
- [ ] Infinite scroll doesn't cause lag
- [ ] Images load efficiently
- [ ] No memory leaks after scrolling

### Real-Time Performance
- [ ] Multiple rapid notifications don't crash app
- [ ] Socket events process efficiently
- [ ] UI updates don't block main thread

### Query Performance
- [ ] Queries use proper caching
- [ ] Optimistic updates are instant
- [ ] Background refetch doesn't block UI
- [ ] Query invalidation is efficient

---

## 🌐 Platform Testing

### iOS
- [ ] All features work on iOS simulator
- [ ] All features work on physical iOS device
- [ ] Date/time pickers work correctly
- [ ] Gestures work correctly
- [ ] Safe area is respected

### Android
- [ ] All features work on Android emulator
- [ ] All features work on physical Android device
- [ ] Date/time pickers work correctly
- [ ] Gestures work correctly
- [ ] Status bar is handled correctly

### Web (if applicable)
- [ ] All features work in web browser
- [ ] Responsive layout works
- [ ] Touch/mouse events work correctly

---

## 🔄 Integration Testing

### With Orders Module
- [ ] Order notification navigates to order detail
- [ ] Order notification shows correct order info
- [ ] Tapping "View Order" opens order screen

### With Products Module
- [ ] Product notification navigates to product detail
- [ ] Product notification shows correct product info
- [ ] Tapping "View Product" opens product screen

### With Team Module
- [ ] Team notification navigates to team detail
- [ ] Team notification shows correct team info
- [ ] Tapping "View Team" opens team screen

### With Cashback Module
- [ ] Cashback notification navigates to cashback detail
- [ ] Cashback notification shows correct cashback info
- [ ] Tapping "View Cashback" opens cashback screen

---

## 🐛 Bug Fixes Verified

- [ ] Notification count updates correctly
- [ ] Toast doesn't show duplicate notifications
- [ ] Marking as read doesn't cause race condition
- [ ] Delete doesn't cause query errors
- [ ] Socket reconnect works properly
- [ ] Optimistic updates rollback on error
- [ ] Query cache is invalidated correctly

---

## ✅ Final Verification

- [ ] All screens are accessible
- [ ] All features work as expected
- [ ] No console errors or warnings
- [ ] No memory leaks
- [ ] Performance is acceptable
- [ ] Real-time updates work reliably
- [ ] Permissions are enforced correctly
- [ ] Error handling is comprehensive
- [ ] Loading states are smooth
- [ ] Empty states are informative

---

## 📝 Notes

**Issues Found:**
- _List any issues discovered during testing_

**Performance Observations:**
- _Note any performance concerns_

**Suggestions:**
- _Any improvements or suggestions_

---

**Tested By:** _______________
**Date:** _______________
**Platform:** iOS / Android / Web
**Build Version:** _______________
