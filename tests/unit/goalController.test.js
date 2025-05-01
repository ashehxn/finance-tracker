const goalController = require('../../controllers/goalController'); // Adjust path as needed
const Goal = require('../../models/Goal');
const SystemSetting = require('../../models/SystemSetting');
const mongoose = require('mongoose');

jest.mock('../../models/Goal');
jest.mock('../../models/SystemSetting');
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

describe('Goal Controller', () => {
  let req;
  let res;
  const mockUserId = new mongoose.Types.ObjectId();
  const mockGoalId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
    
    req = {
      user: { id: mockUserId.toString() },
      body: {},
      params: {}
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('createGoal', () => {
    it('should create a goal successfully', async () => {
      req.body = {
        name: 'Savings Goal',
        targetAmount: 1000,
        percentage: 20,
        deadline: '2025-12-31'
      };
      const mockSettings = { defaultCurrency: 'USD' };
      SystemSetting.findOne.mockResolvedValue(mockSettings);
      Goal.aggregate.mockResolvedValue([]); // No existing goals
      const mockGoal = {
        _id: mockGoalId,
        user: mockUserId,
        name: 'Savings Goal',
        targetAmount: 1000,
        savedAmount: 0,
        currency: 'USD',
        percentage: 20,
        deadline: new Date('2025-12-31'),
        status: 'active',
        save: jest.fn().mockResolvedValue(true)
      };
      Goal.mockImplementation(() => mockGoal);

      await goalController.createGoal(req, res);

      expect(SystemSetting.findOne).toHaveBeenCalled();
      expect(Goal.aggregate).toHaveBeenCalledWith([
        { $match: { user: mockUserId.toString(), status: 'active' } },
        { $group: { _id: null, total: { $sum: '$percentage' } } }
      ]);
      expect(mockGoal.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockGoal);
    });

    it('should return 400 if required fields are missing', async () => {
      req.body = { targetAmount: 1000 }; // Missing name, percentage, deadline

      await goalController.createGoal(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'All fields are required.' });
    });

    it('should return 400 if targetAmount is zero (treated as missing)', async () => {
        req.body = {
          name: 'Savings Goal',
          targetAmount: 0,
          percentage: 20,
          deadline: '2025-12-31'
        };
    
        await goalController.createGoal(req, res);
    
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'All fields are required.' });
    });
    
    it('should return 400 if targetAmount is negative', async () => {
    req.body = {
        name: 'Savings Goal',
        targetAmount: -100,
        percentage: 20,
        deadline: '2025-12-31'
    };
    const mockSettings = { defaultCurrency: 'USD' };
    SystemSetting.findOne.mockResolvedValue(mockSettings);
    Goal.aggregate.mockResolvedValue([]); // No existing goals

    await goalController.createGoal(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Target amount must be greater than zero.' });
    });

    it('should return 400 if deadline is not in the future', async () => {
      req.body = {
        name: 'Savings Goal',
        targetAmount: 1000,
        percentage: 20,
        deadline: '2023-01-01' // Past date
      };

      await goalController.createGoal(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Deadline must be a future date.' });
    });

    it('should return 400 if percentage exceeds 100%', async () => {
      req.body = {
        name: 'Savings Goal',
        targetAmount: 1000,
        percentage: 80,
        deadline: '2025-12-31'
      };
      const mockSettings = { defaultCurrency: 'USD' };
      SystemSetting.findOne.mockResolvedValue(mockSettings);
      Goal.aggregate.mockResolvedValue([{ _id: null, total: 30 }]); // Existing 30%

      await goalController.createGoal(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Total savings allocation across goals cannot exceed 100%.'
      });
    });

    it('should return 500 if system settings not found', async () => {
      req.body = {
        name: 'Savings Goal',
        targetAmount: 1000,
        percentage: 20,
        deadline: '2025-12-31'
      };
      SystemSetting.findOne.mockResolvedValue(null);

      await goalController.createGoal(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'System settings not found.' });
    });
  });

  describe('getGoals', () => {
    it('should get all goals for the user', async () => {
      const mockGoals = [{ _id: mockGoalId, user: mockUserId }];
      Goal.find.mockResolvedValue(mockGoals);

      await goalController.getGoals(req, res);

      expect(Goal.find).toHaveBeenCalledWith({ user: mockUserId.toString() });
      expect(res.json).toHaveBeenCalledWith(mockGoals);
    });

    it('should return 500 on server error', async () => {
      const error = new Error('DB error');
      Goal.find.mockRejectedValue(error);

      await goalController.getGoals(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error', error: error.message });
    });
  });

  describe('getGoalById', () => {
    it('should get a specific goal by ID', async () => {
      req.params.id = mockGoalId.toString();
      const mockGoal = { _id: mockGoalId, user: mockUserId };
      Goal.findOne.mockResolvedValue(mockGoal);

      await goalController.getGoalById(req, res);

      expect(Goal.findOne).toHaveBeenCalledWith({
        _id: mockGoalId.toString(),
        user: mockUserId.toString()
      });
      expect(res.json).toHaveBeenCalledWith(mockGoal);
    });

    it('should return 404 if goal not found', async () => {
      req.params.id = mockGoalId.toString();
      Goal.findOne.mockResolvedValue(null);

      await goalController.getGoalById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Goal not found.' });
    });

    it('should return 500 on server error', async () => {
      req.params.id = mockGoalId.toString();
      const error = new Error('Query error');
      Goal.findOne.mockRejectedValue(error);

      await goalController.getGoalById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error', error: error.message });
    });
  });

  describe('updateGoal', () => {
    it('should update a goal successfully', async () => {
      req.params.id = mockGoalId.toString();
      req.body = { targetAmount: 1500, percentage: 30, deadline: '2025-12-31' };
      const mockGoal = {
        _id: mockGoalId,
        user: mockUserId,
        targetAmount: 1000,
        percentage: 20,
        deadline: new Date('2024-12-31'),
        save: jest.fn().mockResolvedValue(true)
      };
      Goal.findOne.mockResolvedValue(mockGoal);
      Goal.aggregate.mockResolvedValue([]); // No other goals

      await goalController.updateGoal(req, res);

      expect(mockGoal.targetAmount).toBe(1500);
      expect(mockGoal.percentage).toBe(30);
      expect(mockGoal.deadline).toEqual(new Date('2025-12-31'));
      expect(mockGoal.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockGoal);
    });

    it('should return 404 if goal not found', async () => {
      req.params.id = mockGoalId.toString();
      req.body = { targetAmount: 1500 };
      Goal.findOne.mockResolvedValue(null);

      await goalController.updateGoal(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Goal not found.' });
    });

    it('should return 400 if targetAmount is invalid', async () => {
      req.params.id = mockGoalId.toString();
      req.body = { targetAmount: 0 };
      const mockGoal = { _id: mockGoalId, user: mockUserId };
      Goal.findOne.mockResolvedValue(mockGoal);

      await goalController.updateGoal(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Target amount must be greater than zero.' });
    });

    it('should return 400 if deadline is not in the future', async () => {
      req.params.id = mockGoalId.toString();
      req.body = { deadline: '2023-01-01' };
      const mockGoal = { _id: mockGoalId, user: mockUserId };
      Goal.findOne.mockResolvedValue(mockGoal);

      await goalController.updateGoal(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Deadline must be a future date.' });
    });

    it('should return 400 if percentage exceeds 100%', async () => {
      req.params.id = mockGoalId.toString();
      req.body = { percentage: 80 };
      const mockGoal = { _id: mockGoalId, user: mockUserId, percentage: 20 };
      Goal.findOne.mockResolvedValue(mockGoal);
      Goal.aggregate.mockResolvedValue([{ _id: null, total: 30 }]); // Other goals total 30%

      await goalController.updateGoal(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Total savings allocation across goals cannot exceed 100%.'
      });
    });
  });

  describe('deleteGoal', () => {
    it('should delete a goal successfully', async () => {
      req.params.id = mockGoalId.toString();
      const mockGoal = { _id: mockGoalId, user: mockUserId };
      Goal.findOneAndDelete.mockResolvedValue(mockGoal);

      await goalController.deleteGoal(req, res);

      expect(Goal.findOneAndDelete).toHaveBeenCalledWith({
        _id: mockGoalId.toString(),
        user: mockUserId.toString()
      });
      expect(res.json).toHaveBeenCalledWith({ message: 'Goal deleted successfully.' });
    });

    it('should return 404 if goal not found', async () => {
      req.params.id = mockGoalId.toString();
      Goal.findOneAndDelete.mockResolvedValue(null);

      await goalController.deleteGoal(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Goal not found.' });
    });

    it('should return 500 on server error', async () => {
      req.params.id = mockGoalId.toString();
      const error = new Error('Delete error');
      Goal.findOneAndDelete.mockRejectedValue(error);

      await goalController.deleteGoal(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error', error: error.message });
    });
  });
});