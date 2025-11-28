# Onboarding Screens - Quick Start Guide

## 🚀 What Was Created

Three complete onboarding screens for the merchant app:

1. **Documents Upload** (`app/onboarding/documents.tsx`)
2. **Review & Submit** (`app/onboarding/review-submit.tsx`)
3. **Pending Approval** (`app/onboarding/pending-approval.tsx`)

## 📋 Quick Overview

### Step 4: Documents Upload
- Upload 7 types of documents (PAN, Aadhar, GST, etc.)
- Real-time progress bars (0-100%)
- Preview and delete uploaded documents
- Required vs optional document indicators
- Upload statistics dashboard

### Step 5: Review & Submit
- Review all entered information
- Edit any section before submitting
- Agree to Terms, Privacy, and Data Processing
- Security disclaimer
- Final submission confirmation

### Post-Submission: Pending Approval
- Success celebration with animations
- 5-stage verification timeline
- Application ID display
- Expected completion date
- Contact support options
- Return to login

## 🎯 Key Features

### Documents Screen
```typescript
// 7 Document Types
- PAN Card (Required) ✓
- Aadhar Card (Required) ✓
- GST Certificate
- Bank Statement
- Business License
- Utility Bill
- Other Documents

// Features
✅ Image picker integration
✅ Upload progress tracking
✅ Delete documents
✅ Replace documents
✅ Verification status badges
```

### Review & Submit Screen
```typescript
// Sections Reviewed
1. Business Information
2. Store Details
3. Bank Details
4. Uploaded Documents

// Legal Agreements
✅ Terms & Conditions (Required)
✅ Privacy Policy (Required)
✅ Data Processing (Required)
✅ Communication Consent (Optional)
```

### Pending Approval Screen
```typescript
// Timeline Stages
1. Application Submitted ✓
2. Document Verification (Current)
3. Business Verification
4. Account Setup
5. Approval & Activation

// Support Options
📧 Email Support
📞 Phone Support
❓ Help Center
```

## 🔧 Installation

All dependencies should already be installed. If not:

```bash
npm install expo-image-picker expo-linear-gradient react-native-animatable
```

## 📱 Testing the Screens

### 1. Test Documents Upload
```bash
# Navigate from any screen
router.push('/onboarding/documents');
```

**Test Cases:**
- ✅ Upload PAN card
- ✅ Upload Aadhar card
- ✅ Delete a document
- ✅ Replace a document
- ✅ Check progress bar
- ✅ Try to continue without required docs (should fail)
- ✅ Continue with all required docs

### 2. Test Review & Submit
```bash
router.push('/onboarding/review-submit');
```

**Test Cases:**
- ✅ View all sections
- ✅ Click edit button
- ✅ Check/uncheck terms
- ✅ Try submit without agreeing (should fail)
- ✅ Submit with all checkboxes

### 3. Test Pending Approval
```bash
router.push('/onboarding/pending-approval');
```

**Test Cases:**
- ✅ Animations play
- ✅ Application ID shows
- ✅ Timeline displays
- ✅ Click email support
- ✅ Click phone support
- ✅ Return to login

## 🎨 UI Highlights

### Colors Used
```typescript
Primary:   #3B82F6 (Blue)
Success:   #10B981 (Green)
Error:     #EF4444 (Red)
Warning:   #F59E0B (Yellow)
Background: #F9FAFB (Light Gray)
```

### Component Patterns
- 📦 Card-based layouts
- 🎯 Icon-driven UI
- 📊 Progress indicators
- ✅ Status badges
- 🔘 Custom checkboxes
- 📱 Responsive design

## 🔌 API Integration

All screens are fully integrated with:

```typescript
// Services Used
import { onboardingService } from '../../services/api/onboarding';

// Key Methods
onboardingService.getDocuments()
onboardingService.uploadDocument(type, uri, expiry, onProgress)
onboardingService.deleteDocument(index)
onboardingService.getOnboardingStatus()
onboardingService.submitCompleteOnboarding(...)
```

## 📝 Validation Rules

### Documents Screen
- ✅ PAN Card must be uploaded
- ✅ Aadhar Card must be uploaded
- ⚠️ Optional documents can be skipped

### Review & Submit Screen
- ✅ Terms & Conditions must be checked
- ✅ Privacy Policy must be checked
- ✅ Data Processing must be checked
- ⚠️ Communication consent is optional

## 🎬 User Flow

```
Step 1: Business Info
    ↓
Step 2: Store Details
    ↓
Step 3: Bank Details
    ↓
Step 4: Documents Upload ← NEW
    ↓
Step 5: Review & Submit ← NEW
    ↓
Pending Approval ← NEW
    ↓
Login Screen
```

## 🐛 Common Issues & Fixes

### Issue: "Permission denied" when picking image
```typescript
// Solution: Run in simulator/device, not web
// Web doesn't support native image picker
```

### Issue: Submit button stays disabled
```typescript
// Solution: Check all required items:
1. All required documents uploaded
2. All required checkboxes checked
```

### Issue: Navigation not working
```typescript
// Solution: Ensure Expo Router is set up:
// app/_layout.tsx should have Stack navigator
```

## 📦 File Structure

```
app/onboarding/
├── documents.tsx          (Step 4 - New)
├── review-submit.tsx      (Step 5 - New)
├── pending-approval.tsx   (Post-submit - New)
├── business-info.tsx      (Step 1 - Existing)
├── store-details.tsx      (Step 2 - Existing)
└── bank-details.tsx       (Step 3 - Existing)
```

## 🎯 Success Criteria

Your implementation is successful if:

### Documents Screen
- [ ] Can pick images from library
- [ ] Upload progress shows 0-100%
- [ ] Can delete uploaded documents
- [ ] Required badges show correctly
- [ ] Navigation to review works

### Review & Submit Screen
- [ ] All data displays correctly
- [ ] Edit buttons work
- [ ] Checkboxes are functional
- [ ] Submit only works when valid
- [ ] Confirmation dialog appears

### Pending Approval Screen
- [ ] Success animation plays
- [ ] Application ID generates
- [ ] Timeline is visible
- [ ] Support links work
- [ ] Return to login works

## 🚀 Next Steps

1. **Test the complete flow:**
   ```bash
   Start from Step 1 → Complete all 5 steps → See pending approval
   ```

2. **Customize as needed:**
   - Update document types
   - Change support contacts
   - Modify timeline steps
   - Adjust colors/styling

3. **Connect to real backend:**
   - Verify API endpoints
   - Test document uploads
   - Check status updates

4. **Deploy:**
   - Test on iOS device
   - Test on Android device
   - Test on web (limited features)

## 💡 Pro Tips

1. **Testing Uploads:**
   - Use small image files for faster testing
   - Test with different image formats (JPG, PNG)
   - Test upload cancellation

2. **Testing Validation:**
   - Try to skip required documents
   - Try to submit without agreeing to terms
   - Test edit functionality

3. **Testing Navigation:**
   - Test back button on each screen
   - Test device back button
   - Test deep linking to screens

## 📞 Support

If you encounter issues:

1. Check console logs for error messages
2. Verify API endpoints are accessible
3. Ensure all dependencies are installed
4. Review the full implementation guide: `ONBOARDING_SCREENS_IMPLEMENTATION.md`

## ✅ Completion Checklist

- [x] Documents upload screen created
- [x] Review & submit screen created
- [x] Pending approval screen created
- [x] API integration completed
- [x] Error handling implemented
- [x] UI/UX polished
- [x] Documentation written
- [ ] Testing completed
- [ ] Backend connected
- [ ] Ready for production

---

**All 3 screens are ready to use! 🎉**

Navigate to `/onboarding/documents` to start testing!
