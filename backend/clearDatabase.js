const mongoose = require('mongoose');
require('dotenv').config();

async function clearAllData() {
  try {
    console.log('🔄 Starting database cleanup...');
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://marcketDB:echb0TZg1OvloBJE@mandg.iyvr5.mongodb.net/?retryWrites=true&w=majority&appName=MandG';
    console.log(' Connecting to:', mongoUri);
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to database');

    // Get all collections from the database
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📋 Found collections:', collections.map(c => c.name));

    // Clear each collection
    for (const collection of collections) {
      try {
        const result = await mongoose.connection.db.collection(collection.name).deleteMany({});
        console.log(`✅ Cleared ${result.deletedCount} records from ${collection.name}`);
      } catch (error) {
        console.log(`❌ Error clearing ${collection.name}: ${error.message}`);
      }
    }

    console.log('🎉 Database cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during database cleanup:', error);
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

// Add a confirmation prompt
console.log('⚠️  WARNING: This will delete ALL data from your database!');
console.log('📋 This script will clear ALL collections found in your database.');
console.log('');
console.log(' This action cannot be undone!');
console.log('');

// Execute the cleanup
clearAllData(); 