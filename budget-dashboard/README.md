# Financial Dashboard

A sophisticated financial projection and budgeting dashboard built with React, TypeScript, and Vite. Track credit card balances, project cash flow, and simulate payment strategies to stay on top of your finances.

## Features

### 📊 Dashboard Overview
- **Real-time balance tracking** for checking, BofA, BofA 2, and Chase accounts
- **Cash flow visualization** with interactive charts
- **Account summary** with current and statement balances
- **Pending charges tracking** for upcoming transactions

### 💰 Smart Projections
- **Daily cash flow simulation** - See exactly what happens to your checking balance day-by-day
- **Multi-month projections** - Project your finances 1, 2, 3+ months into the future
- **Custom payment strategies** - Set specific payment amounts and see the impact
- **Minimum payment mode** - Simulate minimum payments until funds run out
- **Pending charge modeling** - Automatically accounts for charges that will post

### 🎯 Payment Planning
- **Pay Full** button - Instantly set payment to full statement balance
- **Warning system** - Red alerts when payments would drive checking negative
- **Payment strategy editor** - Edit payment amounts inline with real-time preview
- **Multi-cycle planning** - Build out payment strategies month-by-month

### 📈 Detailed Projections
- **Cash Flow Table** - Daily breakdown with paychecks, spending, rent, and payments
- **Balance tracking** - Monitor all account balances as they change daily
- **Statement projections** - See what next month's statements will look like
- **Negative balance highlighting** - Visual warnings for dangerous cash flow

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build tool**: Vite
- **Styling**: CSS3 with CSS modules
- **Charts**: Recharts
- **Data Format**: Excel (.xlsx) parsing
- **Hosting**: Firebase Hosting
- **Database**: Firebase (for future backend sync)

## Getting Started

### Prerequisites
- Node.js 16+
- npm or yarn

### Installation

```bash
cd budget-dashboard
npm install
```

### Development

```bash
npm run dev
```

Server will start at `http://localhost:5173`

### Build

```bash
npm run build
```

### Deploy to Firebase

```bash
npm run build
firebase deploy
```

## Project Structure

```
src/
├── components/
│   ├── AccountSummary.tsx       # Account balances and payment strategy editor
│   ├── BalanceChart.tsx         # Visual balance charts
│   ├── CashFlowTable.tsx        # Daily projection table
│   ├── Dashboard.tsx            # Main dashboard layout
│   ├── EditableWidget.tsx       # Reusable editable balance widget
│   ├── QuickUpdateModal.tsx     # Quick edit modal for balances/rules
│   ├── UpcomingPayments.tsx     # Upcoming payment summary
│   └── PendingCharges.tsx       # Pending charges display
├── utils/
│   └── projectionEngine.ts      # Core financial projection logic
├── types/
│   └── index.ts                 # TypeScript interfaces
├── App.tsx                       # App entry point with Excel parsing
└── main.tsx                      # React DOM mount point
```

## How It Works

### Data Flow
1. **Excel Upload** - App parses `.xlsx` file with account data
2. **State Management** - Balances and rules stored in React state + localStorage
3. **Projection Engine** - Daily simulation of cash flow and balance changes
4. **Real-time Updates** - Edits immediately recalculate projections
5. **Display** - Multiple views show different aspects of the projection

### Projection Engine
The core of the app is the projection engine (`projectionEngine.ts`):

- **Daily simulation** - Iterates through each day and applies transactions
- **Pending charges** - Automatically posts in first 1-2 days of projection
- **Paydays** - Bi-weekly income deposits (based on reference date)
- **Spending** - Weekly charges to credit card
- **Rent** - Monthly fixed expense
- **Payments** - Credit card payments on specified day of month
- **Statement tracking** - Tracks what will be on next month's statements

### Multi-Month Projections
- First month: Uses current balances (including pending charges)
- Additional months: Uses ending balances from previous month as starting point
- Continuous dates: Each month continues from where previous ended
- Minimum payment mode: Can simulate paying only statement balance until negative

## Key Features Explained

### Pending Charges
- Separate from current balance in the UI
- Automatically added to projections in first 1-2 days
- Critical for accurate multi-month forecasting

### Statement Balance vs Current Balance
- **Current**: What you actually have charged to the card today
- **Statement**: What will appear on your next official statement
- **Difference**: Pending charges that will post soon

### Warning System
- Red highlights on payment cards when it would cause negative cash
- Red highlighting in cash flow table for negative checking balance
- Pulsing "⚠️ Will go negative" warning badge

### Cash Flow Reality
- Shows actual payments without buffers
- Allows checking to go negative to show true cash flow implications
- Helps identify when you'd run out of cash

## Usage Guide

### Basic Setup
1. Prepare an Excel file with your account data (see `SETUP_GUIDE.md`)
2. Load the Excel file in the app
3. View your current financial state in the dashboard

### Plan Your Payments
1. Edit payment amounts in the "PAYMENT STRATEGY" section
2. Watch the projections update in real-time
3. See warnings if payments would go negative

### Project Forward
1. Click "Project +1 Month Further" to add another month
2. Set specific payments for that month
3. Continue adding months to build a complete payment plan

### Simulate Scenarios
1. Build a realistic payment strategy through April
2. Click "Minimum Payments (Till Negative)" to see worst-case scenario
3. Adjust payments to avoid running out of cash

## Files to Know

- `budget.xlsx` - Sample financial data
- `SETUP_GUIDE.md` - Detailed setup instructions
- `DEPLOY.md` - Firebase deployment guide
- `.firebase/hosting.ZGlzdA.cache` - Firebase hosting cache (auto-generated)

## Future Improvements

### Backend Migration
- Move projection engine to Firebase Cloud Functions
- API endpoints for calculating projections
- Improved performance for heavy calculations
- Better data security

### Features
- Bill tracking and reminders
- Investment portfolio tracking
- Savings goals
- Budget categories and tracking
- Multiple user accounts
- Data export/import
- Mobile app

### Data Persistence
- Auto-save to Firebase
- Sync across devices
- Historical projections
- Undo/redo support

## Deployment

Currently deployed on Firebase at: https://findash-f9cad.web.app

See `DEPLOY.md` for detailed deployment instructions.

## Troubleshooting

### Build Errors
```bash
npm run build  # Full rebuild with type checking
```

### Excel Not Loading
- Verify file format is `.xlsx`
- Check console for parsing errors
- Ensure all required columns are present

### Projections Not Updating
- Check browser console for errors
- Verify payment amounts are set
- Try refreshing the page

### localStorage Issues
- Press `Ctrl+Alt+R` to reset all data
- Or manually clear: `localStorage.clear()`

## License

Private project - All rights reserved

## Contact

For questions about this project, contact the developer.
