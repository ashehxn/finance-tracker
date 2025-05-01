const userController = require('../../controllers/userController'); // Adjust path as needed
const User = require('../../models/User');
const mongoose = require('mongoose');

jest.mock('../../models/User');
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

describe('User Controller', () => {
  let req;
  let res;
  const mockUserId = new mongoose.Types.ObjectId();
  const mockAdminId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
    
    req = {
      user: { id: mockUserId.toString(), role: 'user' }, // Default to regular user
      params: {},
      body: {},
      query: {}
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('getAllUsers', () => {
    it('should get all users successfully', async () => {
      const mockUsers = [
        { _id: mockUserId, email: 'user@example.com' }
      ];
      User.find.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUsers)
      });

      await userController.getAllUsers(req, res);

      expect(User.find).toHaveBeenCalled();
      expect(User.find().select).toHaveBeenCalledWith('-password');
      expect(res.json).toHaveBeenCalledWith(mockUsers);
    });

    it('should return 500 on server error', async () => {
      const error = new Error('Database error');
      User.find.mockImplementation(() => { throw error; });

      await userController.getAllUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error', error });
    });
  });

  describe('getUserById', () => {
    it('should get a user by ID successfully', async () => {
      req.params.id = mockUserId.toString();
      const mockUser = { _id: mockUserId, email: 'user@example.com' };
      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser)
      });

      await userController.getUserById(req, res);

      expect(User.findById).toHaveBeenCalledWith(mockUserId.toString());
      expect(User.findById().select).toHaveBeenCalledWith('-password');
      expect(res.json).toHaveBeenCalledWith(mockUser);
    });

    it('should return 404 if user not found', async () => {
      req.params.id = mockUserId.toString();
      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(null)
      });

      await userController.getUserById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    });

    it('should return 500 on server error', async () => {
      req.params.id = mockUserId.toString();
      const error = new Error('Query error');
      User.findById.mockImplementation(() => { throw error; });

      await userController.getUserById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error', error });
    });
  });

  describe('getUsersByRole', () => {
    it('should get users by role successfully', async () => {
      req.query.role = 'admin';
      const mockUsers = [
        { _id: mockAdminId, role: 'admin', email: 'admin@example.com' }
      ];
      User.find.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUsers)
      });

      await userController.getUsersByRole(req, res);

      expect(User.find).toHaveBeenCalledWith({ role: 'admin' });
      expect(User.find().select).toHaveBeenCalledWith('-password');
      expect(res.json).toHaveBeenCalledWith(mockUsers);
    });

    it('should return 400 for invalid role', async () => {
      req.query.role = 'invalid';

      await userController.getUsersByRole(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid role. Use 'admin' or 'user'." });
    });

    it('should return 400 if role is missing', async () => {
      req.query.role = undefined;

      await userController.getUsersByRole(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid role. Use 'admin' or 'user'." });
    });

    it('should return 500 on server error', async () => {
      req.query.role = 'user';
      const error = new Error('Query error');
      User.find.mockImplementation(() => { throw error; });

      await userController.getUsersByRole(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error', error });
    });
  });

  describe('updateUser', () => {
    it('should update own user profile successfully', async () => {
        req.params.id = mockUserId.toString();
        req.body = { email: 'newemail@example.com' };
        const mockUpdatedUser = {
          _id: mockUserId,
          email: 'newemail@example.com'
        };
      
        // Mock the chain: findByIdAndUpdate().select()
        User.findByIdAndUpdate.mockReturnValue({
          select: jest.fn().mockResolvedValue(mockUpdatedUser)
        });
      
        await userController.updateUser(req, res);
      
        expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
          mockUserId.toString(),
          { email: 'newemail@example.com' },
          { new: true, runValidators: true }
        );
        expect(res.json).toHaveBeenCalledWith(mockUpdatedUser);
      });
  
      it('should allow admin to update any user', async () => {
        req.user.role = 'admin';
        const targetUserId = new mongoose.Types.ObjectId().toString();
        req.params.id = targetUserId;
        req.body = { email: 'adminupdate@example.com' };
        const mockUpdatedUser = { _id: targetUserId, email: 'adminupdate@example.com' };
      
        // Mock the chain: findByIdAndUpdate().select()
        User.findByIdAndUpdate.mockReturnValue({
          select: jest.fn().mockResolvedValue(mockUpdatedUser)
        });
      
        await userController.updateUser(req, res);
      
        expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
          targetUserId,
          { email: 'adminupdate@example.com' },
          { new: true, runValidators: true }
        );
        expect(res.json).toHaveBeenCalledWith(mockUpdatedUser);
      });
  
    it('should return 403 if non-admin tries to update another user', async () => {
      req.params.id = new mongoose.Types.ObjectId().toString(); // Different ID
      req.body = { email: 'unauthorized@example.com' };
  
      await userController.updateUser(req, res);
  
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Access denied' });
    });
  
    it('should return 404 if user not found', async () => {
        req.params.id = mockUserId.toString();
        req.body = { email: 'newemail@example.com' };
      
        User.findByIdAndUpdate.mockReset();
        User.findByIdAndUpdate.mockReturnValue({
          select: jest.fn().mockResolvedValue(null)
        });
      
        await userController.updateUser(req, res);
      
        expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
          mockUserId.toString(),
          { email: 'newemail@example.com' },
          { new: true, runValidators: true }
        );
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
      });
  
    it('should return 400 on validation error', async () => {
      req.params.id = mockUserId.toString();
      req.body = { email: 'invalid' };
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      User.findByIdAndUpdate.mockReturnValue({
        select: jest.fn().mockRejectedValue(error)
      });
  
      await userController.updateUser(req, res);
  
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        mockUserId.toString(),
        { email: 'invalid' },
        { new: true, runValidators: true }
      );
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Validation failed' });
    });
  
    it('should return 500 on server error', async () => {
      req.params.id = mockUserId.toString();
      req.body = { email: 'newemail@example.com' };
      const error = new Error('Update error');
      User.findByIdAndUpdate.mockReturnValue({
        select: jest.fn().mockRejectedValue(error)
      });
  
      await userController.updateUser(req, res);
  
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error', error });
    });
  });

  describe('deleteUser', () => {
    it('should delete a user successfully', async () => {
      req.params.id = mockUserId.toString();
      const mockUser = {
        _id: mockUserId,
        deleteOne: jest.fn().mockResolvedValue(true)
      };
      User.findById.mockResolvedValue(mockUser);

      await userController.deleteUser(req, res);

      expect(User.findById).toHaveBeenCalledWith(mockUserId.toString());
      expect(mockUser.deleteOne).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: 'User deleted successfully' });
    });

    it('should return 404 if user not found', async () => {
      req.params.id = mockUserId.toString();
      User.findById.mockResolvedValue(null);

      await userController.deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    });

    it('should return 500 on server error', async () => {
      req.params.id = mockUserId.toString();
      const error = new Error('Delete error');
      User.findById.mockRejectedValue(error);

      await userController.deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error', error });
    });
  });
});