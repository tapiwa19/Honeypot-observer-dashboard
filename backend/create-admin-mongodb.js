#!/usr/bin/env node

// ============================================
// CREATE ADMIN USER SCRIPT - MongoDB Version
// Run this to create the first admin account in MongoDB
// Usage: node create-admin-mongodb.js
// ============================================

import bcrypt from 'bcryptjs';
import readline from 'readline';
import mongoose from 'mongoose';
import User from './models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function createAdmin() {
  console.log('\n=================================================');
  console.log('  🛡️  Honeypot Observer - Create Admin User');
  console.log('  📦 MongoDB Version');
  console.log('=================================================\n');

  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/honeypot';
    console.log(`🔌 Connecting to MongoDB: ${mongoUri}`);
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Get admin details
    const username = await question('Enter admin username (default: admin): ') || 'admin';
    const email = await question('Enter admin email (default: admin@honeypot.local): ') || 'admin@honeypot.local';
    
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ username }, { email }] 
    });
    
    if (existingUser) {
      console.log(`\n⚠️  User already exists: ${existingUser.username}`);
      const overwrite = await question('Do you want to delete and recreate? (yes/no): ');
      
      if (overwrite.toLowerCase() === 'yes') {
        await User.deleteOne({ _id: existingUser._id });
        console.log('✅ Existing user deleted\n');
      } else {
        console.log('❌ Cancelled. Exiting...');
        await mongoose.disconnect();
        rl.close();
        process.exit(0);
      }
    }
    
    // Get password with confirmation
    let password = '';
    let confirmPassword = '';
    
    do {
      password = await question('Enter admin password (min 8 characters): ');
      if (password.length < 8) {
        console.log('❌ Password must be at least 8 characters long\n');
        continue;
      }
      
      confirmPassword = await question('Confirm password: ');
      
      if (password !== confirmPassword) {
        console.log('❌ Passwords do not match. Please try again.\n');
      }
    } while (password !== confirmPassword || password.length < 8);

    // Hash password
    console.log('\n⏳ Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user in MongoDB
    console.log('💾 Saving admin user to MongoDB...');
    
    const adminUser = new User({
      username: username,
      email: email,
      password: hashedPassword,
      role: 'admin',
      approved: true
    });

    await adminUser.save();

    console.log('\n✅ Admin user created successfully!\n');
    console.log('=================================================');
    console.log('Admin User Details:');
    console.log('=================================================');
    console.log(`ID: ${adminUser._id}`);
    console.log(`Username: ${adminUser.username}`);
    console.log(`Email: ${adminUser.email}`);
    console.log(`Role: ${adminUser.role}`);
    console.log(`Approved: ${adminUser.approved}`);
    console.log('=================================================\n');

    console.log('📝 SAVE THESE CREDENTIALS:');
    console.log('=================================================');
    console.log(`Username: ${username}`);
    console.log(`Password: ${password}`);
    console.log('=================================================');
    console.log('\n⚠️  IMPORTANT: Keep these credentials secure!');
    console.log('🔐 You can now login with these credentials!\n');

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB\n');

  } catch (error) {
    console.error('\n❌ Error creating admin user:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the script
createAdmin().then(() => {
  console.log('✨ Done!\n');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});