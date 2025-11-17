/**
 * Plaid Bank Connection Script
 * Run this once to connect your banks and get your access token
 * 
 * Usage: node connect-banks.js
 */

require('dotenv').config({ path: './functions/.env' });
const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');
const express = require('express');

// Plaid configuration
const configuration = new Configuration({
  basePath: PlaidEnvironments.sandbox, // Change to 'development' when approved
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

const plaidClient = new PlaidApi(configuration);
const app = express();
const PORT = 3000;

console.log('🚀 Starting Plaid Bank Connection...\n');

// Step 1: Create Link Token
app.get('/create_link_token', async (req, res) => {
  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: 'sam-user-id' },
      client_name: 'Sam Financial Dashboard',
      products: ['auth', 'transactions', 'liabilities'],
      country_codes: ['US'],
      language: 'en',
    });

    console.log('✅ Link token created!');
    res.json({ link_token: response.data.link_token });
  } catch (error) {
    console.error('❌ Error creating link token:', error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
});

// Step 2: Exchange Public Token for Access Token
app.post('/exchange_public_token', express.json(), async (req, res) => {
  try {
    const { public_token } = req.body;
    
    const response = await plaidClient.itemPublicTokenExchange({
      public_token: public_token,
    });

    const accessToken = response.data.access_token;
    const itemId = response.data.item_id;

    console.log('\n🎉 SUCCESS! Your access token is:\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(accessToken);
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('📋 Next steps:');
    console.log('1. Copy the access token above');
    console.log('2. Open: functions/.env');
    console.log('3. Set: PLAID_ACCESS_TOKEN=' + accessToken);
    console.log('4. Redeploy: firebase deploy --only functions\n');
    console.log('Item ID:', itemId);

    res.json({ 
      access_token: accessToken,
      item_id: itemId,
      message: 'Success! Copy the access token from the console above.'
    });
  } catch (error) {
    console.error('❌ Error exchanging token:', error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
});

// Serve the Plaid Link HTML page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Connect Your Banks - Plaid</title>
      <script src="https://cdn.plaid.com/link/v2/stable/link-initialize.js"></script>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .container {
          text-align: center;
          padding: 40px;
          background: rgba(255,255,255,0.1);
          border-radius: 20px;
          backdrop-filter: blur(10px);
        }
        h1 { margin-bottom: 20px; }
        button {
          padding: 15px 40px;
          font-size: 18px;
          background: white;
          color: #667eea;
          border: none;
          border-radius: 30px;
          cursor: pointer;
          font-weight: bold;
          transition: transform 0.2s;
        }
        button:hover {
          transform: scale(1.05);
        }
        #result {
          margin-top: 20px;
          padding: 15px;
          background: rgba(0,0,0,0.2);
          border-radius: 10px;
          display: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🏦 Connect Your Banks</h1>
        <p>Click below to securely connect Bank of America and Chase</p>
        <button id="link-button">🔗 Connect Banks</button>
        <div id="result"></div>
      </div>

      <script>
        const linkButton = document.getElementById('link-button');
        const resultDiv = document.getElementById('result');

        async function initializePlaid() {
          // Get link token from server
          const response = await fetch('/create_link_token');
          const data = await response.json();

          // Initialize Plaid Link
          const handler = Plaid.create({
            token: data.link_token,
            onSuccess: async (public_token, metadata) => {
              console.log('Public token:', public_token);
              console.log('Metadata:', metadata);

              resultDiv.innerHTML = '⏳ Exchanging token...';
              resultDiv.style.display = 'block';

              // Exchange public token for access token
              const exchangeResponse = await fetch('/exchange_public_token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ public_token })
              });

              const result = await exchangeResponse.json();
              
              resultDiv.innerHTML = 
                '✅ Success!<br><br>' +
                '📋 Check your terminal/console for the access token.<br>' +
                'Copy it and add it to your .env file!';
            },
            onExit: (err, metadata) => {
              if (err) {
                console.error('Plaid Link error:', err);
                resultDiv.innerHTML = '❌ Error: ' + err.error_message;
                resultDiv.style.display = 'block';
              }
            }
          });

          handler.open();
        }

        linkButton.addEventListener('click', initializePlaid);
      </script>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`🌐 Server running at http://localhost:${PORT}`);
  console.log('📱 OPEN THIS URL IN YOUR BROWSER:\n');
  console.log(`   👉 http://localhost:${PORT}\n`);
  console.log('⚠️  IMPORTANT: You\'re using SANDBOX mode.');
  console.log('   Use these test credentials:');
  console.log('   Username: user_good');
  console.log('   Password: pass_good\n');
});

