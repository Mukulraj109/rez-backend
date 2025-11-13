# Quick Start: Content Creator Users

## Run the Script

### Option 1: Using npm script (Recommended)
```bash
cd user-backend
npm run seed:creators
```

### Option 2: Direct execution
```bash
cd user-backend
ts-node src/scripts/seed-user-creators.ts
```

## What You Get

**19 realistic content creators** across 4 categories:
- 👗 **6 Fashion Influencers** (5F + 1F)
- 💄 **5 Beauty Creators** (all female)
- 🌟 **4 Lifestyle Bloggers** (3M + 1F)
- 📱 **4 Tech Reviewers** (all male)

## Key Stats

| Metric | Value |
|--------|-------|
| Total Users | 19 |
| Premium Users | 8 (42%) |
| Age Range | 22-32 years |
| Cities | 10 major Indian cities |
| Engagement Range | 7.2 - 9.2 |

## User Data Includes

✅ Indian phone numbers (+91XXXXXXXXXX)
✅ Complete profiles with bios
✅ Professional avatars
✅ Location with coordinates
✅ Verified accounts
✅ Realistic wallet balances
✅ Engagement scores & tiers
✅ Interests matching their niche

## Phone Number Format

```
+919012345000  (Index 1000)
+919024690000  (Index 1001)
+919037035000  (Index 1002)
...
```

## Sample Users

### High Engagement (Premium)
1. **Ananya Verma** - Fashion (9.2) - PLATINUM
2. **Karthik Rao** - Tech (9.1) - PLATINUM
3. **Neha Gupta** - Beauty (9.0) - PLATINUM

### Medium Engagement
4. **Rahul Desai** - Lifestyle (8.8) - GOLD
5. **Riya Mehta** - Fashion (8.9) - GOLD

### Entry Level
6. **Aisha Khan** - Beauty (7.2) - STARTER
7. **Aarav Chopra** - Lifestyle (7.4) - STARTER

## Export for Other Scripts

```javascript
import { seedUserCreators } from './seed-user-creators.js';

async function createUGCVideos() {
  // Get all creator users
  const creators = await seedUserCreators();

  // Use creator IDs for video assignment
  creators.forEach(creator => {
    console.log(creator._id, creator.profile.firstName);
  });
}
```

## Query Examples

```javascript
// All creators
db.users.find({ userType: 'creator' })

// Premium creators only
db.users.find({ userType: 'creator', isPremium: true })

// Fashion influencers
db.users.find({
  userType: 'creator',
  interests: 'fashion'
})

// High engagement (>=9.0)
db.users.find({
  userType: 'creator',
  referralTier: { $in: ['PLATINUM'] }
})

// By city
db.users.find({
  userType: 'creator',
  'profile.location.city': 'Mumbai'
})
```

## Next Steps

1. ✅ Run this script first
2. ⏭️ Run `seed-ugc-videos.js` to create videos
3. 🧪 Test with real API calls
4. 📊 Verify in MongoDB Compass

## API Testing

```bash
# Get all users
GET /api/users

# Get creator users
GET /api/users?userType=creator

# Get specific user
GET /api/users/[userId]

# Get user profile
GET /api/users/profile/[userId]
```

## Environment

```env
MONGODB_URI=mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/
DB_NAME=test
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Connection timeout | Check MongoDB Atlas network access |
| Duplicate key error | Users already exist, script will skip |
| Model not found | Script registers model automatically |
| Missing dependencies | Run `npm install mongoose dotenv` |

## Success Indicators

```
✅ [19/19] All users created
📊 Summary shows correct breakdown
💡 Sample user IDs displayed
🔌 Clean disconnect from MongoDB
```

## Time to Complete

- Average: 5-10 seconds
- Depends on network speed to MongoDB Atlas

## Safe to Re-run

✅ **Yes!** Script checks for existing users and skips duplicates.

## Clean Up (Optional)

```javascript
// Remove all creator users
db.users.deleteMany({ userType: 'creator' })

// Remove specific category
db.users.deleteMany({
  userType: 'creator',
  interests: 'fashion'
})
```
