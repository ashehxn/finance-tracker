const systemSettingsController = require('../../controllers/systemSettingController'); // Adjust path as needed
const SystemSetting = require('../../models/SystemSetting');
const mongoose = require('mongoose');

jest.mock('../../models/SystemSetting');
jest.mock('../../utils/logger', () => ({
  warn: jest.fn(),
  error: jest.fn()
}));

describe('System Settings Controller', () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    
    req = {
      body: {},
      params: {},
      query: {}
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('getSystemSettings', () => {
    it('should get system settings successfully', async () => {
      const mockSettings = {
        _id: new mongoose.Types.ObjectId(),
        defaultCurrency: 'USD',
        categories: ['Food', 'Travel'],
        maxBudgetLimit: 10000
      };
      SystemSetting.findOne.mockResolvedValue(mockSettings);

      await systemSettingsController.getSystemSettings(req, res);

      expect(SystemSetting.findOne).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockSettings);
    });

    it('should return 404 if system settings not found', async () => {
      SystemSetting.findOne.mockResolvedValue(null);

      await systemSettingsController.getSystemSettings(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'System settings not found' });
    });

    it('should return 500 on server error', async () => {
      const error = new Error('Database error');
      SystemSetting.findOne.mockRejectedValue(error);

      await systemSettingsController.getSystemSettings(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Server error',
        error: error.message
      });
    });
  });

  describe('updateSystemSettings', () => {
    it('should update existing system settings successfully', async () => {
      req.body = {
        defaultCurrency: 'EUR',
        categories: ['Food', 'Entertainment'],
        maxBudgetLimit: 20000
      };
      const mockSettings = {
        _id: new mongoose.Types.ObjectId(),
        defaultCurrency: 'USD',
        categories: ['Food', 'Travel'],
        maxBudgetLimit: 10000,
        save: jest.fn().mockResolvedValue(true)
      };
      SystemSetting.findOne.mockResolvedValue(mockSettings);

      await systemSettingsController.updateSystemSettings(req, res);

      expect(SystemSetting.findOne).toHaveBeenCalled();
      expect(mockSettings.defaultCurrency).toBe('EUR');
      expect(mockSettings.categories).toEqual(['Food', 'Entertainment']);
      expect(mockSettings.maxBudgetLimit).toBe(20000);
      expect(mockSettings.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        message: 'System settings updated successfully',
        settings: mockSettings
      });
    });

    it('should create new system settings if none exist', async () => {
      req.body = {
        defaultCurrency: 'EUR',
        categories: ['Food', 'Entertainment'],
        maxBudgetLimit: 20000
      };
      SystemSetting.findOne.mockResolvedValue(null);
      const mockNewSettings = {
        defaultCurrency: 'EUR',
        categories: ['Food', 'Entertainment'],
        maxBudgetLimit: 20000,
        save: jest.fn().mockResolvedValue(true)
      };
      SystemSetting.mockImplementation(() => mockNewSettings);

      await systemSettingsController.updateSystemSettings(req, res);

      expect(SystemSetting.findOne).toHaveBeenCalled();
      expect(mockNewSettings.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        message: 'System settings updated successfully',
        settings: mockNewSettings
      });
    });

    it('should update only provided fields', async () => {
      req.body = { defaultCurrency: 'EUR' };
      const mockSettings = {
        _id: new mongoose.Types.ObjectId(),
        defaultCurrency: 'USD',
        categories: ['Food', 'Travel'],
        maxBudgetLimit: 10000,
        save: jest.fn().mockResolvedValue(true)
      };
      SystemSetting.findOne.mockResolvedValue(mockSettings);

      await systemSettingsController.updateSystemSettings(req, res);

      expect(mockSettings.defaultCurrency).toBe('EUR');
      expect(mockSettings.categories).toEqual(['Food', 'Travel']); // Unchanged
      expect(mockSettings.maxBudgetLimit).toBe(10000); // Unchanged
      expect(mockSettings.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        message: 'System settings updated successfully',
        settings: mockSettings
      });
    });

    it('should return 500 on server error', async () => {
      req.body = { defaultCurrency: 'EUR' };
      const error = new Error('Save error');
      SystemSetting.findOne.mockRejectedValue(error);

      await systemSettingsController.updateSystemSettings(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Server error',
        error: error.message
      });
    });
  });
});