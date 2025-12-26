const mongoose = require('mongoose');
const MONGODB_URI = 'mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

// Map offer titles to their exclusiveZone
const zoneMapping = {
  // Student offers
  'Student Tech Discount': 'student',
  'Student Food Festival': 'student',
  'Campus Coffee Deal': 'student',
  'Student Entertainment Pass': 'student',
  'Student Book Store': 'student',

  // Corporate offers
  'Corporate Lunch Deal': 'corporate',
  'Office Supplies Discount': 'corporate',
  'Team Outing Package': 'corporate',
  'Employee Wellness': 'corporate',

  // Women offers
  "Women's Fashion Sale": 'women',
  'Beauty & Skincare': 'women',
  'Spa & Wellness Day': 'women',
  "Women's Safety Essentials": 'women',

  // Defence offers
  'Defence Personnel Special': 'defence',
  'Armed Forces Grocery Deal': 'defence',

  // Healthcare offers
  'Healthcare Heroes Discount': 'healthcare',
  'Night Shift Special': 'healthcare',

  // Senior offers
  'Senior Citizen Special': 'senior',
  'Senior Grocery Savings': 'senior',
};

const eligibilityMapping = {
  'student': 'Valid student ID required',
  'corporate': 'Corporate email verification required',
  'women': 'Women users only',
  'defence': 'Valid Military ID required',
  'healthcare': 'Valid Hospital ID required',
  'senior': 'Age 60+ verification required',
};

async function fix() {
  await mongoose.connect(MONGODB_URI, { dbName: 'test' });
  console.log('Connected to MongoDB');

  const offers = mongoose.connection.db.collection('offers');

  for (const [title, zone] of Object.entries(zoneMapping)) {
    const result = await offers.updateOne(
      { title },
      {
        $set: {
          exclusiveZone: zone,
          eligibilityRequirement: eligibilityMapping[zone]
        }
      }
    );
    if (result.matchedCount > 0) {
      console.log(`Updated: ${title} -> ${zone}`);
    }
  }

  // Verify
  const count = await offers.countDocuments({ exclusiveZone: { $exists: true, $ne: null } });
  console.log(`\nTotal offers with exclusiveZone: ${count}`);

  // Show by zone
  for (const zone of ['student', 'corporate', 'women', 'defence', 'healthcare', 'senior']) {
    const zoneCount = await offers.countDocuments({ exclusiveZone: zone });
    console.log(`  ${zone}: ${zoneCount}`);
  }

  await mongoose.disconnect();
}

fix().catch(console.error);
