const transactionController = require('../../controllers/adminTransactionController');
const Transaction = require('../../models/Transaction');
const mongoose = require('mongoose');

jest.mock('../../models/Transaction');

describe('Transaction Controller', () => {
  let req;
  let res;
  const mockUserId = new mongoose.Types.ObjectId();
  const mockTransactionId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
    
    req = {
      params: {},
      body: {},
      query: {}
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('getAllTransactions', () => {
    it('should get all transactions sorted by date descending', async () => {
      const mockTransactions = [
        { _id: mockTransactionId, date: new Date('2023-01-02') },
        { _id: new mongoose.Types.ObjectId(), date: new Date('2023-01-01') }
      ];
      
      Transaction.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockTransactions)
        })
      });

      await transactionController.getAllTransactions(req, res);

      expect(Transaction.find).toHaveBeenCalledWith();
      expect(Transaction.find().sort).toHaveBeenCalledWith({ date: -1 });
      expect(res.json).toHaveBeenCalledWith(mockTransactions);
    });

    it('should return 500 on server error', async () => {
      const error = new Error('Database failure');
      Transaction.find.mockImplementation(() => {
        throw error;
      });

      await transactionController.getAllTransactions(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ 
        message: 'Server error', 
        error: error.message 
      });
    });
  });

  describe('getTransactionsByUserId', () => {
    it('should get transactions for a valid user ID', async () => {
      req.params.userId = mockUserId.toString();
      const mockTransactions = [
        { user: mockUserId, amount: 100 }
      ];
      
      Transaction.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockTransactions)
        })
      });

      await transactionController.getTransactionsByUserId(req, res);

      expect(Transaction.find).toHaveBeenCalledWith({ user: mockUserId.toString() });
      expect(Transaction.find().sort).toHaveBeenCalledWith({ date: -1 });
      expect(res.json).toHaveBeenCalledWith(mockTransactions);
    });

    it('should return 400 for invalid user ID', async () => {
      req.params.userId = 'invalid-id';

      await transactionController.getTransactionsByUserId(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid user ID' });
    });

    it('should return 500 on server error', async () => {
      req.params.userId = mockUserId.toString();
      const error = new Error('Query error');
      Transaction.find.mockImplementation(() => {
        throw error;
      });

      await transactionController.getTransactionsByUserId(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ 
        message: 'Server error', 
        error: error.message 
      });
    });
  });

  describe('getTransactionById', () => {
    it('should get a transaction by ID', async () => {
      req.params.transactionId = mockTransactionId.toString();
      const mockTransaction = { _id: mockTransactionId, amount: 200 };
      
      Transaction.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockTransaction)
      });

      await transactionController.getTransactionById(req, res);

      expect(Transaction.findById).toHaveBeenCalledWith(mockTransactionId.toString());
      expect(res.json).toHaveBeenCalledWith(mockTransaction);
    });

    it('should return 400 for invalid transaction ID', async () => {
      req.params.transactionId = 'invalid-id';

      await transactionController.getTransactionById(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid transaction ID' });
    });

    it('should return 404 if transaction not found', async () => {
      req.params.transactionId = mockTransactionId.toString();
      Transaction.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null)
      });

      await transactionController.getTransactionById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Transaction not found' });
    });

    it('should return 500 on server error', async () => {
      req.params.transactionId = mockTransactionId.toString();
      const error = new Error('DB error');
      Transaction.findById.mockImplementation(() => {
        throw error;
      });

      await transactionController.getTransactionById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ 
        message: 'Server error', 
        error: error.message 
      });
    });
  });

  describe('filterTransactions', () => {
    it('should filter transactions by type', async () => {
      req.body = { type: 'income' };
      const mockTransactions = [{ type: 'income', amount: 500 }];
      
      Transaction.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockTransactions)
      });

      await transactionController.filterTransactions(req, res);

      expect(Transaction.find).toHaveBeenCalledWith({ type: 'income' });
      expect(Transaction.find().sort).toHaveBeenCalledWith({ occurrences: 1, date: -1 });
      expect(res.json).toHaveBeenCalledWith(mockTransactions);
    });

    it('should filter transactions by date range', async () => {
      req.body = { 
        startDate: '2023-01-01',
        endDate: '2023-01-31'
      };
      const mockTransactions = [{ date: new Date('2023-01-15') }];
      
      Transaction.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockTransactions)
      });

      await transactionController.filterTransactions(req, res);

      expect(Transaction.find).toHaveBeenCalledWith({
        $or: [
          { date: { $gte: new Date('2023-01-01'), $lte: new Date('2023-01-31') } },
          { occurrences: { $gte: new Date('2023-01-01'), $lte: new Date('2023-01-31') } }
        ]
      });
      expect(res.json).toHaveBeenCalledWith(mockTransactions);
    });

    it('should filter transactions by userId', async () => {
      req.body = { userId: mockUserId.toString() };
      const mockTransactions = [{ user: mockUserId }];
      
      Transaction.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockTransactions)
      });

      await transactionController.filterTransactions(req, res);

      expect(Transaction.find).toHaveBeenCalledWith({ user: mockUserId.toString() });
      expect(res.json).toHaveBeenCalledWith(mockTransactions);
    });

    it('should return 400 for invalid user ID', async () => {
      req.body = { userId: 'invalid-id' };

      await transactionController.filterTransactions(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid user ID' });
    });

    it('should return 400 for invalid type', async () => {
      req.body = { type: 'invalid' };

      await transactionController.filterTransactions(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Invalid type. Allowed values are 'income' or 'expense'."
      });
    });

    it('should return 500 on server error', async () => {
      req.body = { type: 'income' };
      const error = new Error('Filter error');
      Transaction.find.mockImplementation(() => {
        throw error;
      });

      await transactionController.filterTransactions(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ 
        message: 'Server error', 
        error: error.message 
      });
    });
  });
});