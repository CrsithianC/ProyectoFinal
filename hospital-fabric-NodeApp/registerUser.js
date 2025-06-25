'use strict';

const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs').promises;

async function main() {
  try {
    const ccpPath = path.resolve(__dirname, 'connection-org1.json');
    const ccp = JSON.parse(await fs.readFile(ccpPath, 'utf8'));

    const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
    const caTLSCACerts = Array.isArray(caInfo.tlsCACerts.pem)
      ? caInfo.tlsCACerts.pem[0]
      : caInfo.tlsCACerts.pem;

    const ca = new FabricCAServices(
      caInfo.url,
      { trustedRoots: caTLSCACerts, verify: false },
      caInfo.caName
    );

    const walletPath = path.join(__dirname, 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    // Verificar si usuario ya existe
    const userExists = await wallet.get('appUser');
    if (userExists) {
      console.log('🔒 El usuario "appUser" ya existe en la wallet.');
      return;
    }

    // Verificar si admin está en la wallet
    const adminIdentity = await wallet.get('admin');
    if (!adminIdentity) {
      console.log('⚠️  Admin no encontrado. Ejecuta enrollAdmin.js primero.');
      return;
    }

    // Registrar usuario usando admin
    const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
    const adminUser = await provider.getUserContext(adminIdentity, 'admin');

    const secret = await ca.register(
      {
        affiliation: 'org1.department1',
        enrollmentID: 'appUser',
        role: 'client'
      },
      adminUser
    );

    const enrollment = await ca.enroll({
      enrollmentID: 'appUser',
      enrollmentSecret: secret
    });

    const userIdentity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes()
      },
      mspId: 'Org1MSP',
      type: 'X.509'
    };

    await wallet.put('appUser', userIdentity);
    console.log('✅ Usuario "appUser" registrado y almacenado en wallet.');

  } catch (error) {
    console.error(`🛑 Error en registerUser.js: ${error.message}`);
    process.exit(1);
  }
}

main();
