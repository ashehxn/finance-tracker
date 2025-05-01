const authController = require('../../controllers/authController');
const User = require('../../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mock dependencies
jest.mock('../../models/User');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

describe('Auth Controller', () => {
  let req;
  let res;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock request and response objects
    req = {
      body: {}
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });
  
  describe('register', () => {
    it('should register a new user successfully', async () => {
      // Setup
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      };
      
      const createdUser = {
        _id: 'user123',
        ...userData,
        role: 'user'
      };
      
      req.body = userData;
      
      // Mock User.findOne to return null (user doesn't exist)
      User.findOne.mockResolvedValue(null);
      
      // Mock User.create to return a new user
      User.create.mockResolvedValue(createdUser);
      
      // Mock token generation
      jwt.sign.mockReturnValue('fake-token');
      
      // Execute
      await authController.register(req, res);
      
      // Assert
      expect(User.findOne).toHaveBeenCalledWith({ email: userData.email });
      expect(User.create).toHaveBeenCalledWith({
        name: userData.name,
        email: userData.email,
        password: userData.password,
        role: 'user'
      });
      expect(jwt.sign).toHaveBeenCalledWith(
        { id: createdUser._id, role: createdUser.role },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        token: 'fake-token',
        role: 'user'
      });
    });
    
    it('should register an admin user when role is specified', async () => {
      // Setup
      const userData = {
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'password123',
        role: 'admin'
      };
      
      const createdUser = {
        _id: 'admin123',
        ...userData
      };
      
      req.body = userData;
      
      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue(createdUser);
      jwt.sign.mockReturnValue('admin-token');
      
      // Execute
      await authController.register(req, res);
      
      // Assert
      expect(User.create).toHaveBeenCalledWith({
        name: userData.name,
        email: userData.email,
        password: userData.password,
        role: 'admin'
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        token: 'admin-token',
        role: 'admin'
      });
    });
    
    it('should return 400 if user already exists', async () => {
      // Setup
      const userData = {
        name: 'Existing User',
        email: 'existing@example.com',
        password: 'password123'
      };
      
      req.body = userData;
      
      // Mock User.findOne to return a user (user exists)
      User.findOne.mockResolvedValue({ email: userData.email });
      
      // Execute
      await authController.register(req, res);
      
      // Assert
      expect(User.findOne).toHaveBeenCalledWith({ email: userData.email });
      expect(User.create).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'User already exists' });
    });
    
    it('should return 500 if an error occurs', async () => {
      // Setup
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      };
      
      req.body = userData;
      
      // Mock an error during User.findOne
      const error = new Error('Database error');
      User.findOne.mockRejectedValue(error);
      
      // Execute
      await authController.register(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Server error',
        error
      });
    });
  });
  
  describe('login', () => {
    it('should login a user successfully', async () => {
      // Setup
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };
      
      const user = {
        _id: 'user123',
        email: loginData.email,
        role: 'user',
        password: 'hashed_password'
      };
      
      req.body = loginData;
      
      // Mock User.findOne to return a user
      User.findOne.mockResolvedValue(user);
      
      // Mock password comparison to return true
      bcrypt.compare.mockResolvedValue(true);
      
      // Mock token generation
      jwt.sign.mockReturnValue('login-token');
      
      // Execute
      await authController.login(req, res);
      
      // Assert
      expect(User.findOne).toHaveBeenCalledWith({ email: loginData.email });
      expect(bcrypt.compare).toHaveBeenCalledWith(loginData.password, user.password);
      expect(jwt.sign).toHaveBeenCalledWith(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );
      expect(res.json).toHaveBeenCalledWith({ token: 'login-token' });
    });
    
    it('should return 400 if user does not exist', async () => {
      // Setup
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };
      
      req.body = loginData;
      
      // Mock User.findOne to return null
      User.findOne.mockResolvedValue(null);
      
      // Execute
      await authController.login(req, res);
      
      // Assert
      expect(User.findOne).toHaveBeenCalledWith({ email: loginData.email });
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid credentials' });
    });
    
    it('should return 400 if password is incorrect', async () => {
      // Setup
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };
      
      const user = {
        _id: 'user123',
        email: loginData.email,
        password: 'hashed_password'
      };
      
      req.body = loginData;
      
      // Mock User.findOne to return a user
      User.findOne.mockResolvedValue(user);
      
      // Mock password comparison to return false
      bcrypt.compare.mockResolvedValue(false);
      
      // Execute
      await authController.login(req, res);
      
      // Assert
      expect(User.findOne).toHaveBeenCalledWith({ email: loginData.email });
      expect(bcrypt.compare).toHaveBeenCalledWith(loginData.password, user.password);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid credentials' });
    });
    
    it('should return 500 if an error occurs', async () => {
      // Setup
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };
      
      req.body = loginData;
      
      // Mock an error during User.findOne
      const error = new Error('Database error');
      User.findOne.mockRejectedValue(error);
      
      // Execute
      await authController.login(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Server error',
        error
      });
    });
  });
});