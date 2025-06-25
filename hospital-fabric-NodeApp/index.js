'use strict';

const { Gateway, Default, Wallets } = require('@hyperledger/fabric-gateway'); // Ahora Wallets se importa de esta forma
const path = require('path');
const fs = require('fs');
const { promises: fsPromises } = fs;
const grpc = require('@grpc/grpc-js');

// Definición de las rutas del entorno
const channelName = 'mychannel';
const chaincodeName = 'HealthcareContract'; // Cambiado a HealthcareContract
const mspId = 'Org1MSP';

const ccpPath = path.resolve(__dirname, 'connection-org1.json');
// La ruta a la billetera donde están tus identidades.
// Asegúrate de que esta carpeta exista y contenga la identidad 'appUser'.
const walletPath = path.join(process.cwd(), 'wallet'); 
const org1UserId = 'appUser';

async function main() {
    let gateway;

    try {
        // 1. Cargar el Perfil de Conexión (CCP)
        const ccp = JSON.parse(await fsPromises.readFile(ccpPath, 'utf8'));

        // 2. Cargar la Identidad desde la Billetera
        // Fabric Gateway SDK proporciona su propia implementación de Wallets.
        // Asegúrate de que la carpeta 'wallet' contenga los archivos de identidad generados previamente
        // (por enrollAdmin.js y registerUser.js de fabric-network/fabric-ca-client)
        const wallet = await Wallets.newFileSystemWallet(walletPath); // Usamos el Wallets importado del fabric-gateway SDK
        
        const identity = await wallet.get(org1UserId);
        if (!identity) {
            console.log(`La identidad para el usuario "${org1UserId}" no existe en la billetera.`);
            console.log('Por favor, asegúrate de que enrollAdmin.js y registerUser.js se hayan ejecutado y creado la identidad en la carpeta "wallet".');
            return;
        }

        // 3. Crear un Cliente gRPC (desde el CCP)
        const tlsRootCertPath = path.resolve(ccp.organizations[mspId].tlsRootCert.path);
        const tlsRootCert = await fsPromises.readFile(tlsRootCertPath);
        const client = new grpc.Client(ccp.peers['peer0.org1.example.com:7051'].url, grpc.credentials.createSsl(tlsRootCert));

        // 4. Conectar al Gateway
        gateway = Default.createGateway({
            identity: identity,
            client: client,
            evaluateLabels: {
                peer: 'peer0.org1.example.com:7051'
            }
        });

        await gateway.connect();
        console.log('Gateway conectado exitosamente.');

        // 5. Obtener la Red (Canal) y el Contrato (Chaincode)
        const network = gateway.getNetwork(channelName);
        // Aquí usamos el nombre del Chaincode que usaste en deployCC
        const contract = network.getContract(chaincodeName); 

        console.log('\n--- Enviar Transacciones (Invokes con submitAsync) ---');

        async function submitAndWatch(transactionName, ...args) {
            console.log(`Enviando transacción '${transactionName}' con argumentos: ${args.join(', ')}...`);
            const commit = await contract.submitAsync(transactionName, { arguments: args });
            const result = await commit.getResult();
            console.log(`Transacción '${transactionName}' enviada. Resultado: ${result.toString()}`);
            
            console.log(`Esperando confirmación de '${transactionName}'...`);
            await commit.getEvent();
            console.log(`Transacción '${transactionName}' confirmada en el ledger.`);
            return result;
        }

        // ... (el resto de tus ejemplos de submitAndWatch y evaluate) ...

        // Ejemplo 1: Crear un paciente
        const createPatientResult = await submitAndWatch('createPatient', 'PATIENT001', 'Juan Pérez', '1980-01-15');
        
        // Ejemplo 2: Añadir una entrada al historial médico
        const addEntryResult = await submitAndWatch(
            'addRecordEntry',
            'PATIENT001',
            'ENTRY001',
            'Diagnóstico',
            'Fiebre alta, dolor de cabeza, tos seca',
            'DOC001',
            'HOSPITAL_CENTRAL_MADRID'
        );

        // Ejemplo 3: Otorgar consentimiento de acceso al registro del paciente
        const grantAccessResult = await submitAndWatch(
            'grantPatientAccess',
            'PATIENT001',
            'MEDICO_ESPECIALISTA',
            'Tratamiento',
            '2026-12-31T23:59:59Z' // Consentimiento que expira
        );

        // Ejemplo 4: Crear un lote de medicamentos
        await submitAndWatch('createDrugBatch', 'DRUG001', 'Paracetamol 500mg', 'PharmaCorp', '2024-01-01', '2026-01-01');

        // Ejemplo 5: Actualizar el estado de un lote de medicamentos
        await submitAndWatch('updateDrugBatchStatus', 'DRUG001', 'EVENT001', 'Centro Distribución Madrid', 'En Tránsito', 'DIST001');


        console.log('\n--- Evaluar Consultas (Queries con evaluate) ---');

        // Ejemplo 1: Consultar el registro del paciente (con acceso permitido)
        console.log('Evaluando consulta: queryPatientRecord (con acceso)...');
        const patientRecordResult = await contract.evaluate('queryPatientRecord', { arguments: ['PATIENT001', 'MEDICO_ESPECIALISTA', 'Tratamiento'] });
        console.log(`Resultado de queryPatientRecord: ${patientRecordResult.toString()}`);

        // Ejemplo 2: Intentar consultar el registro del paciente (sin acceso, esperando un error)
        console.log('Evaluando consulta: queryPatientRecord (sin acceso, esperando error)...');
        try {
            await contract.evaluate('queryPatientRecord', { arguments: ['PATIENT001', 'INVESTIGADOR_X', 'Investigación'] });
            console.log('Éxito inesperado para la consulta sin autorización.');
        } catch (error) {
            console.error(`Error esperado para consulta no autorizada: ${error.message}`);
        }

        // Ejemplo 3: Consultar el historial de un lote de medicamentos
        console.log('Evaluando consulta: queryDrugBatchHistory...');
        const drugBatchHistory = await contract.evaluate('queryDrugBatchHistory', { arguments: ['DRUG001'] });
        console.log(`Resultado de queryDrugBatchHistory: ${drugBatchHistory.toString()}`);

    } catch (error) {
        console.error(`Fallo al ejecutar la aplicación: ${error}`);
        process.exit(1);
    } finally {
        if (gateway) {
            gateway.close();
            console.log('Gateway desconectado.');
        }
    }
}

main();
