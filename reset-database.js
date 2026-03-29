require('./config/loadEnv')
const mongoose = require('mongoose')
const connectDB = require('./config/db')

// Import all models
const User = require('./models/User')
const College = require('./models/College')

async function resetDatabase() {
  try {
    if (process.env.NODE_ENV !== 'development') {
      console.error('Database reset is only allowed in development mode.')
      process.exit(1)
    }

    console.log('Connecting to database...')
    await connectDB(process.env.MONGO_URI)
    
    console.log('Clearing all collections...')
    
    await User.deleteMany({})
    console.log('✓ Users cleared')
    
    await College.deleteMany({})
    console.log('✓ Colleges cleared')
    
    console.log('\n🎉 Database has been completely reset!')
    console.log('All users and colleges have been removed.')
    console.log('The website is now fresh and ready for new users.')
    
  } catch (error) {
    console.error('Error resetting database:', error)
  } finally {
    await mongoose.disconnect()
    console.log('Database connection closed.')
  }
}

// Run the reset
resetDatabase()
