#!/usr/bin/env node

// ============================================
// CREATE ADMIN USER SCRIPT
// Run this to create the first admin account
// Usage: node create-admin.js
// ============================================

import bcrypt from 'bcryptjs';
import readline from 'readline';

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
  console.log('=================================================\n');

  try {
    // Get admin details
    const username = await question('Enter admin username (default: admin): ') || 'admin';
    const email = await question('Enter admin email (default: admin@honeypot.local): ') || 'admin@honeypot.local';
    
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

    // Create admin user object
    const adminUser = {
      id: Date.now().toString(),
      username: username,
      email: email,
      password: hashedPassword,
      role: 'admin',
      approved: true,
      createdAt: new Date().toISOString()
    };

    console.log('\n✅ Admin user created successfully!\n');
    console.log('=================================================');
    console.log('Admin User Details:');
    console.log('=================================================');
    console.log(`Username: ${adminUser.username}`);
    console.log(`Email: ${adminUser.email}`);
    console.log(`Role: ${adminUser.role}`);
    console.log(`Approved: ${adminUser.approved}`);
    console.log('=================================================\n');

    console.log('📋 COPY THIS TO YOUR auth.js FILE:\n');
    console.log('In auth.js, find this line:');
    console.log('  let users = [');
    console.log('\nReplace it with:\n');
    console.log('let users = [');
    console.log(JSON.stringify(adminUser, null, 2));
    console.log('];\n');

    console.log('=================================================');
    console.log('📝 SAVE THESE CREDENTIALS:');
    console.log('=================================================');
    console.log(`Username: ${username}`);
    console.log(`Password: ${password}`);
    console.log('=================================================');
    console.log('\n⚠️  IMPORTANT: Keep these credentials secure!\n');
    console.log('🔐 You can login with these credentials after adding the user to auth.js\n');

  } catch (error) {
    console.error('\n❌ Error creating admin user:', error.message);
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