// jest.setup.js
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.NODE_ENV = 'test';

global.console = {
  ...console,
  // log: jest.fn(),
  // info: jest.fn(),
  // error: jest.fn(),
  // warn: jest.fn(),
};

global.testUtils = {
  createMockRequest: (body = {}, params = {}, query = {}, user = null) => ({
    body,
    params,
    query,
    user
  }),
  
  createMockResponse: () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res;
  }
};

afterAll(async () => {
});