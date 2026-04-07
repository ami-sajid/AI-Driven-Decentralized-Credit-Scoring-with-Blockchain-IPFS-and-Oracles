// scripts/update-contract.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function updateContractAddress(newAddress) {
    try {
        // Read current deployment config
        const configPath = path.join(__dirname, '..', 'config', 'deployment.json');
        const configData = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(configData);
        
        // Update contract address
        const oldAddress = config.contractAddress;
        config.contractAddress = newAddress;
        config.deployedAt = new Date().toISOString();
        
        // Write back to file
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        
        console.log('✅ Contract address updated successfully!');
        console.log(`📄 Old: ${oldAddress}`);
        console.log(`📄 New: ${newAddress}`);
        console.log(`🕐 Updated at: ${config.deployedAt}`);
        
        return true;
    } catch (error) {
        console.log('❌ Failed to update contract address:', error.message);
        return false;
    }
}

// If run directly, use command line argument
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const newAddress = process.argv[2];
    
    if (!newAddress) {
        console.log('❌ Please provide the new contract address');
        console.log('Usage: node scripts/update-contract.js <new_contract_address>');
        process.exit(1);
    }
    
    if (!newAddress.startsWith('0x') || newAddress.length !== 42) {
        console.log('❌ Invalid contract address format');
        process.exit(1);
    }
    
    updateContractAddress(newAddress);
}

export { updateContractAddress };