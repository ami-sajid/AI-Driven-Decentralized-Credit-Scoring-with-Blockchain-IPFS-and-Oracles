import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function showCurrentContract() {
    try {
        const configPath = path.join(__dirname, '..', 'config', 'deployment.json');
        const configData = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(configData);
        
        console.log(`Current contract: ${config.contractAddress}`);
        console.log(`Network: ${config.network}`);
        return config.contractAddress;
    } catch (error) {
        console.log('Could not read current contract address');
        return null;
    }
}

showCurrentContract();