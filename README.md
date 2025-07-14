# 🛒 POS System - Complete Business Management Solution

A comprehensive, offline-first Point of Sale (POS) system built with React, Node.js, SQLite, and Electron. Perfect for small to medium businesses requiring robust inventory management, sales tracking, and business analytics.

## ✨ Features

### 🏪 Core POS Features
- **Barcode Scanning**: USB barcode scanner support with auto-focus input
- **Real-time Billing**: Fast checkout with multiple payment methods
- **Inventory Management**: Complete stock tracking with expiry dates
- **Stock Approval System**: Admin approval workflow for new items
- **Expiry Management**: Automatic alerts for expired/near-expiry items
- **Low Stock Alerts**: Reorder level notifications

### 📊 Business Intelligence
- **Dashboard Analytics**: Real-time sales, expenses, and profit tracking
- **Chart Visualizations**: Sales trends, payment methods, top-selling items
- **Excel Reports**: Comprehensive business reports with automatic backup
- **Cloud Backup**: Google Drive integration for data safety

### 👥 User Management
- **Role-based Access**: Admin and Cashier roles with different permissions
- **Secure Authentication**: JWT-based authentication with password hashing
- **User Activity Tracking**: Monitor user performance and actions

### 💰 Financial Management
- **Expense Tracking**: Categorize and track business expenses
- **Profit Analysis**: Calculate profit margins and business performance
- **Payment Methods**: Support for cash, card, and mobile payments

## 🛠️ Tech Stack

### Frontend
- **React 19** with Vite for fast development
- **Tailwind CSS** for modern, responsive UI
- **React Router** for navigation
- **Chart.js** for data visualization
- **Zustand** for state management
- **Lucide React** for beautiful icons

### Backend
- **Node.js** with Express.js
- **SQLite** with better-sqlite3 for local database
- **JWT** for authentication
- **bcryptjs** for password hashing
- **ExcelJS** for report generation
- **Moment.js** for date handling

### Desktop
- **Electron** for cross-platform desktop app
- **Windows installer** support

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Windows 10+ (for desktop app)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pos-system
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Start the development servers**

   **Terminal 1 - Backend:**
   ```bash
   cd backend
   npm run dev
   ```

   **Terminal 2 - Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

### Default Login Credentials
- **Username**: `admin`
- **Password**: `admin123`

## 📁 Project Structure

```
pos-system/
├── backend/                 # Node.js API server
│   ├── models/             # Database models and initialization
│   ├── routes/             # API route handlers
│   ├── middleware/         # Authentication and validation
│   └── index.js           # Main server file
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── stores/        # Zustand state management
│   │   ├── services/      # API service layer
│   │   └── App.jsx        # Main app component
│   └── package.json
└── README.md
```

## 🔧 Configuration

### Database
The system uses SQLite for local data storage. The database file (`database.db`) is automatically created in the backend directory on first run.

### Backup Configuration
Reports are automatically saved to `POSBackups/YYYY/MM/` directory. For cloud backup:
1. Install Google Drive for Desktop
2. Sync the `POSBackups` folder to Google Drive

### Printer Setup
For receipt printing:
1. Install ESC/POS compatible printer drivers
2. Configure printer settings in the application
3. Test print functionality

## 📊 Features Overview

### Dashboard
- Real-time sales statistics
- Inventory alerts (low stock, expired items)
- Sales trend charts
- Recent transactions
- Top-selling items

### Billing
- Barcode scanner integration
- Cart management
- Multiple payment methods
- Receipt printing
- Invoice generation

### Inventory
- Add/edit stock items
- Barcode management
- Expiry date tracking
- Reorder level alerts
- Stock approval workflow

### Reports
- Sales reports (daily/weekly/monthly)
- Inventory reports
- Expense reports
- Business summary reports
- Excel export functionality

### User Management
- Create/edit users
- Role-based permissions
- Password management
- Activity tracking

## 🔒 Security Features

- **Password Hashing**: bcryptjs for secure password storage
- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: Server-side validation for all inputs
- **SQL Injection Protection**: Parameterized queries
- **Role-based Access Control**: Admin/Cashier permission system

## 📈 Business Benefits

1. **Improved Efficiency**: Fast barcode scanning and checkout
2. **Better Inventory Control**: Real-time stock tracking and alerts
3. **Data-Driven Decisions**: Comprehensive reports and analytics
4. **Cost Reduction**: Automated processes and error prevention
5. **Business Growth**: Detailed insights for strategic planning

## 🚀 Deployment

### Development
```bash
# Backend
cd backend && npm run dev

# Frontend  
cd frontend && npm run dev
```

### Production
```bash
# Build frontend
cd frontend && npm run build

# Start production server
cd backend && npm start
```

### Desktop App
```bash
# Build Electron app
cd frontend && npm run electron-build
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the code comments

## 🔄 Updates

### Version 1.0.0
- Initial release with core POS functionality
- Complete inventory management system
- User authentication and authorization
- Excel report generation
- Dashboard analytics

---

**Built with ❤️ for modern businesses** 