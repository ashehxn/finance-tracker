const dashboardController = require('../../controllers/dashboardController'); // Adjust path as needed
const User = require('../../models/User');
const Transaction = require('../../models/Transaction');
const Budget = require('../../models/Budget');
const Goal = require('../../models/Goal');
const mongoose = require('mongoose');

jest.mock('../../models/User');
jest.mock('../../models/Transaction');
jest.mock('../../models/Budget');
jest.mock('../../models/Goal');

describe('Dashboard Controller', () => {
  let req;
  let res;
  const mockUserId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
    
    req = {
      user: { id: mockUserId.toString() },
      params: {},
      query: {}
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('getAdminDashboard', () => {
    it('should return admin dashboard data successfully', async () => {
      User.countDocuments.mockResolvedValue(50);
      
      Transaction.aggregate
        .mockResolvedValueOnce([{ _id: null, total: 10000 }]) // totalIncome
        .mockResolvedValueOnce([{ _id: null, total: 6000 }]); // totalExpenses
      
      Budget.countDocuments.mockResolvedValue(20);
      Budget.aggregate.mockResolvedValue([{ _id: null, total: 50000 }]);
      Goal.countDocuments.mockResolvedValue(10);

      await dashboardController.getAdminDashboard(req, res);

      expect(User.countDocuments).toHaveBeenCalled();
      expect(Transaction.aggregate).toHaveBeenCalledWith([
        { $match: { type: 'income' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      expect(Transaction.aggregate).toHaveBeenCalledWith([
        { $match: { type: 'expense' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      expect(Budget.countDocuments).toHaveBeenCalled();
      expect(Budget.aggregate).toHaveBeenCalledWith([
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      expect(Goal.countDocuments).toHaveBeenCalledWith({ status: 'active' });

      expect(res.json).toHaveBeenCalledWith({
        totalUsers: 50,
        totalIncome: 10000,
        totalExpenses: 6000,
        totalBudgets: 20,
        totalBudgetAmount: 50000,
        activeGoals: 10
      });
    });

    it('should return zeros when no data exists', async () => {
      User.countDocuments.mockResolvedValue(0);
      Transaction.aggregate
        .mockResolvedValueOnce([]) // totalIncome
        .mockResolvedValueOnce([]); // totalExpenses
      Budget.countDocuments.mockResolvedValue(0);
      Budget.aggregate.mockResolvedValue([]);
      Goal.countDocuments.mockResolvedValue(0);

      await dashboardController.getAdminDashboard(req, res);

      expect(res.json).toHaveBeenCalledWith({
        totalUsers: 0,
        totalIncome: 0,
        totalExpenses: 0,
        totalBudgets: 0,
        totalBudgetAmount: 0,
        activeGoals: 0
      });
    });

    it('should return 500 on server error', async () => {
      const error = new Error('Database error');
      User.countDocuments.mockRejectedValue(error);

      await dashboardController.getAdminDashboard(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Server error',
        error: error.message
      });
    });
  });

  describe('getUserDashboard', () => {
    it('should return user dashboard data successfully', async () => {
      const userIdObject = new mongoose.Types.ObjectId(mockUserId);

      Transaction.aggregate
        .mockResolvedValueOnce([{ _id: null, total: 5000 }]) // totalIncome
        .mockResolvedValueOnce([{ _id: null, total: 3000 }]); // totalExpenses
      
      const mockBudgets = [
        { name: 'Budget 1', remainingAmount: 200 },
        { name: 'Budget 2', remainingAmount: 300 }
      ];
      Budget.find.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockBudgets)
      });

      const mockGoals = [
        { name: 'Goal 1', targetAmount: 1000, savedAmount: 500, status: 'active' },
        { name: 'Goal 2', targetAmount: 2000, savedAmount: 800, status: 'active' }
      ];
      Goal.find.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockGoals)
      });

      await dashboardController.getUserDashboard(req, res);

      expect(Transaction.aggregate).toHaveBeenCalledWith([
        { $match: { user: userIdObject, type: 'income' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      expect(Transaction.aggregate).toHaveBeenCalledWith([
        { $match: { user: userIdObject, type: 'expense' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      expect(Budget.find).toHaveBeenCalledWith({ user: mockUserId.toString() });
      expect(Goal.find).toHaveBeenCalledWith({ user: mockUserId.toString(), status: 'active' });

      expect(res.json).toHaveBeenCalledWith({
        totalIncome: 5000,
        totalExpenses: 3000,
        remainingBudget: 500, // 200 + 300
        goals: [
          { name: 'Goal 1', progress: '50.00' },
          { name: 'Goal 2', progress: '40.00' }
        ]
      });
    });

    it('should return zeros and empty goals when no data exists', async () => {
      const userIdObject = new mongoose.Types.ObjectId(mockUserId);

      Transaction.aggregate
        .mockResolvedValueOnce([]) // totalIncome
        .mockResolvedValueOnce([]); // totalExpenses
      
      Budget.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([])
      });
      Goal.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([])
      });

      await dashboardController.getUserDashboard(req, res);

      expect(res.json).toHaveBeenCalledWith({
        totalIncome: 0,
        totalExpenses: 0,
        remainingBudget: 0,
        goals: []
      });
    });

    it('should return 500 on server error', async () => {
      const error = new Error('Query error');
      Transaction.aggregate.mockRejectedValue(error);

      await dashboardController.getUserDashboard(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Server error',
        error: error.message
      });
    });
  });
});