// server.js
import express from 'express';
import Web3 from 'web3';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

console.log('🚀 Starting Credit Score Backend with IPFS...');

// Load deployment configuration
function loadDeploymentConfig() {
    try {
        const configPath = path.join(__dirname, 'config', 'deployment.json');
        if (fs.existsSync(configPath)) {
            const configData = fs.readFileSync(configPath, 'utf8');
            const config = JSON.parse(configData);
            console.log('✅ Loaded deployment config from file');
            return config;
        } else {
            throw new Error('Deployment config file not found');
        }
    } catch (error) {
        console.log('❌ Failed to load deployment config:', error.message);
        console.log('⚠️  Using environment variables as fallback');
        return {
            contractAddress: process.env.CONTRACT_ADDRESS,
            network: process.env.NETWORK || 'sepolia',
            deployedAt: new Date().toISOString(),
            contractABI: [],
            frontendConfig: {
                rpcUrl: process.env.SEPOLIA_RPC_URL,
                chainId: 11155111,
                networkName: 'Sepolia Testnet'
            }
        };
    }
}

const deploymentConfig = loadDeploymentConfig();

// Get configurations
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
const CONTRACT_ADDRESS = deploymentConfig.contractAddress;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const PORT = process.env.PORT || 3001;

console.log('📄 Using contract:', CONTRACT_ADDRESS);
console.log('🌐 Network:', deploymentConfig.network);

// Initialize Web3
const web3 = new Web3(SEPOLIA_RPC_URL);

// Use ABI from deployment config or fallback
const CONTRACT_ABI =
    deploymentConfig.contractABI && deploymentConfig.contractABI.length > 0
        ? deploymentConfig.contractABI
        : [
              {
                  inputs: [],
                  stateMutability: 'nonpayable',
                  type: 'constructor'
              },
              {
                  anonymous: false,
                  inputs: [
                      { indexed: true, name: 'requestId', type: 'bytes32' },
                      { indexed: true, name: 'requester', type: 'address' },
                      { indexed: false, name: 'userId', type: 'string' },
                      { indexed: false, name: 'userName', type: 'string' },
                      { indexed: false, name: 'timestamp', type: 'uint256' }
                  ],
                  name: 'CreditScoreRequested',
                  type: 'event'
              },
              {
                  anonymous: false,
                  inputs: [
                      { indexed: true, name: 'requestId', type: 'bytes32' },
                      { indexed: false, name: 'userId', type: 'string' },
                      { indexed: false, name: 'creditScore', type: 'uint256' },
                      { indexed: false, name: 'timestamp', type: 'uint256' },
                      { indexed: false, name: 'ipfsCID', type: 'string' }
                  ],
                  name: 'CreditScoreReceived',
                  type: 'event'
              },
              {
                  inputs: [
                      { name: '_requestId', type: 'bytes32' },
                      { name: '_userId', type: 'string' },
                      { name: '_creditScore', type: 'uint256' },
                      { name: '_ipfsCID', type: 'string' }
                  ],
                  name: 'fulfillCreditScore',
                  outputs: [],
                  stateMutability: 'nonpayable',
                  type: 'function'
              },
              {
                  inputs: [
                      { name: '_userId', type: 'string' },
                      { name: '_userName', type: 'string' }
                  ],
                  name: 'requestCreditScore',
                  outputs: [{ name: '', type: 'bytes32' }],
                  stateMutability: 'nonpayable',
                  type: 'function'
              }
          ];

// IPFS Configuration
const ipfsUserDatabase = {
    user001: {
        name: 'John Doe',
        ipfsCID: 'bafkreihk3tuljsvgt7wihn54l7mcw4arghonptohbgenj7kd67rkvaq3ly'
    },
    user002: {
        name: 'Jane Smith',
        ipfsCID: 'bafkreihtsurn7px5fs3neo7tsjbzkmaxp5oyydvywipe5nscpk7h2omn2a'
    },
    user003: {
        name: 'Bob Johnson',
        ipfsCID: 'bafkreibliejl6jhs2xrmd5g4gxgncm7nqrk7dh3gzrqnal2t6jhsfsp6hq'
    }
};

let contract;
let account;
let lastCheckedBlock = 0;

// 🔹 In-memory cache: latest score per user (used by frontend polling)
const lastCreditScores = {};
// structure: { [userId]: { creditScore, ipfsCID, timestamp, txHash } }

// Initialize
async function initialize() {
    try {
        // Validate configuration
        if (!PRIVATE_KEY || PRIVATE_KEY === 'your_private_key_here') {
            throw new Error('PRIVATE_KEY not configured in .env file');
        }

        if (!SEPOLIA_RPC_URL) {
            throw new Error('SEPOLIA_RPC_URL not configured');
        }

        // Set up account from private key
        account = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY);
        web3.eth.accounts.wallet.add(account);
        web3.eth.defaultAccount = account.address;

        console.log('✅ Account loaded:', account.address);

        // Initialize contract
        contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
        console.log('✅ Contract connected:', CONTRACT_ADDRESS);

        // Get current block number
        const currentBlock = await web3.eth.getBlockNumber();
        lastCheckedBlock = currentBlock;
        console.log('📦 Starting from block:', currentBlock);

        // Start polling for events
        startPolling();
    } catch (error) {
        console.log('❌ Initialization failed:', error.message);
        console.log('💡 Make sure your .env file is properly configured');
    }
}

// Poll for events
function startPolling() {
    console.log('🔄 Starting to poll for events (every 5 seconds)...');

    setInterval(async () => {
        try {
            const currentBlock = await web3.eth.getBlockNumber();

            if (currentBlock > lastCheckedBlock) {
                console.log(
                    `📦 Checking blocks ${lastCheckedBlock + 1} to ${currentBlock} for events...`
                );

                const events = await contract.getPastEvents('CreditScoreRequested', {
                    fromBlock: lastCheckedBlock + 1,
                    toBlock: currentBlock
                });

                if (events.length > 0) {
                    console.log(`\n🎉 Found ${events.length} new event(s)!`);

                    for (const event of events) {
                        console.log('📥 Processing:', event.returnValues.userId);
                        await processCreditRequest(event.returnValues);
                    }
                } else {
                    console.log('⏳ No new events found');
                }

                lastCheckedBlock = currentBlock;
            }
        } catch (error) {
            console.log('⚠️ Polling error:', error.message);
        }
    }, 5000);
}

// Fetch credit score data from IPFS
async function fetchCreditScoreFromIPFS(userId, ipfsCID) {
    try {
        console.log(`🌐 Fetching credit score from IPFS for ${userId}...`);
        console.log(`📄 IPFS CID: ${ipfsCID}`);

        const gateways = [
            `https://ipfs.io/ipfs/${ipfsCID}`,
            `https://cloudflare-ipfs.com/ipfs/${ipfsCID}`,
            `https://gateway.pinata.cloud/ipfs/${ipfsCID}`
        ];

        let ipfsData = null;

        for (const gateway of gateways) {
            try {
                console.log(`🔗 Trying gateway: ${gateway}`);
                const response = await axios.get(gateway, { timeout: 10000 });
                ipfsData = response.data;
                console.log(`✅ Successfully fetched from IPFS:`, ipfsData);
                break;
            } catch (error) {
                console.log(`❌ Gateway failed: ${gateway}`);
                continue;
            }
        }

        if (!ipfsData) {
            throw new Error('All IPFS gateways failed');
        }

        return ipfsData;
    } catch (error) {
        console.log('❌ IPFS fetch error:', error.message);
        throw error;
    }
}

// Process credit score request with IPFS
async function processCreditRequest(requestData) {
    const { requestId, userId, userName } = requestData;

    console.log(`🔍 Processing: ${userId} (${userName})`);

    const user = ipfsUserDatabase[userId];

    if (!user) {
        console.log('❌ User not found in database');
        return;
    }

    if (user.name !== userName) {
        console.log('❌ Name does not match');
        return;
    }

    console.log(`✅ User found! IPFS CID: ${user.ipfsCID}`);

    try {
        const creditScoreData = await fetchCreditScoreFromIPFS(userId, user.ipfsCID);

        if (!creditScoreData.creditScore) {
            throw new Error('Invalid credit score data from IPFS');
        }

        const creditScore = creditScoreData.creditScore;
        console.log(`📊 Credit score from IPFS: ${creditScore}`);

        await sendToBlockchain(requestId, userId, creditScore, user.ipfsCID);
    } catch (error) {
        console.log('❌ Error processing IPFS data:', error.message);
    }
}

// Send data back to blockchain
async function sendToBlockchain(requestId, userId, creditScore, ipfsCID) {
    try {
        console.log('🔄 Sending to Sepolia...');

        const gasEstimate = await contract.methods
            .fulfillCreditScore(requestId, userId, creditScore, ipfsCID)
            .estimateGas({ from: account.address });

        const result = await contract.methods
            .fulfillCreditScore(requestId, userId, creditScore, ipfsCID)
            .send({
                from: account.address,
                gas: gasEstimate
            });

        console.log('✅ Success! Transaction:', result.transactionHash);
        console.log('🎉 Credit score sent to blockchain with IPFS proof!');

        // 🔹 Update in-memory cache for frontend polling
        lastCreditScores[userId] = {
            creditScore,
            ipfsCID,
            timestamp: Date.now(),
            txHash: result.transactionHash
        };
    } catch (error) {
        console.log('❌ Failed to send:', error.message);
    }
}

// ---------------- API Routes ----------------

// Serve deployment configuration to frontend
app.get('/config', (req, res) => {
    res.json({
        contractAddress: CONTRACT_ADDRESS,
        network: deploymentConfig.network,
        deployedAt: deploymentConfig.deployedAt,
        frontendConfig: deploymentConfig.frontendConfig,
        contractABI: CONTRACT_ABI
    });
});

// IPFS test endpoint
app.get('/api/ipfs-test/:userId', async (req, res) => {
    const userId = req.params.userId;

    try {
        const user = ipfsUserDatabase[userId];
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        console.log(`🧪 Manual IPFS test for: ${userId}`);
        const creditScoreData = await fetchCreditScoreFromIPFS(userId, user.ipfsCID);

        res.json({
            success: true,
            userId: userId,
            ipfsCID: user.ipfsCID,
            creditScoreData: creditScoreData
        });
    } catch (error) {
        res.status(500).json({
            error: 'IPFS fetch failed',
            message: error.message
        });
    }
});

// 🔹 Backend cache endpoint for latest score per user
app.get('/api/last-score/:userId', (req, res) => {
    const { userId } = req.params;
    const data = lastCreditScores[userId];

    if (!data) {
        return res.status(404).json({ error: 'No score yet for this user' });
    }

    res.json({
        userId,
        creditScore: data.creditScore,
        ipfsCID: data.ipfsCID,
        timestamp: data.timestamp,
        txHash: data.txHash
    });
});

// Main info endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Credit Score Backend with IPFS 🚀',
        account: account?.address,
        contract: CONTRACT_ADDRESS,
        network: deploymentConfig.network,
        status: 'Polling for events every 5 seconds',
        ipfsUsers: Object.keys(ipfsUserDatabase),
        deployedAt: deploymentConfig.deployedAt
    });
});

app.get('/api/users', (req, res) => {
    res.json(ipfsUserDatabase);
});

app.post('/api/test-manual', async (req, res) => {
    const { userId, userName } = req.body;

    if (!userId || !userName) {
        return res.status(400).json({ error: 'userId and userName required' });
    }

    const user = ipfsUserDatabase[userId];
    if (!user || user.name !== userName) {
        return res.json({ error: 'User not found' });
    }

    const mockEvent = {
        returnValues: {
            requestId: web3.utils.randomHex(32),
            userId: userId,
            userName: userName,
            requester: 'manual-test'
        }
    };

    await processCreditRequest(mockEvent.returnValues);

    res.json({
        message: 'Manual test completed!',
        user: userId,
        ipfsCID: user.ipfsCID,
        checkConsole: 'Look at backend console for IPFS fetch + blockchain send details'
    });
});

// Contract management endpoint
app.post('/api/update-contract', async (req, res) => {
    const { newAddress } = req.body;

    if (!newAddress || !newAddress.startsWith('0x') || newAddress.length !== 42) {
        return res.status(400).json({ error: 'Invalid contract address' });
    }

    try {
        const { updateContractAddress } = await import('./scripts/update-contract.js');
        const success = updateContractAddress(newAddress);

        if (success) {
            res.json({
                success: true,
                message: 'Contract address updated. Please restart the backend.',
                newAddress: newAddress
            });
        } else {
            res.status(500).json({ error: 'Failed to update contract address' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`\n✨ Backend running on http://localhost:${PORT}`);
    console.log(`📄 Contract: ${CONTRACT_ADDRESS}`);
    console.log(`🌐 Network: ${deploymentConfig.network}`);
    console.log(`📋 IPFS Users: user001, user002, user003`);
    console.log(`🔗 IPFS Test: http://localhost:${PORT}/api/ipfs-test/user001`);
    console.log(`⚙️  Config: http://localhost:${PORT}/config`);
    console.log(`🧪 Last-score endpoint: http://localhost:${PORT}/api/last-score/user001`);
    initialize();
});
