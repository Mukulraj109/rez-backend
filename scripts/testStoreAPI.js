const axios = require('axios');

const BACKEND_URL = 'http://localhost:5000';
const STORE_ID = '68ee29d08c4fa11015d7034a'; // TechMart Electronics

async function testStoreAPI() {
  try {
    console.log('🔍 Testing Store API...\n');
    console.log(`📡 GET ${BACKEND_URL}/api/stores/${STORE_ID}\n`);

    const response = await axios.get(`${BACKEND_URL}/api/stores/${STORE_ID}`);

    if (response.data.success) {
      const { store, products, productsCount } = response.data.data;

      console.log('✅ API Response Successful\n');
      console.log('📊 Store Data:');
      console.log('  Name:', store.name);
      console.log('  Description:', store.description ? '✅' : '❌');
      console.log('  Banner:', store.banner ? '✅' : '❌');
      console.log('  Logo:', store.logo ? '✅' : '❌');
      console.log('  Rating:', store.ratings?.average || 0);
      console.log('  Reviews:', store.ratings?.count || 0);
      console.log('  Cashback:', store.offers?.cashback ? `${store.offers.cashback}%` : '❌');
      console.log('  Products Count:', productsCount);
      console.log('');

      console.log('🎥 Videos in API Response:\n');
      if (store.videos && store.videos.length > 0) {
        store.videos.forEach((video, index) => {
          console.log(`Video ${index + 1}:`);
          console.log('  URL:', video.url);
          console.log('  Thumbnail:', video.thumbnail);
          console.log('  Title:', video.title);
          console.log('  Duration:', video.duration, 'seconds');
          console.log('');
        });
        console.log(`✅ Total: ${store.videos.length} videos returned by API`);
      } else {
        console.log('❌ No videos in API response');
      }

      console.log('\n📦 Sample Product:');
      if (products && products.length > 0) {
        console.log('  Name:', products[0].name);
        console.log('  Price:', products[0].pricing?.selling || products[0].price?.current || 0);
      }

      console.log('\n✅ API Test Complete');
      console.log('\n🎯 Frontend Integration:');
      console.log('  Store URL: /MainStorePage?storeId=' + STORE_ID);
      console.log('  Videos will appear in UGC section');

    } else {
      console.log('❌ API returned error:', response.data.message);
    }

  } catch (err) {
    console.error('❌ API Error:', err.message);
    if (err.response) {
      console.error('Response status:', err.response.status);
      console.error('Response data:', err.response.data);
    } else {
      console.error('Make sure backend is running: npm run dev');
    }
  }
}

testStoreAPI();
