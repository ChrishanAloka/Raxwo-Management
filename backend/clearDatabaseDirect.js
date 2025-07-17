const { MongoClient } = require('mongodb');
require('dotenv').config();

async function clearAllDataDirect() {
  let client;
  
  try {
    console.log('🔄 Starting direct database cleanup...');
    
    // Connect directly to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://marcketDB:echb0TZg1OvloBJE@mandg.iyvr5.mongodb.net/?retryWrites=true&w=majority&appName=MandG';
    console.log('�� Connecting to:', mongoUri);
    
    client = new MongoClient(mongoUri);
    await client.connect();
    console.log('✅ Connected to database');

    const db = client.db();
    
    // Get all collections
    const collections = await db.listCollections().toArray();
    console.log('📋 Found collections:', collections.map(c => c.name));

    // Clear each collection
    for (const collection of collections) {
      try {
        const result = await db.collection(collection.name).deleteMany({});
        console.log(`✅ Cleared ${result.deletedCount} records from ${collection.name}`);
      } catch (error) {
        console.log(`❌ Error clearing ${collection.name}: ${error.message}`);
      }
    }

    console.log('🎉 Database cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during database cleanup:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Database connection closed');
    }
    process.exit(0);
  }
}

console.log('⚠️  WARNING: This will delete ALL data from your database!');
console.log('�� This action cannot be undone!');
console.log('');

clearAllDataDirect(); 