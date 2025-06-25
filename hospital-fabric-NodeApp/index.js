'use strict';

const { Gateway, Wallets } = require('@hyperledger/fabric-gateway');
const path = require('path');
const fs = require('fs').promises;

const channelName = 'mychannel';
const chaincodeName = 'org.healthcare.HealthcareContract';
const mspId = 'Org1MSP';

const ccpPath = path.resolve(__dirname, 'connection-org1.json');
const walletPath = path.join(__dirname, 'wallet');
const org1UserId = 'appUser';

async function main() {
  let gateway;
  try {
    // 1. Leer perfil de conexión
    const ccp = JSON.parse(await fs.readFile(ccpPath, 'utf8'));

    // 2. Cargar wallet y obtener identidad
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    const identity = await wallet.get(org1UserId);
    if (!identity) {
      console.log(`La identidad para el usuario ${org1UserId} no existe en la wallet.`);
      console.log('Ejecuta enrollAdmin.js y registerUser.js antes.');
      return;
    }

    // 3. Crear gateway y conectar
    gateway = new Gateway();
    await gateway.connect(ccp, {
      wallet,
      identity: org1UserId,
      discovery: { enabled: true, asLocalhost: true }
    });

    console.log('Gateway conectado.');

    // 4. Obtener red y contrato
    const network = await gateway.getNetwork(channelName);
    const contract = network.getContract(chaincodeName);

    // 5. Enviar transacciones

    // Crear un paciente
    console.log('Creando paciente...');
    let result = await contract.submitTransaction('createPatient', 'PATIENT001', 'Juan Pérez', '1980-01-15');
    console.log('Resultado createPatient:', result.toString());

    // Añadir una entrada al historial médico
    console.log('Añadiendo entrada al historial...');
    result = await contract.submitTransaction(
      'addRecordEntry',
      'PATIENT001',
      'ENTRY001',
      'Diagnóstico',
      'Fiebre alta, dolor de cabeza, tos seca',
      'DOC001',
      'HOSPITAL_CENTRAL_MADRID'
    );
    console.log('Resultado addRecordEntry:', result.toString());

    // Otorgar consentimiento de acceso
    console.log('Otorgando consentimiento...');
    result = await contract.submitTransaction(
      'grantPatientAccess',
      'PATIENT001',
      'MEDICO_ESPECIALISTA',
      'Tratamiento',
      '2026-12-31T23:59:59Z'
    );
    console.log('Resultado grantPatientAccess:', result.toString());

    // Crear un lote de medicamentos
    console.log('Creando lote de medicamentos...');
    result = await contract.submitTransaction(
      'createDrugBatch',
      'DRUG001',
      'Paracetamol 500mg',
      'PharmaCorp',
      '2024-01-01',
      '2026-01-01'
    );
    console.log('Resultado createDrugBatch:', result.toString());

    // Actualizar estado de lote de medicamentos
    console.log('Actualizando estado lote de medicamentos...');
    result = await contract.submitTransaction(
      'updateDrugBatchStatus',
      'DRUG001',
      'EVENT001',
      'Centro Distribución Madrid',
      'En Tránsito',
      'DIST001'
    );
    console.log('Resultado updateDrugBatchStatus:', result.toString());

    // 6. Evaluar consultas

    // Consulta registro del paciente (con acceso)
    console.log('Consultando registro del paciente con acceso...');
    result = await contract.evaluateTransaction('queryPatientRecord', 'PATIENT001', 'MEDICO_ESPECIALISTA', 'Tratamiento');
    console.log('Resultado queryPatientRecord:', result.toString());

    // Consulta registro del paciente (sin acceso - esperamos error)
    console.log('Consultando registro del paciente sin acceso (esperando error)...');
    try {
      await contract.evaluateTransaction('queryPatientRecord', 'PATIENT001', 'INVESTIGADOR_X', 'Investigación');
      console.log('Consulta inesperadamente exitosa para usuario no autorizado.');
    } catch (error) {
      console.error('Error esperado para consulta sin autorización:', error.message);
    }

    // Consulta historial de lote de medicamentos
    console.log('Consultando historial de lote de medicamentos...');
    result = await contract.evaluateTransaction('queryDrugBatchHistory', 'DRUG001');
    console.log('Resultado queryDrugBatchHistory:', result.toString());

  } catch (error) {
    console.error('Error en la aplicación:', error);
  } finally {
    if (gateway) {
      gateway.close();
      console.log('Gateway desconectado.');
    }
  }
}

main();
