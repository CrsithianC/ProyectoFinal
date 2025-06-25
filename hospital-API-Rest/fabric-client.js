'use strict';

const { connect, signers } = require('@hyperledger/fabric-gateway');
const { Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs').promises;
const grpc = require('@grpc/grpc-js');
const crypto = require('crypto');

// --- Configuración ---
const channelName = 'mychannel';
const chaincodeName = 'HealthcareContract';
const mspId = 'Org1MSP';
const orgName = 'Org1';

const ccpPath = path.resolve(__dirname, 'connection-org1.json');
const walletPath = path.join(process.cwd(), 'wallet');
const org1UserId = 'appUser';

const decoder = new TextDecoder();

let gateway;
let contract;

// Función para conectar al gateway de Fabric
async function connectToGateway() {
    if (gateway) {
        return; // Ya está conectado
    }

    try {
        console.log('Conectando al gateway de Hyperledger Fabric...');

        const ccp = JSON.parse(await fs.readFile(ccpPath, 'utf8'));
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        const identityFromWallet = await wallet.get(org1UserId);

        if (!identityFromWallet) {
            console.error(`La identidad para el usuario "${org1UserId}" no existe.`);
            throw new Error('Identidad de usuario no encontrada. Ejecuta enrollAdmin.js y registerUser.js primero.');
        }

        const certificatePem = identityFromWallet.credentials.certificate;
        const privateKeyPem = identityFromWallet.credentials.privateKey;
        const mspIdFromIdentity = identityFromWallet.mspId;

        const gatewayIdentity = {
            mspId: mspIdFromIdentity,
            credentials: Buffer.from(certificatePem),
        };

        const privateKey = crypto.createPrivateKey(privateKeyPem);
        const signer = signers.newPrivateKeySigner(privateKey);

        const peerInfo = ccp.peers[ccp.organizations[orgName].peers[0]];
        const peerEndpoint = peerInfo.url.replace(/grpcs?:\/\//, '');

        const caInfo = ccp.certificateAuthorities[ccp.organizations[orgName].certificateAuthorities[0]];
        // CORRECCIÓN: Asegurar que el PEM se procesa correctamente si es un array o un string.
        const tlsRootCertPem = Array.isArray(caInfo.tlsCACerts.pem) ? caInfo.tlsCACerts.pem.join('\n') : caInfo.tlsCACerts.pem;
        const tlsRootCert = Buffer.from(tlsRootCertPem);
        
        const clientOptions = {
            'grpc.ssl_target_name_override': peerInfo.grpcOptions['ssl-target-name-override']
        };

        const client = new grpc.Client(peerEndpoint, grpc.credentials.createSsl(tlsRootCert), clientOptions);

        gateway = await connect({ client, identity: gatewayIdentity, signer });
        const network = gateway.getNetwork(channelName);
        contract = network.getContract(chaincodeName);

        console.log('✅ Conexión con Fabric establecida exitosamente.');

    } catch (error) {
        console.error('🛑 Fallo al conectar con Fabric:', error);
        throw error;
    }
}

// Función genérica para enviar transacciones que escriben en el ledger
async function submitTransaction(functionName, ...args) {
    await connectToGateway();
    console.log(`\n⏳ Enviando transacción (submit): ${functionName} con argumentos: ${args.join(', ')}`);
    const resultBytes = await contract.submitTransaction(functionName, ...args);
    const result = decoder.decode(resultBytes);
    console.log(`✅ Transacción enviada. Resultado: ${result}`);
    return JSON.parse(result); // Devuelve el objeto JSON
}

// Función genérica para evaluar transacciones que solo leen del ledger
async function evaluateTransaction(functionName, ...args) {
    await connectToGateway();
    console.log(`\nConsultando transacción (evaluate): ${functionName} con argumentos: ${args.join(', ')}`);
    const resultBytes = await contract.evaluateTransaction(functionName, ...args);
    const result = decoder.decode(resultBytes);
    console.log(`*** Resultado de la consulta: ${result}`);
    return JSON.parse(result); // Devuelve el objeto JSON
}

module.exports = {
    submitTransaction,
    evaluateTransaction,
};