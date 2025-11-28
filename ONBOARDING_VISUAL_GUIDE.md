# Onboarding Screens - Visual Guide

## 📱 Screen Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    ONBOARDING WIZARD                        │
└─────────────────────────────────────────────────────────────┘

Step 1: Business Information
┌─────────────────────────────────┐
│  📊 Business Info               │
│  ────────────────────           │
│  • Business Name                │
│  • Owner Details                │
│  • Business Type                │
│  • Years in Business            │
└─────────────────────────────────┘
            ↓
Step 2: Store Details
┌─────────────────────────────────┐
│  🏪 Store Details               │
│  ────────────────────           │
│  • Store Name                   │
│  • Store Type                   │
│  • Address                      │
│  • Operating Hours              │
└─────────────────────────────────┘
            ↓
Step 3: Bank Details
┌─────────────────────────────────┐
│  💳 Bank Details                │
│  ────────────────────           │
│  • Account Information          │
│  • IFSC Code                    │
│  • PAN Number                   │
│  • GST Number                   │
└─────────────────────────────────┘
            ↓
Step 4: Documents Upload ⭐ NEW
┌─────────────────────────────────┐
│  📄 Upload Documents            │
│  ────────────────────           │
│  ✓ PAN Card (Required)          │
│  ✓ Aadhar (Required)            │
│  ○ GST Certificate              │
│  ○ Bank Statement               │
│  ○ Business License             │
│  ○ Utility Bill                 │
│  ○ Other Documents              │
│                                 │
│  [Upload Progress: ███░░░ 60%] │
└─────────────────────────────────┘
            ↓
Step 5: Review & Submit ⭐ NEW
┌─────────────────────────────────┐
│  👀 Review & Submit             │
│  ────────────────────           │
│  📊 Business Information [Edit] │
│  🏪 Store Details       [Edit] │
│  💳 Bank Details        [Edit] │
│  📄 Documents           [Edit] │
│                                 │
│  Legal Agreements:              │
│  ☑ Terms & Conditions          │
│  ☑ Privacy Policy              │
│  ☑ Data Processing             │
│                                 │
│  [Submit Application]           │
└─────────────────────────────────┘
            ↓
Pending Approval ⭐ NEW
┌─────────────────────────────────┐
│      ✅                         │
│   SUCCESS!                      │
│                                 │
│  Application ID: #ABC12345      │
│                                 │
│  Timeline:                      │
│  ✓ Application Submitted        │
│  ● Document Verification        │
│  ○ Business Verification        │
│  ○ Account Setup                │
│  ○ Approval                     │
│                                 │
│  [Return to Login]              │
└─────────────────────────────────┘
```

## 🎨 Documents Screen Layout

```
┌──────────────────────────────────────────────┐
│ ← Step 4 of 5                                │
│   Upload Documents                           │
│ ████████████████████░░░░ 80%                │
├──────────────────────────────────────────────┤
│                                              │
│  Please upload the following documents       │
│                                              │
│  ℹ️  All documents will be securely stored  │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ 🆔  PAN Card *Required                 │ │
│  │     Business or individual PAN card    │ │
│  │                                        │ │
│  │     ✓ Uploaded    [🔄] [🗑️]           │ │
│  │     Status: Verified                   │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ 🪪  Aadhar Card *Required              │ │
│  │     Owner's Aadhar card (front & back) │ │
│  │                                        │ │
│  │     [📤 Upload Document]               │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ 📄  GST Certificate                    │ │
│  │     GST registration certificate       │ │
│  │                                        │ │
│  │     Uploading: ████████░░ 80%          │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │  2  Uploaded │ 2  Required │ 7  Total  │ │
│  └────────────────────────────────────────┘ │
│                                              │
├──────────────────────────────────────────────┤
│  [Back]              [Continue →]           │
└──────────────────────────────────────────────┘
```

## 🎨 Review & Submit Screen Layout

```
┌──────────────────────────────────────────────┐
│ ← Step 5 of 5                                │
│   Review & Submit                            │
│ ████████████████████████ 100%               │
├──────────────────────────────────────────────┤
│                                              │
│  Please review all your information          │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ 📊 Business Information        [Edit]  │ │
│  ├────────────────────────────────────────┤ │
│  │ Business Name    Raj Enterprises       │ │
│  │ Owner Name       Mukul Raj             │ │
│  │ Email           raj@example.com        │ │
│  │ Phone           +91-9876543210         │ │
│  │ Business Type    Pvt Ltd               │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ 🏪 Store Details               [Edit]  │ │
│  ├────────────────────────────────────────┤ │
│  │ Store Name       Raj Store             │ │
│  │ Store Type       Both                  │ │
│  │ Address          123 Main St...        │ │
│  │ Phone           +91-9876543210         │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ 💳 Bank Details                [Edit]  │ │
│  ├────────────────────────────────────────┤ │
│  │ Account Holder   Mukul Raj             │ │
│  │ Bank Name        State Bank            │ │
│  │ IFSC Code        SBIN0001234           │ │
│  │ PAN Number       ABCDE1234F            │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ 📄 Uploaded Documents          [Edit]  │ │
│  ├────────────────────────────────────────┤ │
│  │ PAN CARD         Pending verification  │ │
│  │ AADHAR           Verified              │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ Legal Agreements                       │ │
│  ├────────────────────────────────────────┤ │
│  │ ☑ I agree to the Terms & Conditions   │ │
│  │ ☑ I agree to the Privacy Policy       │ │
│  │ ☑ I agree to Data Processing          │ │
│  │ ☑ I consent to communications          │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  🛡️  Your information is secure             │
│                                              │
├──────────────────────────────────────────────┤
│  [Back]        [Submit Application ✓]       │
└──────────────────────────────────────────────┘
```

## 🎨 Pending Approval Screen Layout

```
┌──────────────────────────────────────────────┐
│                                              │
│                    ✅                        │
│                 ╔═══════╗                    │
│                 ║   ✓   ║                    │
│                 ╚═══════╝                    │
│                                              │
│         Application Submitted!               │
│    Thank you for completing your             │
│        merchant onboarding                   │
│                                              │
│      Application ID: #ABC12345               │
│                                              │
├──────────────────────────────────────────────┤
│                                              │
│  What Happens Next?                          │
│  ℹ️  Our team will review your application  │
│                                              │
│  Verification Timeline                       │
│  Expected completion by Dec 31, 2024         │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │  ✓  Application Submitted              │ │
│  │  │  Completed                           │ │
│  │  │                                      │ │
│  │  ●  Document Verification              │ │
│  │  │  1-2 business days                   │ │
│  │  │                                      │ │
│  │  ○  Business Verification              │ │
│  │  │  2-3 business days                   │ │
│  │  │                                      │ │
│  │  ○  Account Setup                      │ │
│  │  │  1 business day                      │ │
│  │  │                                      │ │
│  │  ○  Approval & Activation              │ │
│  │     Instant                             │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  Important Notes                             │
│  ○ You will receive email notifications      │
│  ○ Verification takes 5-7 business days      │
│  ○ We may contact you for more info          │
│  ○ Check application status after login      │
│                                              │
│  Need Help?                                  │
│  Our support team is here to assist         │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ 📧 Email Support                       │ │
│  │    support@rezapp.com              →   │ │
│  └────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────┐ │
│  │ 📞 Phone Support                       │ │
│  │    +91 1800-123-4567               →   │ │
│  └────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────┐ │
│  │ ❓ Help Center                         │ │
│  │    Browse FAQs and guides          →   │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  💡 Pro Tips                                 │
│  • Check your email regularly                │
│  • Keep your phone accessible                │
│  • Save your Application ID                  │
│                                              │
├──────────────────────────────────────────────┤
│         [🔑 Return to Login]                 │
└──────────────────────────────────────────────┘
```

## 🎯 Component Breakdown

### Documents Screen Components

```typescript
1. Header
   - Back button (←)
   - Step indicator (4 of 5)
   - Title (Upload Documents)
   - Progress bar (80%)

2. Document Cards (7 types)
   - Icon (🆔/🪪/📄/etc)
   - Label + Required badge
   - Description
   - Status (Upload/Uploading/Uploaded)
   - Actions (Replace/Delete)

3. Upload Statistics
   - Uploaded count
   - Required count
   - Total count

4. Footer
   - Back button
   - Continue button
```

### Review Screen Components

```typescript
1. Header
   - Back button (←)
   - Step indicator (5 of 5)
   - Title (Review & Submit)
   - Progress bar (100%)

2. Review Sections (4 sections)
   - Section icon + title
   - Edit button
   - Data rows (label: value)

3. Legal Agreements
   - Checkboxes (4 items)
   - Clickable links

4. Footer
   - Back button
   - Submit button
```

### Pending Approval Components

```typescript
1. Success Header (Gradient)
   - Animated checkmark
   - Success message
   - Application ID badge

2. Info Section
   - What happens next
   - Expected date

3. Timeline (5 stages)
   - Stage icons
   - Stage titles
   - Duration labels
   - Connecting lines

4. Notes Section
   - Bullet points
   - Important information

5. Support Section
   - 3 contact cards
   - Clickable actions

6. Tips Section
   - Pro tips list

7. Footer
   - Return to login button
```

## 🎨 Color System

### Status Colors
```
✅ Success:    #10B981 (Green)
⚠️  Warning:    #F59E0B (Yellow)
❌ Error:      #EF4444 (Red)
ℹ️  Info:       #3B82F6 (Blue)
⏳ Pending:    #6B7280 (Gray)
```

### UI Colors
```
Primary:       #3B82F6 (Blue)
Background:    #F9FAFB (Light Gray)
Card:          #FFFFFF (White)
Border:        #E5E7EB (Gray)
Text Primary:  #111827 (Dark)
Text Secondary: #6B7280 (Gray)
```

### Timeline Colors
```
Completed:     #10B981 (Green)
Current:       #3B82F6 (Blue)
Upcoming:      #D1D5DB (Light Gray)
```

## 📏 Spacing System

```
Container:     20px padding
Section Gap:   24-32px
Card Gap:      16px
Element Gap:   8-12px
```

## 🎭 Icons Used

```
Documents Screen:
- card-outline (PAN)
- id-card-outline (Aadhar)
- document-text-outline (GST)
- receipt-outline (Bank Statement)
- briefcase-outline (Business License)
- home-outline (Utility Bill)
- folder-outline (Other)
- cloud-upload-outline (Upload)
- checkmark-circle (Success)
- refresh-outline (Replace)
- trash-outline (Delete)

Review Screen:
- business-outline (Business)
- storefront-outline (Store)
- card-outline (Bank)
- document-text-outline (Documents)
- create-outline (Edit)
- shield-checkmark-outline (Security)

Pending Approval:
- checkmark (Success)
- checkmark-circle (Completed)
- document-text (Document)
- business (Business)
- settings (Setup)
- rocket (Activation)
- mail-outline (Email)
- call-outline (Phone)
- help-circle-outline (Help)
- bulb (Tips)
- log-in-outline (Login)
```

## 📱 Responsive Behavior

All screens are designed to be responsive:

```
Mobile (< 768px):    Single column, full width
Tablet (≥ 768px):    Wider cards, better spacing
Desktop (≥ 1024px):  Maximum width container
```

## ✨ Animations

### Documents Screen
- Card fade-in on load
- Progress bar animation
- Button press feedback

### Review Screen
- Section expand/collapse
- Checkbox toggle animation
- Submit button loading state

### Pending Approval
- Success icon bounce
- Timeline items stagger fade-in
- Card hover effects
- Button press feedback

---

**Visual guide complete! Use this as reference for UI/UX implementation.** 🎨
