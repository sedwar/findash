# 💰 Budget Dashboard

A modern, interactive budgeting application built with React, TypeScript, and Firebase.

## Features

- 📊 **Visual Data Analytics**: Beautiful charts and graphs to visualize your spending patterns
- 💳 **Transaction Management**: View, filter, and sort all your transactions
- 📈 **Category Breakdown**: See spending by category with interactive pie charts
- 💰 **Financial Overview**: Track income, expenses, and net balance
- 📱 **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- 🔄 **Excel Import**: Import your budget data from Excel spreadsheets

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Firebase account (for hosting)

### Installation

1. Clone the repository or navigate to the project directory:
```bash
cd budget-dashboard
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

## Excel File Format

Your Excel file should follow this structure:

| Date | Description | Category | Amount | Type |
|------|-------------|----------|--------|------|
| 2024-01-01 | Salary | Income | 5000 | income |
| 2024-01-02 | Groceries | Food | -150 | expense |
| 2024-01-03 | Rent | Housing | -1200 | expense |

## Firebase Deployment

### Initial Setup

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

3. Initialize Firebase in your project:
```bash
firebase init
```
   - Select "Hosting"
   - Choose your Firebase project or create a new one
   - Set `dist` as your public directory
   - Configure as a single-page app: Yes
   - Don't overwrite index.html

4. Update `.firebaserc` with your project ID:
```json
{
  "projects": {
    "default": "your-firebase-project-id"
  }
}
```

### Deploy to Firebase

1. Build your project:
```bash
npm run build
```

2. Deploy to Firebase:
```bash
firebase deploy
```

Your app will be live at `https://your-project-id.web.app`

## Project Structure

```
budget-dashboard/
├── public/
│   └── budget.xlsx          # Default budget file
├── src/
│   ├── components/
│   │   ├── Dashboard.tsx    # Main dashboard component
│   │   ├── SummaryCards.tsx # Financial summary cards
│   │   ├── CategoryChart.tsx # Pie chart for categories
│   │   ├── TrendChart.tsx   # Bar chart for overview
│   │   └── TransactionList.tsx # Transaction table
│   ├── App.tsx              # Main app component
│   ├── types.ts             # TypeScript types
│   └── main.tsx             # Entry point
├── firebase.json            # Firebase configuration
└── package.json
```

## Technologies Used

- **React 18**: Modern UI framework
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and dev server
- **Recharts**: Beautiful, composable charts
- **XLSX**: Excel file parsing
- **Firebase**: Hosting and deployment

## Future Enhancements

- 🏦 **Bank Integration**: Connect to Chase, Bank of America, and other banks for real-time data
- 📝 **Manual Entry**: Add transactions manually through a form
- 🎯 **Budget Goals**: Set and track budget goals by category
- 📅 **Date Range Filtering**: Filter transactions by date range
- 💾 **Data Persistence**: Save data to Firebase Firestore
- 🔐 **User Authentication**: Multi-user support with Firebase Auth
- 📧 **Email Reports**: Receive monthly budget summaries
- 🔔 **Spending Alerts**: Get notified when exceeding budget limits

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `firebase deploy` - Deploy to Firebase

## License

MIT License - feel free to use this for your personal budgeting needs!

## Support

If you encounter any issues or have questions, please open an issue on the repository.

---

Built with ❤️ for better financial management


