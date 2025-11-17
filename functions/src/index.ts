import {setGlobalOptions} from "firebase-functions";
import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {Configuration, PlaidApi, PlaidEnvironments} from "plaid";

setGlobalOptions({maxInstances: 10});

// Plaid configuration
const configuration = new Configuration({
  // Change to 'development' when you get access
  basePath: PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID || "",
      "PLAID-SECRET": process.env.PLAID_SECRET || "",
    },
  },
});

const plaidClient = new PlaidApi(configuration);

/**
 * Cloud Function to fetch balances from Plaid
 * Usage: GET https://your-project.cloudfunctions.net/getBalances
 */
export const getBalances = onRequest(
  {cors: true}, // Enable CORS so your React app can call it
  async (request, response) => {
    try {
      logger.info("Fetching balances from Plaid");

      // Your Plaid access token (you'll add this after connecting banks)
      const accessToken = process.env.PLAID_ACCESS_TOKEN || "";

      if (!accessToken) {
        response.status(400).json({
          error: "No access token configured. Connect your banks first.",
        });
        return;
      }

      // Fetch account balances
      const balancesResponse = await plaidClient.accountsBalanceGet({
        access_token: accessToken,
      });

      const accounts = balancesResponse.data.accounts;

      // Fetch liabilities (credit cards, loans) for detailed info
      let liabilities = null;
      try {
        const liabilitiesResponse = await plaidClient.liabilitiesGet({
          access_token: accessToken,
        });
        liabilities = liabilitiesResponse.data.liabilities;
      } catch (error) {
        logger.warn("Liabilities not available", error);
      }

      // Fetch recent transactions
      let transactions: any[] = [];
      try {
        const now = new Date();
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(now.getDate() - 30);

        const transactionsResponse = await plaidClient.transactionsGet({
          access_token: accessToken,
          start_date: thirtyDaysAgo.toISOString().split("T")[0],
          end_date: now.toISOString().split("T")[0],
        });
        transactions = transactionsResponse.data.transactions;
      } catch (error) {
        logger.warn("Transactions not available", error);
      }

      // Parse accounts and return structured data
      const result = {
        checking: 0,
        bofaCard1: 0,
        bofaCard2: 0,
        chase: 0,
        accounts: accounts.map((account) => {
          // Find matching credit card liability data
          const creditCard = liabilities?.credit?.find(
            (cc) => cc.account_id === account.account_id
          );

          return {
            id: account.account_id,
            name: account.name,
            type: account.type,
            subtype: account.subtype,
            balance: account.balances.current,
            available: account.balances.available,
            limit: account.balances.limit,
            // Credit card specific data
            creditCard: creditCard ? {
              aprs: creditCard.aprs,
              isOverdue: creditCard.is_overdue,
              lastPaymentAmount: creditCard.last_payment_amount,
              lastPaymentDate: creditCard.last_payment_date,
              lastStatementBalance: creditCard.last_statement_balance,
              lastStatementIssueDate: creditCard.last_statement_issue_date,
              minimumPaymentAmount: creditCard.minimum_payment_amount,
              nextPaymentDueDate: creditCard.next_payment_due_date,
            } : null,
          };
        }),
        // Recent transactions (last 30 days)
        recentTransactions: transactions.slice(0, 20).map((tx) => ({
          id: tx.transaction_id,
          date: tx.date,
          name: tx.name,
          amount: tx.amount,
          category: tx.category,
          pending: tx.pending,
          accountId: tx.account_id,
        })),
        lastUpdated: new Date().toISOString(),
      };

      logger.info("Successfully fetched data", {
        accounts: accounts.length,
        transactions: transactions.length,
      });
      response.json(result);
    } catch (error) {
      logger.error("Error fetching balances", error);
      response.status(500).json({
        error: "Failed to fetch balances",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

/**
 * Test endpoint to verify Cloud Functions are working
 */
export const hello = onRequest((request, response) => {
  logger.info("Hello endpoint called");
  response.send("🚀 Plaid integration is ready!");
});
