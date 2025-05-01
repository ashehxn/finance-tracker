const budgetController = require('../../controllers/budgetController');
const Budget = require('../../models/Budget');
const Transaction = require('../../models/Transaction');
const SystemSetting = require('../../models/SystemSetting');
const { convertCurrency } = require('../../utils/exchangeRates');
const mongoose = require('mongoose');

jest.mock('../../models/Budget');
jest.mock('../../models/Transaction');
jest.mock('../../models/SystemSetting');
jest.mock('../../utils/exchangeRates');
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

describe('Budget Controller', () => {
  let req;
  let res;
  const mockUserId = new mongoose.Types.ObjectId();
  const mockBudgetId = new mongoose.Types.ObjectId();
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

  describe('createBudget', () => {
    it('should create a single budget successfully', async () => {
      req.body = {
        name: 'Test Budget',
        amount: 1000,
        type: 'onetime',
        startDate: '2023-01-01',
        endDate: '2023-12-31'
      };
      const mockSettings = {
        defaultCurrency: 'USD',
        categories: ['Food'],
        maxBudgetLimit: 5000
      };
      SystemSetting.findOne.mockResolvedValue(mockSettings);
      const mockBudget = { _id: mockBudgetId, ...req.body, user: mockUserId, currency: 'USD', transactions: [], remainingAmount: 1000 };
      Budget.insertMany.mockResolvedValue([mockBudget]);

      await budgetController.createBudget(req, res);

      expect(SystemSetting.findOne).toHaveBeenCalled();
      expect(Budget.insertMany).toHaveBeenCalledWith([expect.objectContaining({
        user: mockUserId,
        name: 'Test Budget',
        amount: 1000,
        currency: 'USD',
        type: 'onetime',
        remainingAmount: 1000
      })]);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith([mockBudget]);
    });

    it('should create monthly budgets successfully', async () => {
      req.body = {
        name: 'Monthly Budget',
        amount: 500,
        type: 'monthly',
        startDate: '2023-01-01',
        endDate: '2023-03-31'
      };
      const mockSettings = { defaultCurrency: 'USD', categories: [], maxBudgetLimit: 1000 };
      SystemSetting.findOne.mockResolvedValue(mockSettings);
      const mockBudgets = [
        { _id: new mongoose.Types.ObjectId(), name: 'Monthly Budget - 2023-01', amount: 500, currency: 'USD', remainingAmount: 500 },
        { _id: new mongoose.Types.ObjectId(), name: 'Monthly Budget - 2023-02', amount: 500, currency: 'USD', remainingAmount: 500 },
        { _id: new mongoose.Types.ObjectId(), name: 'Monthly Budget - 2023-03', amount: 500, currency: 'USD', remainingAmount: 500 }
      ];
      Budget.insertMany.mockResolvedValue(mockBudgets);

      await budgetController.createBudget(req, res);

      expect(Budget.insertMany).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ name: 'Monthly Budget - 2023-01', remainingAmount: 500 }),
        expect.objectContaining({ name: 'Monthly Budget - 2023-02', remainingAmount: 500 }),
        expect.objectContaining({ name: 'Monthly Budget - 2023-03', remainingAmount: 500 })
      ]));
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockBudgets);
    });

    it('should return 400 if required fields are missing', async () => {
      req.body = { amount: 1000 }; // Missing name, type, etc.

      await budgetController.createBudget(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'All required fields must be provided.' });
    });

    it('should return 400 for invalid category', async () => {
      req.body = {
        name: 'Test Budget',
        amount: 1000,
        category: 'Invalid',
        type: 'onetime',
        startDate: '2023-01-01',
        endDate: '2023-12-31'
      };
      const mockSettings = { defaultCurrency: 'USD', categories: ['Food'], maxBudgetLimit: 5000 };
      SystemSetting.findOne.mockResolvedValue(mockSettings);

      await budgetController.createBudget(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid category. Allowed categories: Food' });
    });

    it('should return 400 if budget amount exceeds limit', async () => {
      req.body = {
        name: 'Test Budget',
        amount: 6000,
        type: 'onetime',
        startDate: '2023-01-01',
        endDate: '2023-12-31'
      };
      const mockSettings = { defaultCurrency: 'USD', categories: [], maxBudgetLimit: 5000 };
      SystemSetting.findOne.mockResolvedValue(mockSettings);

      await budgetController.createBudget(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Budget amount exceeds the maximum limit of 5000' });
    });

    it('should return 500 if system settings not found', async () => {
      req.body = { name: 'Test', amount: 1000, type: 'onetime', startDate: '2023-01-01', endDate: '2023-12-31' };
      SystemSetting.findOne.mockResolvedValue(null);

      await budgetController.createBudget(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'System settings not found.' });
    });
  });

  describe('getBudgets', () => {
    it('should get all budgets for the user', async () => {
      const mockBudgets = [{ _id: mockBudgetId, user: mockUserId }];
      Budget.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockBudgets)
        })
      });

      await budgetController.getBudgets(req, res);

      expect(Budget.find).toHaveBeenCalledWith({ user: mockUserId });
      expect(res.json).toHaveBeenCalledWith(mockBudgets);
    });
  });

  describe('getBudgetById', () => {
    it('should get a budget by ID', async () => {
      req.params.id = mockBudgetId.toString();
      const mockBudget = { _id: mockBudgetId, user: mockUserId };
      Budget.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockBudget)
      });

      await budgetController.getBudgetById(req, res);

      expect(Budget.findOne).toHaveBeenCalledWith({ _id: mockBudgetId.toString(), user: mockUserId });
      expect(res.json).toHaveBeenCalledWith(mockBudget);
    });

    it('should return 400 for invalid ID', async () => {
      req.params.id = 'invalid-id';

      await budgetController.getBudgetById(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid budget ID' });
    });

    it('should return 404 if budget not found', async () => {
      req.params.id = mockBudgetId.toString();
      Budget.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null)
      });

      await budgetController.getBudgetById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Budget not found' });
    });
  });

  describe('updateBudgetDetails', () => {
    it('should update budget details successfully', async () => {
      req.params.id = mockBudgetId.toString();
      req.body = { name: 'Updated Budget', amount: 1500 };
      const mockBudget = {
        _id: mockBudgetId,
        user: mockUserId,
        name: 'Old Budget',
        amount: 1000,
        save: jest.fn().mockResolvedValue({ ...req.body, _id: mockBudgetId, user: mockUserId })
      };
      Budget.findOne.mockResolvedValue(mockBudget);

      await budgetController.updateBudgetDetails(req, res);

      expect(mockBudget.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ name: 'Updated Budget', amount: 1500 }));
    });

    it('should return 400 for invalid ID', async () => {
      req.params.id = 'invalid-id';

      await budgetController.updateBudgetDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid budget ID' });
    });

    it('should return 404 if budget not found', async () => {
      req.params.id = mockBudgetId.toString();
      Budget.findOne.mockResolvedValue(null);

      await budgetController.updateBudgetDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Budget not found' });
    });

    it('should handle validation error', async () => {
      req.params.id = mockBudgetId.toString();
      req.body = { name: 'Updated Budget' };
      const mockBudget = {
        _id: mockBudgetId,
        user: mockUserId,
        save: jest.fn().mockRejectedValue({ name: 'ValidationError', message: 'Invalid data' })
      };
      Budget.findOne.mockResolvedValue(mockBudget);

      await budgetController.updateBudgetDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid data' });
    });
  });

  describe('addTransactionsToBudget', () => {
    it('should add a transaction to a budget', async () => {
      req.params.id = mockBudgetId.toString();
      req.body = { transactionId: mockTransactionId.toString() };
      const mockBudget = {
        _id: mockBudgetId,
        user: mockUserId,
        currency: 'USD',
        transactions: [],
        remainingAmount: 1000,
        type: 'onetime',
        save: jest.fn().mockResolvedValue(true)
      };
      const mockTransaction = {
        _id: mockTransactionId,
        user: mockUserId,
        amount: 200,
        currency: 'USD',
        type: 'expense',
        recurring: { isRecurring: false },
        isAssignedToBudget: false,
        save: jest.fn().mockResolvedValue(true)
      };
      Budget.findOne.mockResolvedValue(mockBudget);
      Transaction.findOne.mockResolvedValue(mockTransaction);
      convertCurrency.mockResolvedValue(200);

      await budgetController.addTransactionsToBudget(req, res);

      expect(mockBudget.transactions).toContain(mockTransactionId.toString());
      expect(mockBudget.remainingAmount).toBe(800);
      expect(mockTransaction.isAssignedToBudget).toBe(true);
      expect(res.json).toHaveBeenCalledWith(mockBudget);
    });

    it('should return 400 for invalid IDs', async () => {
      req.params.id = 'invalid-id';
      req.body = { transactionId: 'invalid-id' };

      await budgetController.addTransactionsToBudget(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid budget or transaction ID' });
    });

    it('should return 404 if budget not found', async () => {
      req.params.id = mockBudgetId.toString();
      req.body = { transactionId: mockTransactionId.toString() };
      Budget.findOne.mockResolvedValue(null);

      await budgetController.addTransactionsToBudget(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Budget not found' });
    });

    it('should return 404 if transaction not found', async () => {
      req.params.id = mockBudgetId.toString();
      req.body = { transactionId: mockTransactionId.toString() };
      const mockBudget = { _id: mockBudgetId, user: mockUserId };
      Budget.findOne.mockResolvedValue(mockBudget);
      Transaction.findOne.mockResolvedValue(null);

      await budgetController.addTransactionsToBudget(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Transaction not found' });
    });

    it('should return 400 for recurring transaction on non-category budget', async () => {
      req.params.id = mockBudgetId.toString();
      req.body = { transactionId: mockTransactionId.toString() };
      const mockBudget = { _id: mockBudgetId, user: mockUserId, type: 'onetime' };
      const mockTransaction = { _id: mockTransactionId, recurring: { isRecurring: true } };
      Budget.findOne.mockResolvedValue(mockBudget);
      Transaction.findOne.mockResolvedValue(mockTransaction);

      await budgetController.addTransactionsToBudget(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Recurring transactions can only be added to category-type budgets.'
      });
    });

    it('should return 400 if transaction is already assigned', async () => {
      req.params.id = mockBudgetId.toString();
      req.body = { transactionId: mockTransactionId.toString() };
      const mockBudget = { _id: mockBudgetId, user: mockUserId, transactions: [] };
      const mockTransaction = { _id: mockTransactionId, isAssignedToBudget: true, recurring: { isRecurring: false } };
      Budget.findOne.mockResolvedValue(mockBudget);
      Transaction.findOne.mockResolvedValue(mockTransaction);

      await budgetController.addTransactionsToBudget(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Transaction is already assigned to another budget.' });
    });

    it('should handle currency conversion', async () => {
      req.params.id = mockBudgetId.toString();
      req.body = { transactionId: mockTransactionId.toString() };
      const mockBudget = { _id: mockBudgetId, user: mockUserId, currency: 'EUR', remainingAmount: 1000, transactions: [], type: 'onetime' };
      const mockTransaction = { 
        _id: mockTransactionId, 
        user: mockUserId, 
        amount: 200, 
        currency: 'USD', 
        type: 'expense', 
        recurring: { isRecurring: false }, 
        isAssignedToBudget: false,
        save: jest.fn().mockResolvedValue(true)
      };
      Budget.findOne.mockResolvedValue(mockBudget);
      Transaction.findOne.mockResolvedValue(mockTransaction);
      convertCurrency.mockResolvedValue(180); // USD to EUR

      await budgetController.addTransactionsToBudget(req, res);

      expect(convertCurrency).toHaveBeenCalledWith(200, 'USD', 'EUR');
      expect(mockBudget.remainingAmount).toBe(820);
      expect(mockTransaction.currency).toBe('EUR');
    });

    it('should remove transaction if already added', async () => {
      req.params.id = mockBudgetId.toString();
      req.body = { transactionId: mockTransactionId.toString() };
      const mockBudget = { 
        _id: mockBudgetId, 
        user: mockUserId, 
        currency: 'USD', 
        transactions: [mockTransactionId.toString()], 
        remainingAmount: 800,
        type: 'onetime',
        save: jest.fn().mockResolvedValue(true)
      };
      const mockTransaction = { 
        _id: mockTransactionId, 
        user: mockUserId, 
        amount: 200, 
        currency: 'USD', 
        type: 'expense', 
        recurring: { isRecurring: false }, 
        isAssignedToBudget: true,
        save: jest.fn().mockResolvedValue(true)
      };
      Budget.findOne.mockResolvedValue(mockBudget);
      Transaction.findOne.mockResolvedValue(mockTransaction);

      await budgetController.addTransactionsToBudget(req, res);

      expect(mockBudget.transactions).not.toContain(mockTransactionId.toString());
      expect(mockBudget.remainingAmount).toBe(1000);
      expect(mockTransaction.isAssignedToBudget).toBe(false);
    });

    it('should handle recurring transaction with occurrences', async () => {
      req.params.id = mockBudgetId.toString();
      req.body = { transactionId: mockTransactionId.toString() };
      const mockBudget = { 
        _id: mockBudgetId, 
        user: mockUserId, 
        currency: 'USD', 
        transactions: [], 
        remainingAmount: 1000,
        type: 'category',
        save: jest.fn().mockResolvedValue(true)
      };
      const mockTransaction = { 
        _id: mockTransactionId, 
        user: mockUserId, 
        amount: 100, 
        currency: 'USD', 
        type: 'expense', 
        recurring: { isRecurring: true }, 
        occurrences: [1, 2, 3], // 3 occurrences
        isAssignedToBudget: false,
        save: jest.fn().mockResolvedValue(true)
      };
      Budget.findOne.mockResolvedValue(mockBudget);
      Transaction.findOne.mockResolvedValue(mockTransaction);

      await budgetController.addTransactionsToBudget(req, res);

      expect(mockBudget.remainingAmount).toBe(700); // 1000 - (100 * 3)
    });
  });

  describe('deleteBudget', () => {
    it('should delete a budget successfully', async () => {
      req.params.id = mockBudgetId.toString();
      const mockBudget = { _id: mockBudgetId, user: mockUserId, transactions: [mockTransactionId] };
      Budget.findOneAndDelete.mockResolvedValue(mockBudget);
      Transaction.updateMany.mockResolvedValue({});

      await budgetController.deleteBudget(req, res);

      expect(Budget.findOneAndDelete).toHaveBeenCalledWith({
        _id: mockBudgetId.toString(),
        user: mockUserId
      });
      expect(Transaction.updateMany).toHaveBeenCalledWith(
        { _id: { $in: [mockTransactionId] } },
        { $set: { isAssignedToBudget: false } }
      );
      expect(res.json).toHaveBeenCalledWith({ message: 'Budget deleted successfully' });
    });

    it('should return 400 for invalid ID', async () => {
      req.params.id = 'invalid-id';

      await budgetController.deleteBudget(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid budget ID' });
    });

    it('should return 404 if budget not found', async () => {
      req.params.id = mockBudgetId.toString();
      Budget.findOneAndDelete.mockResolvedValue(null);

      await budgetController.deleteBudget(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Budget not found' });
    });
  });

  describe('analyzeSingleBudget', () => {
    it('should recommend increase when spent > 90%', async () => {
      req.params.id = mockBudgetId.toString();
      const mockBudget = {
        _id: mockBudgetId,
        user: mockUserId,
        amount: 1000,
        remainingAmount: 50, // 95% spent
        save: jest.fn().mockResolvedValue(true)
      };
      Budget.findOne.mockResolvedValue(mockBudget);

      await budgetController.analyzeSingleBudget(req, res);

      expect(mockBudget.recommendedAdjustment.action).toBe('increase');
      expect(mockBudget.recommendedAdjustment.suggestedAmount).toBe(1100);
      expect(res.json).toHaveBeenCalledWith({ message: 'Budget analysis completed', budget: mockBudget });
    });

    it('should recommend reduce when spent < 50%', async () => {
      req.params.id = mockBudgetId.toString();
      const mockBudget = {
        _id: mockBudgetId,
        user: mockUserId,
        amount: 1000,
        remainingAmount: 600, // 40% spent
        save: jest.fn().mockResolvedValue(true)
      };
      Budget.findOne.mockResolvedValue(mockBudget);

      await budgetController.analyzeSingleBudget(req, res);

      expect(mockBudget.recommendedAdjustment.action).toBe('reduce');
      expect(mockBudget.recommendedAdjustment.suggestedAmount).toBe(800);
    });

    it('should recommend reallocate when another budget is over', async () => {
      req.params.id = mockBudgetId.toString();
      const mockBudget = {
        _id: mockBudgetId,
        user: mockUserId,
        amount: 1000,
        remainingAmount: 500, // 50% spent
        save: jest.fn().mockResolvedValue(true)
      };
      const overBudget = { _id: new mongoose.Types.ObjectId(), name: 'Over Budget', remainingAmount: -100 };
      Budget.findOne.mockImplementation((query) => {
        if (query.remainingAmount) return Promise.resolve(overBudget);
        return Promise.resolve(mockBudget);
      });

      await budgetController.analyzeSingleBudget(req, res);

      expect(mockBudget.recommendedAdjustment.action).toBe('reallocate');
      expect(mockBudget.recommendedAdjustment.suggestedAmount).toBe(100);
      expect(mockBudget.recommendedAdjustment.reason).toContain('Over Budget');
    });

    it('should return 404 if budget not found', async () => {
      req.params.id = mockBudgetId.toString();
      Budget.findOne.mockResolvedValue(null);

      await budgetController.analyzeSingleBudget(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Budget not found' });
    });
  });

  describe('analyzeBudgetAdjustments', () => {
    it('should analyze all budgets and recommend increase', async () => {
      const mockBudgets = [
        { _id: mockBudgetId, user: mockUserId, amount: 1000, remainingAmount: 50, save: jest.fn().mockResolvedValue(true) }
      ];
      Budget.find.mockResolvedValue(mockBudgets);
      Budget.findOne.mockResolvedValue(null); // No over-budget found

      await budgetController.analyzeBudgetAdjustments(req, res);

      expect(mockBudgets[0].recommendedAdjustment.action).toBe('increase');
      expect(mockBudgets[0].recommendedAdjustment.suggestedAmount).toBe(1100);
      expect(res.json).toHaveBeenCalledWith({ message: 'Budget analysis completed', budgets: mockBudgets });
    });

    it('should handle reallocation when a budget is over', async () => {
      const mockBudgets = [
        { _id: mockBudgetId, user: mockUserId, amount: 1000, remainingAmount: 500, save: jest.fn().mockResolvedValue(true) }
      ];
      const overBudget = { _id: new mongoose.Types.ObjectId(), name: 'Over Budget', remainingAmount: -100 };
      Budget.find.mockResolvedValue(mockBudgets);
      Budget.findOne.mockResolvedValue(overBudget);

      await budgetController.analyzeBudgetAdjustments(req, res);

      expect(mockBudgets[0].recommendedAdjustment.action).toBe('reallocate');
      expect(mockBudgets[0].recommendedAdjustment.suggestedAmount).toBe(100);
    });
  });
});