const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const { protect, restrictTo, logout } = require('../../middleware/authMiddleware');

jest.mock('jsonwebtoken');
jest.mock('../../models/User');

const tokenBlacklist = new Set(); // Adjust if not exported

describe('Middleware Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = { headers: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    tokenBlacklist.clear();
  });

  describe('protect middleware', () => {
    it('should return 401 if no token is provided', async () => {
      await protect(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Not authorized, no token' });
    });

    it('should return 401 if token is invalid', async () => {
      const token = 'invalidToken';
      req.headers.authorization = `Bearer ${token}`;
      jwt.verify.mockImplementation(() => { throw new Error('Invalid token'); });
      await protect(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Not authorized, invalid token' });
    });

    it('should return 401 if user is not found', async () => {
      const token = 'validToken';
      req.headers.authorization = `Bearer ${token}`;
      const decoded = { id: 'userId' };
      jwt.verify.mockReturnValue(decoded);
      User.findById.mockResolvedValue(null);
      await protect(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Not authorized, invalid token' });
    });
  });

  describe('restrictTo middleware', () => {
    it('should call next if user has the required role', () => {
      req.user = { role: 'admin' };
      const middleware = restrictTo('admin');
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should return 403 if user does not have the required role', () => {
      req.user = { role: 'user' };
      const middleware = restrictTo('admin');
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Access denied. Insufficient permissions.' });
    });
  });
});