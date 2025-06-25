'use strict';

const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('@hyperledger/fabric-gateway');
const path = require('path');
const fs = require('fs').promises;

async function main() {
  try {
    const ccpPath = path.resolve(__dirname, 'connection-org1.json');
    const ccp = JSON.parse(await fs.readFile(ccpPath, 'utf8'));

    // Configuración CA
    const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
    const caTLSCACerts = caInfo.tlsCACerts.pem;
    const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);

    // Wallet para guardar identidad
    const walletPath = path.join(__dirname, 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    const adminExists = await wallet.get('admin');
    if (adminExists) {
      console.log('El administrador "admin" ya existe en la wallet');
      return;
    }

    // Enroll admin
    const enrollment = await ca.enroll({ enrollmentID: 'admin', enrollmentSecret: 'adminpw' });

    const identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes()
      },
      mspId: 'Org1MSP',
      type: 'X.509'
    };

    await wallet.put('admin', identity);
    console.log('Admin enrolado y almacenado en wallet');
  } catch (error) {
    console.error(`Error en enrollAdmin.js: ${error}`);
    process.exit(1);
  }
}

main();
