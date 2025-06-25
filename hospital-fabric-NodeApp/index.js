'use strict';

// Importa 'connect' y 'signers' del nuevo SDK, y 'Wallets' del SDK antiguo
const { connect, signers } = require('@hyperledger/fabric-gateway');
const { Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs').promises;
const grpc = require('@grpc/grpc-js');
const crypto = require('crypto');
const { TextDecoder } = require('util'); // Importar TextDecoder

const channelName = 'mychannel';
const chaincodeName = 'HealthcareContract';
const mspId = 'Org1MSP';
const orgName = 'Org1'; // Usado para buscar en ccp.organizations

const ccpPath = path.resolve(__dirname, 'connection-org1.json');
const walletPath = path.join(process.cwd(), 'wallet');
const org1UserId = 'appUser';

// Crear una instancia del decodificador para reutilizarla
const decoder = new TextDecoder();

async function main() {
    let gateway; // Declarar aquí para el bloque finally
    let grpcClient; // Declarar para poder cerrarlo en finally

    try {
        const uniqueSuffix = Date.now().toString().slice(-6);
        const patientId = `PATIENT_${uniqueSuffix}`;
        const drugId = `DRUG_${uniqueSuffix}`;
        console.log(`🚀 Usando IDs únicos para esta ejecución: Paciente=${patientId}, Medicamento=${drugId}`);


        const ccp = JSON.parse(await fs.readFile(ccpPath, 'utf8'));
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        const identityFromWallet = await wallet.get(org1UserId);
        if (!identityFromWallet) {
            console.log(`La identidad para el usuario "${org1UserId}" no existe en la wallet.`);
            console.log('Por favor, asegúrate de que enrollAdmin.js y registerUser.js se hayan ejecutado y creado la identidad en la carpeta "wallet".');
            return;
        }

        const certificatePem = identityFromWallet.credentials.certificate;
        const privateKeyPem = identityFromWallet.credentials.privateKey;
        const mspIdFromIdentity = identityFromWallet.mspId;

        if (!certificatePem || !privateKeyPem || !mspIdFromIdentity) {
            throw new Error(`La identidad de ${org1UserId} en la wallet está incompleta. Faltan certificado, clave privada o MSP ID.`);
        }

        const gatewayIdentity = {
            mspId: mspIdFromIdentity,
            credentials: Buffer.from(certificatePem),
        };

        const privateKey = crypto.createPrivateKey(privateKeyPem);
        const signer = signers.newPrivateKeySigner(privateKey);

        const orgInfo = ccp.organizations[orgName];
        if (!orgInfo || !orgInfo.peers || orgInfo.peers.length === 0 || !orgInfo.certificateAuthorities || orgInfo.certificateAuthorities.length === 0) {
            throw new Error(`La organización ${orgName} no está correctamente definida en el CCP o le faltan peers/CAs.`);
        }

        const peerNameFromOrg = orgInfo.peers[0];
        const peer = ccp.peers[peerNameFromOrg];
        const peerEndpoint = peer.url.replace(/grpcs?:\/\//, '');

        const caNameFromOrg = orgInfo.certificateAuthorities[0];
        const ca = ccp.certificateAuthorities[caNameFromOrg];

        const tlsRootCertPem = Array.isArray(ca.tlsCACerts.pem) ? ca.tlsCACerts.pem.join('\n') : ca.tlsCACerts.pem;
        const tlsRootCert = Buffer.from(tlsRootCertPem);

        const clientOptions = {};
        if (peer.grpcOptions && peer.grpcOptions['ssl-target-name-override']) {
            clientOptions['grpc.ssl_target_name_override'] = peer.grpcOptions['ssl-target-name-override'];
        }

        grpcClient = new grpc.Client(peerEndpoint, grpc.credentials.createSsl(tlsRootCert), clientOptions);

        gateway = await connect({
            client: grpcClient,
            identity: gatewayIdentity,
            signer: signer,
        });
        console.log('✅ Gateway conectado exitosamente.');

        const network = gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);

        async function submitAndWatch(transactionName, ...args) {
            console.log(`\n⏳ Enviando transacción '${transactionName}' con argumentos: ${args.join(', ')}`);
            const resultBytes = await contract.submitTransaction(transactionName, ...args);
            const result = decoder.decode(resultBytes);
            console.log(`✅ Transacción '${transactionName}' enviada y confirmada. Resultado: ${result}`);
            return result;
        }
        
        async function evaluateTransaction(transactionName, ...args) {
             console.log(`\nConsultando transacción: ${transactionName}`);
             const resultBytes = await contract.evaluateTransaction(transactionName, ...args);
             const result = decoder.decode(resultBytes);
             console.log(`*** Resultado: ${result}`);
             return result;
        }

        await submitAndWatch('createPatient', patientId, 'Juan Pérez', '1980-01-15');
        
        // CAMBIO: Generar IDs y timestamps en el cliente para pasarlos al chaincode.
        const entryId = `ENTRY_${Date.now().toString().slice(-5)}`;
        const entryTimestamp = new Date().toISOString();

        await submitAndWatch(
            'addRecordEntry',
            patientId,
            entryId,
            'Diagnóstico',
            'Fiebre alta, dolor de cabeza, tos seca',
            'DOC001',
            'HOSPITAL_CENTRAL_MADRID',
            entryTimestamp // Se añade el timestamp como argumento
        );

        const consentTimestamp = new Date().toISOString();
        await submitAndWatch(
            'grantPatientAccess',
            patientId,
            'MEDICO_ESPECIALISTA',
            'Tratamiento',
            '2026-12-31T23:59:59Z',
            consentTimestamp // Se añade el timestamp de concesión como argumento
        );

        await submitAndWatch('createDrugBatch', drugId, 'Paracetamol 500mg', 'PharmaCorp', '2024-01-01', '2026-01-01');

        const drugEventTimestamp = new Date().toISOString();
        await submitAndWatch(
            'updateDrugBatchStatus', 
            drugId, 
            `EVENT_${Date.now().toString().slice(-5)}`, 
            'Centro Distribución Madrid', 
            'En Tránsito', 
            'DIST001',
            drugEventTimestamp // Se añade el timestamp del evento como argumento
        );

        console.log('\n--- Consultas ---');

        const patientRecord = await evaluateTransaction('queryPatientRecord', patientId, 'MEDICO_ESPECIALISTA', 'Tratamiento');
        console.log(`📄 queryPatientRecord: ${patientRecord}`);

        try {
            await evaluateTransaction('queryPatientRecord', patientId, 'INVESTIGADOR_X', 'Investigación');
            console.log('⚠️ Éxito inesperado en consulta sin permisos.');
        } catch (error) {
            const errorMessage = error.details && error.details.length > 0 ? error.details[0].message : error.message;
            console.error(`❌ Error esperado en consulta no autorizada: ${errorMessage}`);
        }

        const drugHistory = await evaluateTransaction('queryDrugBatchHistory', drugId);
        console.log(`📦 queryDrugBatchHistory: ${drugHistory}`);

    } catch (error) {
        console.error(`\n🛑 Fallo al ejecutar la aplicación: ${error.message}`);
        console.error(error.stack);

        if (error.details && Array.isArray(error.details)) {
            console.error('\n--- Detalles del error de endoso del peer ---');
            error.details.forEach(detail => {
                console.error(`- Peer: ${detail.mspId}@${detail.address}, Mensaje: ${detail.message}`);
            });
            console.error('--- ^^^ Revisa el mensaje de arriba para encontrar el error en tu chaincode ^^^ ---');
        }
        process.exit(1);
    } finally {
        if (gateway) {
            gateway.close();
            console.log('\n🔌 Gateway desconectado.');
        } else if (grpcClient) {
            grpcClient.close();
        }
    }
}

main();
