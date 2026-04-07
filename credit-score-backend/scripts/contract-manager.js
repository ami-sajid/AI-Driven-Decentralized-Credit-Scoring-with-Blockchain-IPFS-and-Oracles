// scripts/contract-manager.js
import { updateContractAddress } from './update-contract.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ContractManager {
    constructor() {
        this.configPath = path.join(__dirname, '..', 'config', 'deployment.json');
    }
    
    getCurrentContract() {
        try {
            const configData = fs.readFileSync(this.configPath, 'utf8');
            const config = JSON.parse(configData);
            return {
                address: config.contractAddress,
                network: config.network,
                deployedAt: config.deployedAt
            };
        } catch (error) {
            console.log('❌ Failed to read contract config:', error.message);
            return null;
        }
    }
    
    updateContract(newAddress, network = 'sepolia') {
        if (!newAddress.startsWith('0x') || newAddress.length !== 42) {
            throw new Error('Invalid contract address format');
        }
        
        const success = updateContractAddress(newAddress);
        if (success) {
            console.log('🔄 Please restart the backend for changes to take effect');
        }
        return success;
    }
    
    displayContractInfo() {
        const contract = this.getCurrentContract();
        if (contract) {
            console.log('📄 Current Contract Information:');
            console.log(`   Address: ${contract.address}`);
            console.log(`   Network: ${contract.network}`);
            console.log(`   Deployed: ${contract.deployedAt}`);
        } else {
            console.log('❌ No contract information available');
        }
    }
}

// Command line interface
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const manager = new ContractManager();
    const command = process.argv[2];
    
    switch (command) {
        case 'info':
            manager.displayContractInfo();
            break;
            
        case 'update':
            const newAddress = process.argv[3];
            if (!newAddress) {
                console.log('❌ Please provide the new contract address');
                console.log('Usage: node scripts/contract-manager.js update <new_contract_address>');
                process.exit(1);
            }
            manager.updateContract(newAddress);
            break;
            
        case 'help':
        default:
            console.log('🤖 Contract Manager - Available Commands:');
            console.log('   node scripts/contract-manager.js info        - Show current contract');
            console.log('   node scripts/contract-manager.js update <addr> - Update contract address');
            console.log('   node scripts/contract-manager.js help        - Show this help');
            break;
    }
}

export { ContractManager };