const analyticsController = require('../../controllers/userReportController');
const Transaction = require('../../models/Transaction');
const mongoose = require('mongoose');

jest.mock('../../models/Transaction');

describe('Analytics Controller', () => {
  let req;
  let res;
  const mockUserId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
    
    req = {
      user: { id: mockUserId.toString() },
      query: {},
      params: {}
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('getSpendingTrends', () => {
    it('should get yearly spending trends successfully', async () => {
      req.query.type = 'yearly';
      const mockTrends = [
        { _id: { year: 2023 }, totalSpent: 1000 },
        { _id: { year: 2024 }, totalSpent: 1500 }
      ];
      Transaction.aggregate.mockResolvedValue(mockTrends);

      await analyticsController.getSpendingTrends(req, res);

      expect(Transaction.aggregate).toHaveBeenCalledWith([
        { $match: { user: mockUserId, type: 'expense' } },
        { $group: { _id: { year: { $year: '$date' } }, totalSpent: { $sum: '$amount' } } },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]);
      expect(res.json).toHaveBeenCalledWith(mockTrends);
    });

    it('should get monthly spending trends for a specific year', async () => {
      req.query.type = 'monthly';
      req.query.year = '2024';
      const mockTrends = [
        { _id: { year: 2024, month: 1 }, totalSpent: 200 },
        { _id: { year: 2024, month: 2 }, totalSpent: 300 }
      ];
      Transaction.aggregate.mockResolvedValue(mockTrends);

      await analyticsController.getSpendingTrends(req, res);

      expect(Transaction.aggregate).toHaveBeenCalledWith([
        {
          $match: {
            user: mockUserId,
            type: 'expense',
            date: {
              $gte: new Date('2024-01-01'),
              $lte: new Date('2024-12-31')
            }
          }
        },
        { $group: { _id: { year: { $year: '$date' }, month: { $month: '$date' } }, totalSpent: { $sum: '$amount' } } },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]);
      expect(res.json).toHaveBeenCalledWith(mockTrends);
    });

    it('should return 500 on server error', async () => {
      req.query.type = 'yearly';
      const error = new Error('Aggregation error');
      Transaction.aggregate.mockRejectedValue(error);

      await analyticsController.getSpendingTrends(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error', error: error.message });
    });
  });

  describe('getIncomeVsExpense', () => {
    it('should get income vs expense summary successfully', async () => {
      const mockSummary = [
        { _id: 'income', total: 5000 },
        { _id: 'expense', total: 3000 }
      ];
      Transaction.aggregate.mockResolvedValue(mockSummary);

      await analyticsController.getIncomeVsExpense(req, res);

      expect(Transaction.aggregate).toHaveBeenCalledWith([
        { $match: { user: mockUserId } },
        { $group: { _id: '$type', total: { $sum: '$amount' } } }
      ]);
      expect(res.json).toHaveBeenCalledWith({ income: 5000, expenses: 3000 });
    });

    it('should get summary within date range', async () => {
      req.query.startDate = '2024-01-01';
      req.query.endDate = '2024-12-31';
      const mockSummary = [
        { _id: 'income', total: 2000 },
        { _id: 'expense', total: 1500 }
      ];
      Transaction.aggregate.mockResolvedValue(mockSummary);

      await analyticsController.getIncomeVsExpense(req, res);

      expect(Transaction.aggregate).toHaveBeenCalledWith([
        {
          $match: {
            user: mockUserId,
            date: {
              $gte: new Date('2024-01-01'),
              $lte: new Date('2024-12-31')
            }
          }
        },
        { $group: { _id: '$type', total: { $sum: '$amount' } } }
      ]);
      expect(res.json).toHaveBeenCalledWith({ income: 2000, expenses: 1500 });
    });

    it('should return 500 on server error', async () => {
      const error = new Error('Aggregation error');
      Transaction.aggregate.mockRejectedValue(error);

      await analyticsController.getIncomeVsExpense(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error', error: error.message });
    });
  });

  describe('getSpendingByCategory', () => {
    it('should get spending by category successfully', async () => {
      const mockSpending = [
        { _id: 'Food', totalSpent: 500 },
        { _id: 'Travel', totalSpent: 300 }
      ];
      Transaction.aggregate.mockResolvedValue(mockSpending);

      await analyticsController.getSpendingByCategory(req, res);

      expect(Transaction.aggregate).toHaveBeenCalledWith([
        { $match: { user: mockUserId, type: 'expense' } },
        { $group: { _id: '$category', totalSpent: { $sum: '$amount' } } },
        { $sort: { totalSpent: -1 } }
      ]);
      expect(res.json).toHaveBeenCalledWith(mockSpending);
    });

    it('should get spending by category within date range', async () => {
      req.query.startDate = '2024-01-01';
      req.query.endDate = '2024-12-31';
      const mockSpending = [
        { _id: 'Food', totalSpent: 200 },
        { _id: 'Travel', totalSpent: 100 }
      ];
      Transaction.aggregate.mockResolvedValue(mockSpending);

      await analyticsController.getSpendingByCategory(req, res);

      expect(Transaction.aggregate).toHaveBeenCalledWith([
        {
          $match: {
            user: mockUserId,
            type: 'expense',
            date: {
              $gte: new Date('2024-01-01'),
              $lte: new Date('2024-12-31')
            }
          }
        },
        { $group: { _id: '$category', totalSpent: { $sum: '$amount' } } },
        { $sort: { totalSpent: -1 } }
      ]);
      expect(res.json).toHaveBeenCalledWith(mockSpending);
    });

    it('should return 500 on server error', async () => {
      const error = new Error('Aggregation error');
      Transaction.aggregate.mockRejectedValue(error);

      await analyticsController.getSpendingByCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error', error: error.message });
    });
  });

  describe('getSpendingByTag', () => {
    it('should get spending by tag successfully', async () => {
      const mockSpending = [
        { _id: 'tag1', totalSpent: 400 },
        { _id: 'tag2', totalSpent: 200 }
      ];
      Transaction.aggregate.mockResolvedValue(mockSpending);

      await analyticsController.getSpendingByTag(req, res);

      expect(Transaction.aggregate).toHaveBeenCalledWith([
        { $match: { user: mockUserId, type: 'expense' } },
        { $unwind: '$tags' },
        { $group: { _id: '$tags', totalSpent: { $sum: '$amount' } } },
        { $sort: { totalSpent: -1 } }
      ]);
      expect(res.json).toHaveBeenCalledWith(mockSpending);
    });

    it('should get spending by tag within date range', async () => {
      req.query.startDate = '2024-01-01';
      req.query.endDate = '2024-12-31';
      const mockSpending = [
        { _id: 'tag1', totalSpent: 150 },
        { _id: 'tag2', totalSpent: 100 }
      ];
      Transaction.aggregate.mockResolvedValue(mockSpending);

      await analyticsController.getSpendingByTag(req, res);

      expect(Transaction.aggregate).toHaveBeenCalledWith([
        {
          $match: {
            user: mockUserId,
            type: 'expense',
            date: {
              $gte: new Date('2024-01-01'),
              $lte: new Date('2024-12-31')
            }
          }
        },
        { $unwind: '$tags' },
        { $group: { _id: '$tags', totalSpent: { $sum: '$amount' } } },
        { $sort: { totalSpent: -1 } }
      ]);
      expect(res.json).toHaveBeenCalledWith(mockSpending);
    });

    it('should return 500 on server error', async () => {
      const error = new Error('Aggregation error');
      Transaction.aggregate.mockRejectedValue(error);

      await analyticsController.getSpendingByTag(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error', error: error.message });
    });
  });
});