// ============================================
// AUTHENTICATION MODULE
// Handles user authentication, JWT tokens, and role-based access
// ============================================
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Router } from 'express';

const router = Router();

// ============================================
// IN-MEMORY USER STORAGE
// Replace with database in production (MongoDB, PostgreSQL, etc.)
// ============================================
let users = [
    {
  "id": "1769717877207",
  "username": "tapiwa",
  "email": "mafuhuretapiwa@gmail.com",
  "password": "$2b$10$wSYyC4pkvUqULxfEvW5XDue6sHSYicqq42D8qpFIymZ4M6HvbLv8a",       
  "role": "admin",
  "approved": true,
  "createdAt": "2026-01-29T20:17:57.207Z"
},

  {
  "id": "1769718799221",
  "username": "tapiwa",
  "email": "mafuhuretapiwa@gmail.com",
  "password": "redstone4042",       
  "role": "admin",
  "approved": true,
  "createdAt": "2026-01-29T20:33:19.221Z"
}

];

// ============================================
// JWT SECRET KEY
// In production, use environment variable!
// ============================================
const JWT_SECRET = process.env.JWT_SECRET || 'honeypot-secret-key-change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// ============================================
// MIDDLEWARE: Authenticate JWT Token
// ============================================
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// ============================================
// MIDDLEWARE: Require Admin Role
// ============================================
export const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// ============================================
// ROUTE: Login
// POST /api/auth/login
// ============================================
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password required' });
    }

    console.log(`🔐 Login attempt for user: ${username}`);

    // Find user
    const user = users.find(u => u.username === username);
    
    if (!user) {
      console.log(`❌ User not found: ${username}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if user is approved
    if (!user.approved) {
      console.log(`⚠️  User not approved: ${username}`);
      return res.status(403).json({ message: 'Account pending approval. Contact administrator.' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      console.log(`❌ Invalid password for user: ${username}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Return user info (without password) and token
    const { password: _, ...userWithoutPassword } = user;
    
    console.log(`✅ Login successful: ${username} (${user.role})`);
    
    res.json({
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ============================================
// ROUTE: Register New User
// POST /api/auth/register
// Creates pending user account (requires admin approval)
// ============================================
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields required' });
    }

    // Validate password length
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    // Check if user exists
    if (users.find(u => u.username === username || u.email === email)) {
      return res.status(409).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user (pending approval)
    const newUser = {
      id: Date.now().toString(),
      username,
      email,
      password: hashedPassword,
      role: 'member',
      approved: false, // Requires admin approval
      createdAt: new Date().toISOString()
    };

    users.push(newUser);

    console.log(`📝 New user registered: ${username} (pending approval)`);

    res.status(201).json({ 
      message: 'Registration successful. Awaiting admin approval.',
      username: newUser.username
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ============================================
// ROUTE: Get Current User Profile
// GET /api/auth/profile
// ============================================
router.get('/profile', authenticateToken, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const { password, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
});

// ============================================
// ROUTE: Get All Pending Users (Admin Only)
// GET /api/auth/pending-users
// ============================================
router.get('/pending-users', authenticateToken, requireAdmin, (req, res) => {
  const pendingUsers = users
    .filter(u => !u.approved)
    .map(({ password, ...user }) => user);
  
  console.log(`📋 Admin viewing ${pendingUsers.length} pending users`);
  res.json(pendingUsers);
});

// ============================================
// ROUTE: Approve User (Admin Only)
// POST /api/auth/approve-user/:userId
// ============================================
router.post('/approve-user/:userId', authenticateToken, requireAdmin, (req, res) => {
  const user = users.find(u => u.id === req.params.userId);
  
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  user.approved = true;
  
  console.log(`✅ User approved: ${user.username} by admin ${req.user.username}`);
  
  res.json({ 
    message: 'User approved successfully',
    user: { id: user.id, username: user.username, email: user.email }
  });
});

// ============================================
// ROUTE: Reject/Delete User (Admin Only)
// DELETE /api/auth/reject-user/:userId
// ============================================
router.delete('/reject-user/:userId', authenticateToken, requireAdmin, (req, res) => {
  const userIndex = users.findIndex(u => u.id === req.params.userId);
  
  if (userIndex === -1) {
    return res.status(404).json({ message: 'User not found' });
  }

  const deletedUser = users.splice(userIndex, 1)[0];
  
  console.log(`❌ User rejected and removed: ${deletedUser.username} by admin ${req.user.username}`);
  
  res.json({ 
    message: 'User rejected and removed',
    username: deletedUser.username
  });
});

// ============================================
// ROUTE: Get All Users (Admin Only)
// GET /api/auth/users
// ============================================
router.get('/users', authenticateToken, requireAdmin, (req, res) => {
  const allUsers = users.map(({ password, ...user }) => user);
  res.json(allUsers);
});

// ============================================
// ROUTE: Update User Role (Admin Only)
// PATCH /api/auth/users/:userId/role
// ============================================
router.patch('/users/:userId/role', authenticateToken, requireAdmin, (req, res) => {
  const { role } = req.body;
  
  if (!['admin', 'member'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }

  const user = users.find(u => u.id === req.params.userId);
  
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Prevent changing own role
  if (user.id === req.user.id) {
    return res.status(400).json({ message: 'Cannot change your own role' });
  }

  const oldRole = user.role;
  user.role = role;
  
  console.log(`🔄 Role changed for ${user.username}: ${oldRole} → ${role} by admin ${req.user.username}`);
  
  const { password, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
});

// ============================================
// ROUTE: Verify Token
// GET /api/auth/verify
// ============================================
router.get('/verify', authenticateToken, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  
  if (!user || !user.approved) {
    return res.status(403).json({ message: 'Access denied' });
  }

  const { password, ...userWithoutPassword } = user;
  res.json({ valid: true, user: userWithoutPassword });
});

// ============================================
// ROUTE: Change Password
// POST /api/auth/change-password
// ============================================
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters long' });
    }

    const user = users.find(u => u.id === req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, user.password);
    
    if (!validPassword) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    console.log(`🔑 Password changed for user: ${user.username}`);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('❌ Change password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ============================================
// EXPORT
// ============================================
export const authRouter = router;

// Export users array so it can be modified by create-admin script
export { users };