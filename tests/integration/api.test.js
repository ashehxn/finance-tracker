const request = require('supertest');
const app = require('./testApp');
const mongoose = require('mongoose');
const User = require('../../models/User');
const Transaction = require('../../models/Transaction');
const Goal = require('../../models/Goal');
const SystemSetting = require('../../models/SystemSetting');
const jwt = require('jsonwebtoken');

// Mock external utilities
jest.mock('../../utils/exchangeRates', () => ({
  convertCurrency: jest.fn().mockImplementation((amount) => Promise.resolve(amount)),
}));
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));
jest.mock('../../utils/scheduleNotifications', () => jest.fn());
jest.mock('node-cron', () => ({
  schedule: jest.fn(),
}));

// Mock authMiddleware to match your implementation
jest.mock('../../middleware/authMiddleware', () => {
  const jwt = require('jsonwebtoken');
  const User = require('../../models/User');
  let tokenBlacklist = new Set();

  return {
    protect: async (req, res, next) => {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
      }
      if (tokenBlacklist.has(token)) {
        return res.status(401).json({ message: 'Token has been revoked. Please log in again.' });
      }
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password');
        if (!req.user) {
          return res.status(401).json({ message: 'User not found' });
        }
        next();
      } catch (error) {
        res.status(401).json({ message: 'Not authorized, invalid token' });
      }
    },
    restrictTo: (role) => (req, res, next) => {
      if (req.user.role !== role) {
        return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
      }
      next();
    },
    logout: (req, res) => {
      const token = req.headers.authorization?.split(' ')[1];
      if (token) {
        tokenBlacklist.add(token);
      }
      res.json({ message: 'Logged out successfully' });
    },
    clearBlacklist: () => {
      tokenBlacklist.clear();
    },
  };
});

describe('API Integration Tests - Admin Reports and Goals', () => {
  let userToken, adminToken, userId, adminId;

  beforeAll(async () => {
    // Ensure JWT_SECRET is set for tests
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';

    await mongoose.connection.db.dropDatabase(); 
    
    userId = new mongoose.Types.ObjectId().toString();
    adminId = new mongoose.Types.ObjectId().toString();
    userToken = jwt.sign({ id: userId, role: 'user' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    adminToken = jwt.sign({ id: adminId, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Clear all collections before starting
    await User.deleteMany({});
    await Transaction.deleteMany({});
    await Goal.deleteMany({});
    await SystemSetting.deleteMany({});

    await User.create([
      { _id: userId, name: 'Test User', email: 'user@test.com', password: 'hashed', role: 'user' },
      { _id: adminId, name: 'Test Admin', email: 'admin@test.com', password: 'hashed', role: 'admin' },
    ]);

    await SystemSetting.create({
      defaultCurrency: 'USD',
      categories: ['Food', 'Travel', 'Salary'],
      maxBudgetLimit: 5000,
    });
  });

  beforeEach(async () => {
    await Transaction.deleteMany({});
    await Goal.deleteMany({});
  
    // Clear the token blacklist before each test
    const authMiddleware = require('../../middleware/authMiddleware');
    authMiddleware.clearBlacklist();
  });
  
  afterAll(async () => {
    // Close the mongoose connection after all tests
    // await mongoose.connection.close();
    await mongoose.disconnect();
  });

  // Admin Report Controller Tests
  describe('Admin Report Controller', () => {
    describe('GET /api/adminReports/trends', () => {
      it('should get overall spending trends for a year (monthly)', async () => {
        await Transaction.create([
          {
            user: userId,
            type: 'expense',
            amount: 100,
            category: 'Food',
            currency: 'USD',
            date: new Date('2023-01-15'),
          },
          {
            user: adminId,
            type: 'expense',
            amount: 200,
            category: 'Travel',
            currency: 'USD',
            date: new Date('2023-02-10'),
          },
        ]);

        const response = await request(app)
          .get('/api/adminReports/trends?type=monthly&year=2023')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toHaveLength(2);
        expect(response.body[0]).toMatchObject({
          _id: { year: 2023, month: 1 },
          totalSpent: 100,
        });
        expect(response.body[1]).toMatchObject({
          _id: { year: 2023, month: 2 },
          totalSpent: 200,
        });
      });
    });
  });
});