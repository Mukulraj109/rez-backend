# DEPLOYMENT GUIDE
## Rez Merchant App - Production Deployment

**Version:** 1.0.0
**Last Updated:** 2025-11-17
**Estimated Time:** 4-6 hours (first deployment)

---

## TABLE OF CONTENTS

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Build Configuration](#build-configuration)
4. [iOS Deployment](#ios-deployment)
5. [Android Deployment](#android-deployment)
6. [Web Deployment](#web-deployment)
7. [Post-Deployment](#post-deployment)
8. [Rollback Procedure](#rollback-procedure)
9. [Monitoring](#monitoring)
10. [Troubleshooting](#troubleshooting)

---

## PREREQUISITES

### Required Accounts
- [ ] Apple Developer Account ($99/year) - for iOS
- [ ] Google Play Developer Account ($25 one-time) - for Android
- [ ] Expo Account (free) - for builds
- [ ] Domain and hosting (if deploying web version)
- [ ] Backend API deployed and accessible

### Required Software
```bash
Node.js >= 18.0.0
npm >= 9.0.0
Expo CLI >= 6.0.0
EAS CLI >= 3.0.0 (for production builds)
```

### Installation
```bash
# Install Expo CLI globally
npm install -g expo-cli

# Install EAS CLI globally
npm install -g eas-cli

# Verify installations
expo --version
eas --version
```

---

## ENVIRONMENT SETUP

### 1. Clone Repository
```bash
git clone https://github.com/rez-platform/merchant-app.git
cd merchant-app
npm install
```

### 2. Configure Environment Variables

Create `.env.production` file:
```bash
cp .env.example .env.production
```

Edit `.env.production` with production values:
```env
# PRODUCTION CONFIGURATION
NODE_ENV=production
APP_ENV=production
EXPO_DEBUG=false

# API Endpoints
EXPO_PUBLIC_API_BASE_URL=https://api.rezmerchant.com/api/v1
SOCKET_URL=wss://api.rezmerchant.com

# Security
SENTRY_DSN=your_production_sentry_dsn
SENTRY_ENABLED=true

# Analytics
ANALYTICS_ENABLED=true
GOOGLE_ANALYTICS_ID=UA-XXXXXXXXX-X

# Features
ENABLE_DEV_MENU=false
ENABLE_API_LOGGING=false
DEBUG_MODE=false
LOG_LEVEL=error

# Performance
ENABLE_PERFORMANCE_MONITORING=true
ENABLE_SSL_PINNING=true
ENABLE_ROOT_DETECTION=true
```

### 3. Update app.json for Production

Ensure these are set correctly:
```json
{
  "expo": {
    "name": "Rez Merchant",
    "slug": "rez-merchant-app",
    "version": "1.0.0",
    "owner": "your-expo-username",
    "ios": {
      "bundleIdentifier": "com.rez.merchant",
      "buildNumber": "1"
    },
    "android": {
      "package": "com.rez.merchant",
      "versionCode": 1
    }
  }
}
```

---

## BUILD CONFIGURATION

### 1. Initialize EAS Build

```bash
# Login to Expo
eas login

# Initialize EAS configuration
eas build:configure
```

This creates `eas.json`:
```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "production": {
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### 2. Configure Secrets

Store sensitive keys in EAS Secrets (never in code):
```bash
# Add Sentry DSN
eas secret:create --scope project --name SENTRY_DSN --value your_sentry_dsn

# Add other secrets as needed
eas secret:create --scope project --name API_SECRET_KEY --value your_secret
```

---

## IOS DEPLOYMENT

### Phase 1: Prepare for App Store

#### 1. Apple Developer Setup
1. Go to [Apple Developer](https://developer.apple.com)
2. Create App ID: `com.rez.merchant`
3. Create provisioning profiles (Development, Distribution)
4. Create App Store Connect app listing

#### 2. App Store Connect Setup
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Create new app:
   - Name: "Rez Merchant"
   - Bundle ID: `com.rez.merchant`
   - SKU: `rez-merchant-1`
3. Fill in app information:
   - Category: Business
   - Subcategory: Business Management
   - Age Rating: 4+
   - Copyright: © 2025 Rez Platform

#### 3. App Metadata
Prepare the following:
- **App Description** (4000 chars max)
- **Keywords** (100 chars max): merchant, business, inventory, orders, analytics
- **Support URL**: https://help.rezmerchant.com
- **Marketing URL**: https://rezmerchant.com
- **Privacy Policy URL**: https://rezmerchant.com/privacy

#### 4. Screenshots (Required Sizes)
- 6.5" Display (iPhone 14 Pro Max): 1284 x 2778 pixels
- 5.5" Display (iPhone 8 Plus): 1242 x 2208 pixels
- iPad Pro (12.9"): 2048 x 2732 pixels

Minimum 3 screenshots per size.

### Phase 2: Build for iOS

```bash
# Build for iOS
eas build --platform ios --profile production

# This will:
# 1. Upload your code to EAS servers
# 2. Build the iOS binary
# 3. Generate IPA file
# 4. Take 15-30 minutes
```

### Phase 3: Submit to App Store

#### Option A: Automatic Submission
```bash
# Submit directly from command line
eas submit --platform ios --latest
```

#### Option B: Manual Submission
1. Download IPA from EAS dashboard
2. Upload to App Store Connect via Transporter app
3. Fill in build information
4. Submit for review

### Phase 4: App Review
- Average review time: 24-48 hours
- Check email for status updates
- Respond to any questions from Apple reviewers

### Phase 5: Release
Once approved:
1. Go to App Store Connect
2. Select "Release this version"
3. App goes live within 24 hours

---

## ANDROID DEPLOYMENT

### Phase 1: Prepare for Play Store

#### 1. Google Play Console Setup
1. Go to [Google Play Console](https://play.google.com/console)
2. Create new app:
   - App name: "Rez Merchant"
   - Default language: English (US)
   - App or game: App
   - Free or paid: Free

#### 2. App Content
Fill in required information:
- **Privacy Policy URL**: https://rezmerchant.com/privacy
- **App Category**: Business
- **Target audience**: 18+
- **Content rating**: Everyone

#### 3. Store Listing
- **Short description** (80 chars max)
- **Full description** (4000 chars max)
- **App icon**: 512 x 512 pixels (PNG)
- **Feature graphic**: 1024 x 500 pixels

#### 4. Screenshots (Required Sizes)
- Phone: At least 2 screenshots (min 320px, max 3840px)
- 7" Tablet: Optional
- 10" Tablet: Optional

### Phase 2: Generate Signing Key

```bash
# Generate upload keystore (KEEP THIS SECURE!)
keytool -genkeypair -v -storetype PKCS12 \
  -keystore upload-keystore.jks \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias upload \
  -storepass YOUR_SECURE_PASSWORD \
  -keypass YOUR_SECURE_PASSWORD \
  -dname "CN=Rez Merchant, OU=Mobile, O=Rez Platform, L=New York, ST=NY, C=US"

# IMPORTANT: Back up this file securely!
# Store password in password manager
```

Configure in `eas.json`:
```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

### Phase 3: Build for Android

```bash
# Build for Android
eas build --platform android --profile production

# This will:
# 1. Upload your code to EAS servers
# 2. Build the Android App Bundle (AAB)
# 3. Take 10-20 minutes
```

### Phase 4: Submit to Play Store

#### Option A: Automatic Submission
```bash
# Submit directly from command line
eas submit --platform android --latest
```

#### Option B: Manual Submission
1. Download AAB from EAS dashboard
2. Go to Play Console > Production track
3. Create new release
4. Upload AAB file
5. Fill in release notes
6. Submit for review

### Phase 5: App Review
- Average review time: 2-7 days (usually faster than iOS)
- Check email for status updates
- Respond to any policy violations

### Phase 6: Release
Once approved:
1. Roll out to percentage (e.g., 10%, 50%, 100%)
2. Monitor crash reports
3. Increase rollout percentage gradually

---

## WEB DEPLOYMENT

### Option 1: Static Hosting (Netlify/Vercel)

#### Build for Web
```bash
# Build web version
npx expo export:web

# This creates web-build/ directory
```

#### Deploy to Netlify
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=web-build
```

#### Deploy to Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

### Option 2: Custom Server (nginx)

#### Build
```bash
npx expo export:web
```

#### nginx Configuration
```nginx
server {
    listen 80;
    server_name merchant.rezmerchant.com;
    root /var/www/merchant-app/web-build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### Deploy
```bash
# Copy files to server
scp -r web-build/* user@server:/var/www/merchant-app/

# Restart nginx
sudo systemctl restart nginx
```

---

## POST-DEPLOYMENT

### 1. Verify Deployment

#### iOS
```bash
# Check app in TestFlight first
# Then verify in App Store after approval
```

#### Android
```bash
# Check in Internal Testing track first
# Then verify in Play Store after approval
```

#### Web
```bash
# Visit your web app URL
# Test all major features
```

### 2. Enable Monitoring

#### Sentry Setup
```bash
# Install Sentry CLI
npm install -g @sentry/cli

# Create release
sentry-cli releases new rez-merchant@1.0.0
sentry-cli releases set-commits rez-merchant@1.0.0 --auto
sentry-cli releases finalize rez-merchant@1.0.0
```

#### Analytics Setup
- Verify Google Analytics is receiving events
- Check Mixpanel dashboard
- Monitor user engagement

### 3. Update Documentation
- [ ] Update README with app store links
- [ ] Add badges to README
- [ ] Update support documentation
- [ ] Create release notes

### 4. Announce Launch
- [ ] Email existing beta users
- [ ] Social media announcement
- [ ] Update website with app store badges
- [ ] Press release (if applicable)

---

## ROLLBACK PROCEDURE

### iOS Rollback
1. Go to App Store Connect
2. Select previous version
3. Submit for review (can take 24-48 hours)

**OR**

Deactivate current version (pulls from store immediately, but users keep installed version)

### Android Rollback
1. Go to Play Console
2. Production track > Releases
3. Halt rollout immediately
4. Create new release with previous version
5. Submit for review (usually faster than iOS)

**OR**

Reduce rollout percentage to 0% (immediate)

### Web Rollback
```bash
# If using git-based deployment (Netlify/Vercel)
git revert HEAD
git push origin main

# If using custom server
# Re-deploy previous web-build/ directory
```

---

## MONITORING

### Key Metrics to Monitor

#### Health Metrics
- Crash-free rate (target: >99.5%)
- App startup time (target: <3s)
- API response time (target: <500ms)
- Network errors

#### Business Metrics
- Daily Active Users (DAU)
- Monthly Active Users (MAU)
- User retention rate
- Feature adoption rate
- Session duration

### Monitoring Tools

#### Sentry (Errors & Performance)
```javascript
// Already configured in app/_layout.tsx
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: 'production',
  tracesSampleRate: 1.0,
});
```

#### Google Analytics
```javascript
// Track screen views
Analytics.logEvent('screen_view', {
  screen_name: 'Products',
  screen_class: 'ProductsScreen',
});
```

#### Custom Alerts
Set up alerts for:
- Crash rate > 1%
- API error rate > 5%
- Server response time > 1s
- User sign-ups drop

---

## TROUBLESHOOTING

### Common Issues

#### Build Fails
```bash
# Clear cache and retry
expo start --clear
rm -rf node_modules
npm install
eas build --clear-cache --platform [ios/android]
```

#### iOS Provisioning Errors
```bash
# Re-sync provisioning profiles
eas credentials
# Select "Sync provisioning profile"
```

#### Android Keystore Issues
```bash
# Verify keystore
keytool -list -v -keystore upload-keystore.jks
```

#### App Crashes on Launch
1. Check Sentry for crash logs
2. Verify environment variables
3. Test API connectivity
4. Check for missing native modules

#### Web Build Errors
```bash
# Update Expo web
npm install expo@latest expo-web@latest
npx expo install --fix

# Rebuild
npx expo export:web
```

---

## DEPLOYMENT CHECKLIST

### Pre-Deployment
- [ ] All features tested
- [ ] No critical bugs
- [ ] Performance metrics met
- [ ] Security audit passed
- [ ] Environment variables configured
- [ ] Analytics configured
- [ ] Error tracking configured
- [ ] Backend API tested

### iOS Specific
- [ ] Apple Developer account active
- [ ] App Store Connect app created
- [ ] Screenshots prepared (all sizes)
- [ ] App metadata filled
- [ ] Privacy policy URL set
- [ ] Support URL set

### Android Specific
- [ ] Google Play Console account active
- [ ] Play Store listing created
- [ ] Screenshots prepared
- [ ] App content filled
- [ ] Signing key generated and backed up
- [ ] Privacy policy URL set

### Post-Deployment
- [ ] Monitor crash reports (first 24 hours)
- [ ] Monitor user reviews
- [ ] Check analytics dashboard
- [ ] Verify all features work in production
- [ ] Update documentation
- [ ] Announce launch

---

## SUPPORT & RESOURCES

### Documentation
- [Expo Documentation](https://docs.expo.dev)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Play Store Policies](https://play.google.com/about/developer-content-policy/)

### Community
- [Expo Forums](https://forums.expo.dev)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/expo)
- [Discord](https://chat.expo.dev)

### Contact
- Email: support@rezmerchant.com
- Documentation: https://docs.rezmerchant.com

---

**Deployment Time Estimates:**

| Platform | First Time | Subsequent |
|----------|-----------|------------|
| iOS | 4-6 hours + 24-48h review | 30 min + 24-48h review |
| Android | 3-4 hours + 2-7 days review | 20 min + 2-7 days review |
| Web | 30-60 minutes | 10 minutes |

**Good luck with your deployment!** 🚀
