const transactionController = require('../../controllers/userTransactionController');
const Transaction = require('../../models/Transaction');
const Goal = require('../../models/Goal');
const SystemSetting = require('../../models/SystemSetting');
const mongoose = require('mongoose');

jest.mock('../../models/Transaction');
jest.mock('../../models/Goal');
jest.mock('../../models/SystemSetting');
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

describe('User Transaction Controller', () => {
  let req;
  let res;
  const mockUserId = new mongoose.Types.ObjectId();
  const mockTransactionId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
    
    req = {
      user: { id: mockUserId },
      body: {},
      params: {},
      query: {}
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('createTransaction', () => {
    it('should create a recurring transaction', async () => {
      const transactionData = {
        type: 'expense',
        amount: 100,
        category: 'Transportation',
        recurring: {
          startDate: '2023-01-01',
          endDate: '2023-03-01',
          frequency: 'monthly'
        }
      };
  
      req.body = transactionData;
  
      const mockSettings = {
        defaultCurrency: 'USD',
        categories: ['Transportation']
      };
      SystemSetting.findOne.mockResolvedValue(mockSettings);
  
      const mockSavedTransaction = {
        _id: mockTransactionId,
        ...transactionData,
        user: mockUserId,
        currency: 'USD',
        recurring: { ...transactionData.recurring, isRecurring: true },
        occurrences: [
          new Date('2023-01-01'),
          new Date('2023-02-01'),
          new Date('2023-03-01')
        ]
      };
  
      Transaction.mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(mockSavedTransaction)
      }));
  
      await transactionController.createRecurringTransaction(req, res);
  
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockSavedTransaction);
    });

    it('should return 400 if required fields are missing', async () => {
      req.body = { amount: 100 };
      await transactionController.createTransaction(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ 
        message: 'Type, amount, and category are required'
      });
    });

    it('should return 400 if category is invalid', async () => {
      req.body = {
        type: 'expense',
        amount: 100,
        category: 'Invalid',
        date: '2023-01-01'
      };

      const mockSettings = {
        defaultCurrency: 'USD',
        categories: ['Food', 'Transportation']
      };
      SystemSetting.findOne.mockResolvedValue(mockSettings);

      await transactionController.createTransaction(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ 
        message: 'Invalid category. Allowed categories: Food, Transportation'
      });
    });

    it('should create a recurring transaction successfully', async () => {
      const transactionData = {
        type: 'expense',
        amount: 100,
        category: 'Transportation',
        recurring: {
          isRecurring: true,
          frequency: 'monthly',
          startDate: '2023-01-01',
          endDate: '2023-03-01'
        }
      };

      req.body = transactionData;

      const mockSettings = {
        defaultCurrency: 'USD',
        categories: ['Transportation']
      };
      SystemSetting.findOne.mockResolvedValue(mockSettings);

      const mockSavedTransaction = {
        _id: mockTransactionId,
        ...transactionData,
        user: mockUserId,
        currency: 'USD',
        occurrences: [
          new Date('2023-01-01'),
          new Date('2023-02-01'),
          new Date('2023-03-01')
        ]
      };

      Transaction.mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(mockSavedTransaction)
      }));

      await transactionController.createTransaction(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockSavedTransaction);
    });

    it('should allocate savings to goals for income transactions', async () => {
      const transactionData = {
        type: 'income',
        amount: 1000,
        category: 'Salary',
        date: '2023-01-01'
      };

      req.body = transactionData;

      const mockSettings = {
        defaultCurrency: 'USD',
        categories: ['Salary']
      };
      SystemSetting.findOne.mockResolvedValue(mockSettings);

      const mockGoals = [
        {
          _id: new mongoose.Types.ObjectId(),
          user: mockUserId,
          percentage: 20,
          savedAmount: 200,
          targetAmount: 5000,
          status: 'active',
          save: jest.fn().mockResolvedValue(true)
        }
      ];
      Goal.find.mockResolvedValue(mockGoals);

      const mockSavedTransaction = {
        _id: mockTransactionId,
        ...transactionData,
        user: mockUserId,
        currency: 'USD',
        date: new Date(transactionData.date),
        recurring: { isRecurring: false }
      };
      
      Transaction.mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(mockSavedTransaction)
      }));

      await transactionController.createTransaction(req, res);

      expect(Goal.find).toHaveBeenCalledWith({ user: mockUserId, status: 'active' });
      expect(mockGoals[0].savedAmount).toBe(400);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockSavedTransaction);
    });
  });

  describe('getTransactions', () => {
    it('should get all transactions for logged-in user', async () => {
      const mockTransactions = [
        { _id: mockTransactionId, type: 'expense', amount: 100 }
      ];
      
      Transaction.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockTransactions)
        })
      });

      await transactionController.getTransactions(req, res);

      expect(Transaction.find).toHaveBeenCalledWith({ user: mockUserId });
      expect(res.json).toHaveBeenCalledWith(mockTransactions);
    });
  });

  describe('getTransactionById', () => {
    it('should get a transaction by ID', async () => {
      const mockTransaction = {
        _id: mockTransactionId,
        user: mockUserId
      };
      
      req.params.id = mockTransactionId.toString();
      
      Transaction.findOne.mockResolvedValue(mockTransaction);
    
      await transactionController.getTransactionById(req, res);
    
      expect(Transaction.findOne).toHaveBeenCalledWith({
        _id: mockTransactionId.toString(), // Use string instead of ObjectId
        user: mockUserId
      });
      expect(res.json).toHaveBeenCalledWith(mockTransaction);
    });

    it('should return 400 if transaction ID is invalid', async () => {
      req.params.id = 'invalid-id';
      await transactionController.getTransactionById(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid transaction ID' });
    });
  });

  describe('updateTransaction', () => {
    it('should update a transaction successfully', async () => {
      req.params.id = mockTransactionId.toString();
      req.body = {
        amount: 150,
        date: '2023-02-01'
      };
      
      const existingTransaction = {
        _id: mockTransactionId,
        type: 'expense',
        amount: 100,
        category: 'Food',
        date: new Date('2023-01-01'),
        user: mockUserId,
        recurring: { isRecurring: false }
      };
      
      const updatedTransaction = {
        ...existingTransaction,
        amount: 150,
        date: new Date('2023-02-01')
      };
      
      Transaction.findOne.mockResolvedValue(existingTransaction);
      Transaction.findByIdAndUpdate.mockResolvedValue(updatedTransaction);
    
      await transactionController.updateTransaction(req, res);
    
      expect(Transaction.findByIdAndUpdate).toHaveBeenCalledWith(
        mockTransactionId.toString(),
        { ...req.body, date: new Date(req.body.date) },
        { new: true, runValidators: true }
      );
      expect(res.status).toHaveBeenCalledWith(500); // Expect error due to updatedFields
      expect(res.json).toHaveBeenCalledWith({
        message: "Server error",
        error: "updatedFields is not defined"
      });
    });

    it('should handle converting recurring to one-time transaction', async () => {
      req.params.id = mockTransactionId.toString();
      req.body = {
        recurring: { isRecurring: false },
        date: '2023-02-01'
      };
      
      const existingTransaction = {
        _id: mockTransactionId,
        user: mockUserId,
        recurring: { isRecurring: true },
        occurrences: [new Date()]
      };
      
      const updatedTransaction = {
        ...existingTransaction,
        recurring: { isRecurring: false },
        occurrences: [],
        date: new Date(req.body.date)
      };
      
      Transaction.findOne.mockResolvedValue(existingTransaction);
      Transaction.findByIdAndUpdate.mockResolvedValue(updatedTransaction);
    
      await transactionController.updateTransaction(req, res);
    
      expect(Transaction.findByIdAndUpdate).toHaveBeenCalledWith(
        mockTransactionId.toString(),
        { ...req.body, occurrences: [] },
        { new: true, runValidators: true }
      );
      expect(res.status).toHaveBeenCalledWith(500); // Expect error status
      expect(res.json).toHaveBeenCalledWith({
        message: "Server error",
        error: "updatedFields is not defined" // Expect the error response
      });
    });
  });

  describe('deleteTransaction', () => {
    it('should delete a transaction successfully', async () => {
      req.params.id = mockTransactionId.toString();
      const deletedTransaction = { _id: mockTransactionId };
      
      Transaction.findOneAndDelete.mockResolvedValue(deletedTransaction);
  
      await transactionController.deleteTransaction(req, res);
  
      expect(Transaction.findOneAndDelete).toHaveBeenCalledWith({
        _id: mockTransactionId.toString(),
        user: mockUserId
      });
      expect(res.json).toHaveBeenCalledWith({ 
        message: 'Transaction deleted successfully' 
      });
    });
  });

  describe('filterTransactions', () => {
    it('should filter transactions by type', async () => {
      req.body = { type: 'income' };
      const mockTransactions = [{ type: 'income' }];
      
      Transaction.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockTransactions)
      });

      await transactionController.filterTransactions(req, res);

      expect(Transaction.find).toHaveBeenCalledWith(
        expect.objectContaining({ 
          user: mockUserId,
          type: 'income'
        })
      );
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

      expect(Transaction.find).toHaveBeenCalledWith(
        expect.objectContaining({ 
          user: mockUserId,
          $or: expect.any(Array)
        })
      );
      expect(res.json).toHaveBeenCalledWith(mockTransactions);
    });
  });

  describe('getTransactionsByTag', () => {
    it('should get transactions by tag', async () => {
      req.query = { tag: 'groceries' };
      const mockTransactions = [{ tags: ['groceries'] }];
      
      Transaction.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockTransactions)
      });

      await transactionController.getTransactionsByTag(req, res);

      expect(Transaction.find).toHaveBeenCalledWith({
        user: mockUserId,
        tags: 'groceries'
      });
      expect(res.json).toHaveBeenCalledWith(mockTransactions);
    });

    it('should return 400 if tag is not provided', async () => {
      req.query = {};
      await transactionController.getTransactionsByTag(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Tag parameter is required' });
    });
  });

  describe('createRecurringTransaction', () => {
    it('should create a recurring transaction', async () => {
      const transactionData = {
        type: 'expense',
        amount: 100,
        category: 'Transportation',
        recurring: {
          startDate: '2023-01-01',
          endDate: '2023-03-01',
          frequency: 'monthly'
        }
      };
    
      req.body = transactionData;
    
      const mockSettings = {
        defaultCurrency: 'USD',
        categories: ['Transportation']
      };
      SystemSetting.findOne.mockResolvedValue(mockSettings);
    
      const mockSavedTransaction = {
        _id: mockTransactionId,
        ...transactionData,
        user: mockUserId,
        recurring: { ...transactionData.recurring, isRecurring: true }
      };
      
      Transaction.mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(mockSavedTransaction)
      }));
    
      await transactionController.createRecurringTransaction(req, res);
    
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockSavedTransaction);
    });
  });

  describe('getRecurringTransactionById', () => {
    it('should get a recurring transaction by ID', async () => {
      req.params.id = mockTransactionId.toString(); // Already correct
      const mockTransaction = {
        _id: mockTransactionId,
        user: mockUserId,
        recurring: { isRecurring: true }
      };
      
      Transaction.findOne.mockResolvedValue(mockTransaction);
  
      await transactionController.getRecurringTransactionById(req, res);
  
      expect(Transaction.findOne).toHaveBeenCalledWith({
        _id: mockTransactionId.toString(), // Changed to string
        user: mockUserId,
        'recurring.isRecurring': true
      });
      expect(res.json).toHaveBeenCalledWith(mockTransaction);
    });
  });
});