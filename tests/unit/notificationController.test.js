const notificationController = require('../../controllers/notificationController'); // Adjust path as needed
const Notification = require('../../models/Notification');
const mongoose = require('mongoose');

jest.mock('../../models/Notification');

describe('Notification Controller', () => {
  let req;
  let res;
  const mockUserId = new mongoose.Types.ObjectId();
  const mockNotificationId = new mongoose.Types.ObjectId();

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

  describe('getNotifications', () => {
    it('should get all notifications for the user', async () => {
      const mockNotifications = [
        { _id: mockNotificationId, user: mockUserId, message: 'Test notification' }
      ];
      Notification.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockNotifications)
      });

      await notificationController.getNotifications(req, res);

      expect(Notification.find).toHaveBeenCalledWith({ user: mockUserId.toString() });
      expect(Notification.find().sort).toHaveBeenCalledWith({ timestamp: -1 });
      expect(res.json).toHaveBeenCalledWith(mockNotifications);
    });

    it('should get only unread notifications when unread query is true', async () => {
      req.query.unread = 'true';
      const mockNotifications = [
        { _id: mockNotificationId, user: mockUserId, readStatus: 'unread' }
      ];
      Notification.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockNotifications)
      });

      await notificationController.getNotifications(req, res);

      expect(Notification.find).toHaveBeenCalledWith({
        user: mockUserId.toString(),
        readStatus: 'unread'
      });
      expect(Notification.find().sort).toHaveBeenCalledWith({ timestamp: -1 });
      expect(res.json).toHaveBeenCalledWith(mockNotifications);
    });

    it('should return empty array when no notifications exist', async () => {
      Notification.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([])
      });

      await notificationController.getNotifications(req, res);

      expect(res.json).toHaveBeenCalledWith([]);
    });

    it('should return 500 on server error', async () => {
      const error = new Error('Database error');
      Notification.find.mockImplementation(() => {
        throw error;
      });

      await notificationController.getNotifications(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Server error',
        error: error.message
      });
    });
  });

  describe('markNotificationAsRead', () => {
    it('should mark a notification as read', async () => {
      req.params.id = mockNotificationId.toString();
      const mockNotification = {
        _id: mockNotificationId,
        user: mockUserId,
        readStatus: 'unread',
        save: jest.fn().mockResolvedValue(true)
      };
      Notification.findOne.mockResolvedValue(mockNotification);

      await notificationController.markNotificationAsRead(req, res);

      expect(Notification.findOne).toHaveBeenCalledWith({
        _id: mockNotificationId.toString(),
        user: mockUserId.toString()
      });
      expect(mockNotification.readStatus).toBe('read');
      expect(mockNotification.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: 'Notification marked as read' });
    });

    it('should return 404 if notification not found', async () => {
      req.params.id = mockNotificationId.toString();
      Notification.findOne.mockResolvedValue(null);

      await notificationController.markNotificationAsRead(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Notification not found' });
    });

    it('should return 500 on server error', async () => {
      req.params.id = mockNotificationId.toString();
      const error = new Error('Save error');
      Notification.findOne.mockRejectedValue(error);

      await notificationController.markNotificationAsRead(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Server error',
        error: error.message
      });
    });
  });

  describe('deleteNotification', () => {
    it('should delete a notification successfully', async () => {
      req.params.id = mockNotificationId.toString();
      const mockNotification = {
        _id: mockNotificationId,
        user: mockUserId
      };
      Notification.findOneAndDelete.mockResolvedValue(mockNotification);

      await notificationController.deleteNotification(req, res);

      expect(Notification.findOneAndDelete).toHaveBeenCalledWith({
        _id: mockNotificationId.toString(),
        user: mockUserId.toString()
      });
      expect(res.json).toHaveBeenCalledWith({ message: 'Notification deleted successfully' });
    });

    it('should return 404 if notification not found', async () => {
      req.params.id = mockNotificationId.toString();
      Notification.findOneAndDelete.mockResolvedValue(null);

      await notificationController.deleteNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Notification not found' });
    });

    it('should return 500 on server error', async () => {
      req.params.id = mockNotificationId.toString();
      const error = new Error('Delete error');
      Notification.findOneAndDelete.mockRejectedValue(error);

      await notificationController.deleteNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Server error',
        error: error.message
      });
    });
  });
});