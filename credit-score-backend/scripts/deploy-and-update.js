import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
    contractAddress: "0xF9AC03669CAA320636296ABf7FCad5138b13d848",
    network: "sepolia",
    rpcUrl: "https://eth-sepolia.g.alchemy.com/v2/Ptsf3kkMf-HfA7cNU3BYt",
    chainId: 11155111
};

// Contract ABI (same as in your server)
const CONTRACT_ABI = [
    {
        "inputs": [],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "anonymous": false,
        "inputs": [
            {"indexed": true, "name": "requestId", "type": "bytes32"},
            {"indexed": true, "name": "requester", "type": "address"},
            {"indexed": false, "name": "userId", "type": "string"},
            {"indexed": false, "name": "userName", "type": "string"},
            {"indexed": false, "name": "timestamp", "type": "uint256"}
        ],
        "name": "CreditScoreRequested",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {"indexed": true, "name": "requestId", "type": "bytes32"},
            {"indexed": false, "name": "userId", "type": "string"},
            {"indexed": false, "name": "creditScore", "type": "uint256"},
            {"indexed": false, "name": "timestamp", "type": "uint256"},
            {"indexed": false, "name": "ipfsCID", "type": "string"}
        ],
        "name": "CreditScoreReceived",
        "type": "event"
    },
    {
        "inputs": [
            {"name": "_requestId", "type": "bytes32"},
            {"name": "_userId", "type": "string"},
            {"name": "_creditScore", "type": "uint256"},
            {"name": "_ipfsCID", "type": "string"}
        ],
        "name": "fulfillCreditScore",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {"name": "_userId", "type": "string"},
            {"name": "_userName", "type": "string"}
        ],
        "name": "requestCreditScore",
        "outputs": [{"name": "", "type": "bytes32"}],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

function updateDeploymentConfig() {
    const deploymentConfig = {
        contractAddress: CONFIG.contractAddress,
        network: CONFIG.network,
        deployedAt: new Date().toISOString(),
        contractABI: CONTRACT_ABI,
        frontendConfig: {
            rpcUrl: CONFIG.rpcUrl,
            chainId: CONFIG.chainId,
            networkName: "Sepolia Testnet"
        }
    };

    // Ensure config directory exists
    const configDir = path.join(__dirname, '..', 'config');
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }

    // Write deployment config
    const configPath = path.join(configDir, 'deployment.json');
    fs.writeFileSync(configPath, JSON.stringify(deploymentConfig, null, 2));
    
    console.log('✅ Deployment config updated!');
    console.log('📄 Contract:', CONFIG.contractAddress);
    console.log('🌐 Network:', CONFIG.network);
    console.log('🕐 Deployed at:', deploymentConfig.deployedAt);
    
    return deploymentConfig;
}

function createEnvFile() {
    const envContent = `# Environment Configuration
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/Ptsf3kkMf-HfA7cNU3BYt
PRIVATE_KEY=your_private_key_here
PORT=3001
NETWORK=sepolia
`;

    const envPath = path.join(__dirname, '..', '.env');
    if (!fs.existsSync(envPath)) {
        fs.writeFileSync(envPath, envContent);
        console.log('✅ .env file created!');
        console.log('⚠️  Please update your PRIVATE_KEY in the .env file');
    } else {
        console.log('✅ .env file already exists');
    }
}

function setupProject() {
    console.log('🚀 Setting up Credit Score DApp...');
    console.log('=====================================');
    
    createEnvFile();
    updateDeploymentConfig();
    
    console.log('=====================================');
    console.log('✅ Setup complete!');
    console.log('📝 Next steps:');
    console.log('   1. Update your PRIVATE_KEY in the .env file');
    console.log('   2. Run: npm start');
    console.log('   3. Open frontend-test.html in your browser');
}

// Run setup if this script is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const command = process.argv[2];
    
    if (command === '--setup') {
        setupProject();
    } else {
        console.log('🔄 Updating deployment configuration...');
        updateDeploymentConfig();
    }
}

export { updateDeploymentConfig, setupProject };