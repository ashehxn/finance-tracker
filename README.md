[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/xIbq4TFL)

# Personal Finance Tracker API - IT22347244

A secure RESTful API for managing personal finances, tracking expenses, setting budgets, and analyzing spending trends. This system supports multiple user roles, secure authentication, and comprehensive financial management capabilities.

## Table of Contents

- [Features](#features)
- [Technologies Used](#technologies-used)
- [Setup and Installation](#setup-and-installation)
- [API Documentation](#api-documentation)
- [Running Tests](#running-tests)
- [Security](#security)
- [Project Structure](#project-structure)

## Features

### User Management

- Multiple user roles (Admin and Regular users)
- Secure authentication using JWT
- Role-based access control

### Transaction Management

- CRUD operations for income and expense entries
- Categorization of expenses
- Custom transaction tagging
- Support for recurring transactions

### Budget Management

- Set monthly or category-specific budgets
- Budget notifications
- Budget adjustment recommendations

### Financial Reporting

- Spending trends analysis
- Income vs. expenses visualization
- Category and tag-based filters

### Goals and Savings

- Set and track financial goals
- Visual progress indicators
- Automatic savings allocation

### Notifications System

- Unusual spending alerts
- Bill payment reminders
- Budget threshold notifications

### Multi-Currency Support

- Manage finances in multiple currencies
- Real-time exchange rate updates

### Role-Based Dashboards

- Admin dashboard with system-wide insights
- User dashboard with personalized financial summaries

## Technologies Used

- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Authentication**: JSON Web Tokens (JWT)
- **Security**: Helmet, CORS
- **Scheduling**: Node-cron
- **Logging**: Morgan, Winston
- **Testing**: Jest

## Setup and Installation

### Prerequisites

- Node.js (v14.x or higher)
- MongoDB (local or Atlas connection)
- npm or yarn

### Installation Steps

1. Clone the repository

```bash
git clone https://github.com/SE1020-IT2070-OOP-DSA-25/project-ashehxn.git
```

2. Install dependencies

```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:

```
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=30d
NODE_ENV=development
```

4. Start the server

```bash
nodemon server.js
```

The API will be available at `http://localhost:5000`

## API Documentation

### Authentication Routes

| Method | Endpoint             | Description                 | Access  |
| ------ | -------------------- | --------------------------- | ------- |
| POST   | `/api/auth/register` | Register a new user         | Public  |
| POST   | `/api/auth/login`    | Login to get token          | Public  |
| POST   | `/api/auth/logout`   | Logout and invalidate token | Private |
| GET    | `/api/auth/me`       | Get current user info       | Private |

### User Management Routes (Admin)

| Method | Endpoint          | Description       | Access  |
| ------ | ----------------- | ----------------- | ------- |
| GET    | `/api/users`      | Get all users     | Admin   |
| GET    | `/api/users/role` | Get users by role | Admin   |
| GET    | `/api/users/:id`  | Get specific user | Admin   |
| PUT    | `/api/users/:id`  | Update user       | Private |
| DELETE | `/api/users/:id`  | Delete user       | Admin   |

### User Transaction Routes

| Method | Endpoint                              | Description                  | Access |
| ------ | ------------------------------------- | ---------------------------- | ------ |
| POST   | `/api/userTransactions`               | Create new transaction       | User   |
| GET    | `/api/userTransactions`               | Get all user transactions    | User   |
| GET    | `/api/userTransactions/:id`           | Get specific transaction     | User   |
| PUT    | `/api/userTransactions/:id`           | Update transaction           | User   |
| DELETE | `/api/userTransactions/:id`           | Delete transaction           | User   |
| GET    | `/api/userTransactions/filter/tag`    | Get transactions by tag      | User   |
| POST   | `/api/userTransactions/filter`        | Filter transactions          | User   |
| POST   | `/api/userTransactions/recurring`     | Create recurring transaction | User   |
| GET    | `/api/userTransactions/recurring/:id` | Get recurring transaction    | User   |

### Admin Transaction Routes

| Method | Endpoint                                | Description              | Access |
| ------ | --------------------------------------- | ------------------------ | ------ |
| GET    | `/api/adminTransactions`                | Get all transactions     | Admin  |
| GET    | `/api/adminTransactions/user/:userId`   | Get user's transactions  | Admin  |
| GET    | `/api/adminTransactions/:transactionId` | Get specific transaction | Admin  |
| POST   | `/api/adminTransactions/filter`         | Filter transactions      | Admin  |

### Budget Routes

| Method | Endpoint                   | Description                           | Access |
| ------ | -------------------------- | ------------------------------------- | ------ |
| POST   | `/api/budgets`             | Create new budget                     | User   |
| GET    | `/api/budgets`             | Get all user budgets                  | User   |
| GET    | `/api/budgets/analyze`     | Get budget adjustment recommendations | User   |
| GET    | `/api/budgets/analyze/:id` | Analyze single budget                 | User   |
| GET    | `/api/budgets/:id`         | Get specific budget                   | User   |
| PUT    | `/api/budgets/:id`         | Update budget                         | User   |
| PUT    | `/api/budgets/add/:id`     | Add transactions to budget            | User   |
| DELETE | `/api/budgets/:id`         | Delete budget                         | User   |

### User Report Routes

| Method | Endpoint                    | Description                   | Access |
| ------ | --------------------------- | ----------------------------- | ------ |
| GET    | `/api/userReports/trends`   | Get spending trends           | User   |
| GET    | `/api/userReports/summary`  | Get income vs expense summary | User   |
| GET    | `/api/userReports/category` | Get spending by category      | User   |
| GET    | `/api/userReports/tags`     | Get spending by tag           | User   |

### Admin Report Routes

| Method | Endpoint                    | Description                   | Access |
| ------ | --------------------------- | ----------------------------- | ------ |
| GET    | `/api/adminReports/trends`  | Get overall spending trends   | Admin  |
| GET    | `/api/adminReports/summary` | Get overall income vs expense | Admin  |

### Goal Routes

| Method | Endpoint         | Description        | Access |
| ------ | ---------------- | ------------------ | ------ |
| POST   | `/api/goals`     | Create new goal    | User   |
| GET    | `/api/goals`     | Get all user goals | User   |
| GET    | `/api/goals/:id` | Get specific goal  | User   |
| PUT    | `/api/goals/:id` | Update goal        | User   |
| DELETE | `/api/goals/:id` | Delete goal        | User   |

### Notification Routes

| Method | Endpoint                      | Description               | Access |
| ------ | ----------------------------- | ------------------------- | ------ |
| GET    | `/api/notifications`          | Get user notifications    | User   |
| PUT    | `/api/notifications/:id/read` | Mark notification as read | User   |
| DELETE | `/api/notifications/:id`      | Delete notification       | User   |

### System Settings Routes (Admin)

| Method | Endpoint              | Description            | Access |
| ------ | --------------------- | ---------------------- | ------ |
| GET    | `/api/systemSettings` | Get system settings    | Admin  |
| PUT    | `/api/systemSettings` | Update system settings | Admin  |

### Dashboard Routes

| Method | Endpoint               | Description         | Access |
| ------ | ---------------------- | ------------------- | ------ |
| GET    | `/api/dashboard/user`  | Get user dashboard  | User   |
| GET    | `/api/dashboard/admin` | Get admin dashboard | Admin  |

## Running Tests

This project has comprehensive test coverage for all components:

### Running All Tests

```bash
npm test
```

### Running Specific Test Suites

```bash
# Run auth tests
npm test -- auth

# Run transaction tests
npm test -- transaction

# Run budget tests
npm test -- budget
```

### Test Coverage Report

```bash
npm run test:coverage
```

## Security

The API implements several security best practices:

- JWT authentication for secure user sessions
- Role-based access control for proper authorization
- Request sanitization to prevent injection attacks
- Helmet middleware for securing HTTP headers
- CORS configuration to control API access
- Encrypted sensitive data storage
- Rate limiting to prevent brute force attacks

## Project Structure

```
personal-finance-tracker-api/
├── config/
│   └── db.js
├── controllers/
│   ├── adminReportController.js
│   ├── adminTransactionController.js
│   ├── authController.js
│   ├── budgetController.js
│   ├── dashboardController.js
│   ├── goalController.js
│   ├── notificationController.js
│   ├── systemSettingController.js
│   ├── userController.js
│   ├── userReportController.js
│   └── userTransactionController.js
├── middleware/
│   ├── authMiddleware.js
├── models/
│   ├── Budget.js
│   ├── Goal.js
│   ├── Notification.js
│   ├── SystemSetting.js
│   ├── Transaction.js
│   └── User.js
├── routes/
│   ├── adminReportRoutes.js
│   ├── adminTransactionRoutes.js
│   ├── authRoutes.js
│   ├── budgetRoutes.js
│   ├── dashboardRoutes.js
│   ├── goalRoutes.js
│   ├── notificationRoutes.js
│   ├── systemSettingRoutes.js
│   ├── userReportRoutes.js
│   ├── userRoutes.js
│   └── userTransactionRoutes.js
├── tests/
│   ├── adminReportController.test.js
│   ├── adminTransactionController.test.js
│   ├── authController.test.js
│   ├── authMiddleware.test.js
│   ├── budgetController.test.js
│   ├── dashboardController.test.js
│   ├── goalController.test.js
│   ├── notificationController.test.js
│   ├── systemSettingController.test.js
│   ├── userController.test.js
│   ├── userReportController.test.js
│   └── userTransactionController.test.js
├── utils/
│   ├── exchangeRates.js
│   ├── logger.js
│   └── scheduleNotifications.js
├── logs/
│   ├── activity.log
│   ├── error.log
│   ├── warn.log
├── .env
├── .gitignore
├── server.js
├── jest.config.js
├── jest.setup.js
├── package.json
├── package-lock.json
└── README.md
```
