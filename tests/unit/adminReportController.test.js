const transactionController = require('../../controllers/adminReportController'); // Adjust path as needed
const Transaction = require('../../models/Transaction');
const mongoose = require('mongoose');

jest.mock('../../models/Transaction');

describe('Transaction Analytics Controller', () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    
    req = {
      query: {}
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('getOverallSpendingTrends', () => {
    it('should get overall spending trends for all expenses without filters', async () => {
      const mockTrends = [
        { _id: { year: 2023, month: 1 }, totalSpent: 500 },
        { _id: { year: 2023, month: 2 }, totalSpent: 700 }
      ];
      
      Transaction.aggregate.mockResolvedValue(mockTrends);

      await transactionController.getOverallSpendingTrends(req, res);

      expect(Transaction.aggregate).toHaveBeenCalledWith([
        { $match: { type: "expense" } },
        {
          $group: {
            _id: {
              year: { $year: { $ifNull: ["$date", { $arrayElemAt: ["$occurrences", 0] }] } },
              month: { $month: { $ifNull: ["$date", { $arrayElemAt: ["$occurrences", 0] }] } }
            },
            totalSpent: { $sum: "$amount" }
          }
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
      ]);
      expect(res.json).toHaveBeenCalledWith(mockTrends);
    });

    it('should get monthly spending trends for a specific year', async () => {
      req.query = { type: 'monthly', year: '2023' };
      const mockTrends = [
        { _id: { year: 2023, month: 1 }, totalSpent: 300 },
        { _id: { year: 2023, month: 2 }, totalSpent: 400 }
      ];
      
      Transaction.aggregate.mockResolvedValue(mockTrends);

      await transactionController.getOverallSpendingTrends(req, res);

      expect(Transaction.aggregate).toHaveBeenCalledWith([
        {
          $match: {
            type: "expense",
            $or: [
              { date: { $ne: null, $gte: new Date('2023-01-01T00:00:00.000Z'), $lte: new Date('2023-12-31T23:59:59.999Z') } },
              { occurrences: { $elemMatch: { $gte: new Date('2023-01-01T00:00:00.000Z'), $lte: new Date('2023-12-31T23:59:59.999Z') } } }
            ]
          }
        },
        {
          $group: {
            _id: {
              year: { $year: { $ifNull: ["$date", { $arrayElemAt: ["$occurrences", 0] }] } },
              month: { $month: { $ifNull: ["$date", { $arrayElemAt: ["$occurrences", 0] }] } }
            },
            totalSpent: { $sum: "$amount" }
          }
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
      ]);
      expect(res.json).toHaveBeenCalledWith(mockTrends);
    });

    it('should return 500 on server error', async () => {
      req.query = { type: 'monthly', year: '2023' };
      const error = new Error('Aggregation error');
      Transaction.aggregate.mockRejectedValue(error);

      await transactionController.getOverallSpendingTrends(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ 
        message: 'Server error', 
        error: error.message 
      });
    });
  });

  describe('getOverallIncomeVsExpense', () => {
    it('should get income vs expense summary without date filters', async () => {
      const mockSummary = [
        { _id: 'income', total: 1000 },
        { _id: 'expense', total: 600 }
      ];
      
      Transaction.aggregate.mockResolvedValue(mockSummary);

      await transactionController.getOverallIncomeVsExpense(req, res);

      expect(Transaction.aggregate).toHaveBeenCalledWith([
        { $match: {} },
        { $group: { _id: "$type", total: { $sum: "$amount" } } }
      ]);
      expect(res.json).toHaveBeenCalledWith({
        income: 1000,
        expenses: 600
      });
    });

    it('should get income vs expense summary with date range', async () => {
      req.query = { 
        startDate: '2023-01-01', 
        endDate: '2023-12-31' 
      };
      const mockSummary = [
        { _id: 'income', total: 800 },
        { _id: 'expense', total: 450 }
      ];
      
      Transaction.aggregate.mockResolvedValue(mockSummary);

      await transactionController.getOverallIncomeVsExpense(req, res);

      expect(Transaction.aggregate).toHaveBeenCalledWith([
        {
          $match: {
            $or: [
              { date: { $ne: null, $gte: new Date('2023-01-01T00:00:00.000Z'), $lte: new Date('2023-12-31T23:59:59.999Z') } },
              { occurrences: { $elemMatch: { $gte: new Date('2023-01-01T00:00:00.000Z'), $lte: new Date('2023-12-31T23:59:59.999Z') } } }
            ]
          }
        },
        { $group: { _id: "$type", total: { $sum: "$amount" } } }
      ]);
      expect(res.json).toHaveBeenCalledWith({
        income: 800,
        expenses: 450
      });
    });

    it('should return zeros when no transactions match', async () => {
      req.query = { 
        startDate: '2023-01-01', 
        endDate: '2023-12-31' 
      };
      Transaction.aggregate.mockResolvedValue([]); // No results

      await transactionController.getOverallIncomeVsExpense(req, res);

      expect(res.json).toHaveBeenCalledWith({
        income: 0,
        expenses: 0
      });
    });

    it('should return 500 on server error', async () => {
      req.query = { startDate: '2023-01-01', endDate: '2023-12-31' };
      const error = new Error('Aggregation failure');
      Transaction.aggregate.mockRejectedValue(error);

      await transactionController.getOverallIncomeVsExpense(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ 
        message: 'Server error', 
        error: error.message 
      });
    });
  });
});