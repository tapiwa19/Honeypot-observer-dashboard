// ============================================
// AUTHENTICATION MODULE - MongoDB Version
// Handles user authentication, JWT tokens, and role-based access
// ============================================
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Router } from 'express';
import User from './models/User.js';

const router = Router();

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

    // Find user in MongoDB
    const user = await User.findOne({ username });
    
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

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Create JWT token
    const token = jwt.sign(
      { 
        id: user._id, 
        username: user.username, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    console.log(`✅ Login successful: ${username} (${user.role})`);
    
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        approved: user.approved,
        createdAt: user.createdAt
      }
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
    const existingUser = await User.findOne({ 
      $or: [{ username }, { email }] 
    });
    
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user (pending approval)
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      role: 'member',
      approved: false
    });

    await newUser.save();

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
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('❌ Profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ============================================
// ROUTE: Get All Pending Users (Admin Only)
// GET /api/auth/pending-users
// ============================================
router.get('/pending-users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const pendingUsers = await User.find({ approved: false })
      .select('-password')
      .sort({ createdAt: -1 });
    
    console.log(`📋 Admin viewing ${pendingUsers.length} pending users`);
    res.json(pendingUsers);
  } catch (error) {
    console.error('❌ Error fetching pending users:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ============================================
// ROUTE: Approve User (Admin Only)
// POST /api/auth/approve-user/:userId
// ============================================
router.post('/approve-user/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.approved = true;
    await user.save();
    
    console.log(`✅ User approved: ${user.username} by admin ${req.user.username}`);
    
    res.json({ 
      message: 'User approved successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('❌ Error approving user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ============================================
// ROUTE: Reject/Delete User (Admin Only)
// DELETE /api/auth/reject-user/:userId
// ============================================
router.delete('/reject-user/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log(`❌ User rejected and removed: ${user.username} by admin ${req.user.username}`);
    
    res.json({ 
      message: 'User rejected and removed',
      username: user.username
    });
  } catch (error) {
    console.error('❌ Error rejecting user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ============================================
// ROUTE: Get All Users (Admin Only)
// GET /api/auth/users
// ============================================
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const allUsers = await User.find({ approved: true })
      .select('-password')
      .sort({ createdAt: -1 });
    
    res.json(allUsers);
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ============================================
// ROUTE: Update User Role (Admin Only)
// PATCH /api/auth/users/:userId/role
// ============================================
router.patch('/users/:userId/role', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!['admin', 'member'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent changing own role
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({ message: 'Cannot change your own role' });
    }

    const oldRole = user.role;
    user.role = role;
    await user.save();
    
    console.log(`🔄 Role changed for ${user.username}: ${oldRole} → ${role} by admin ${req.user.username}`);
    
    res.json(user);
  } catch (error) {
    console.error('❌ Error changing role:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ============================================
// ROUTE: Verify Token
// GET /api/auth/verify
// ============================================
router.get('/verify', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user || !user.approved) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ valid: true, user });
  } catch (error) {
    console.error('❌ Error verifying token:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
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

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, user.password);
    
    if (!validPassword) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

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