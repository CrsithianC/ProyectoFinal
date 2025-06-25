'use strict';

const FabricCAServices = require('fabric-ca-client'); // Necesario para interactuar con la CA
const { Wallets } = require('@hyperledger/fabric-gateway'); // Necesario para la API de Wallets para guardar
const path = require('path');
const fs = require('fs');
const { promises: fsPromises } = fs; // Para operaciones asíncronas de archivos

async function main() {
    try {
        // --- Configuración de la red y la CA ---
        // Cargar el perfil de conexión (CCP)
        const ccpPath = path.resolve(__dirname, 'connection-org1.json');
        const ccp = JSON.parse(await fsPromises.readFile(ccpPath, 'utf8'));

        // Configuración específica de la CA para Org1
        const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
        const caTLSCACerts = caInfo.tlsCACerts.pem;
        const caClient = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);

        // --- Configuración de la billetera (wallet) ---
        // La billetera se creará en la carpeta 'wallet'
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath); // Usamos el Wallets de fabric-gateway

        // --- Verificar si el admin ya existe ---
        const adminIdentity = await wallet.get('admin');
        if (adminIdentity) {
            console.log('Una identidad de administrador ya existe en la billetera. No es necesario enrolar de nuevo.');
            return;
        }

        // --- 1. Enrolar al administrador ---
        // El administrador por defecto de la CA es 'admin' con la contraseña 'adminpw'
        const enrollment = await caClient.enroll({ enrollmentID: 'admin', enrollmentSecret: 'adminpw' });

        // --- 2. Crear una identidad para el administrador ---
        // Este es el formato de identidad que Fabric Gateway espera para un usuario
        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: 'Org1MSP', // Asegúrate de que esto coincide con el MSP de tu organización
            type: 'X.509',
        };

        // --- 3. Guardar la identidad del administrador en la billetera ---
        await wallet.put('admin', x509Identity);
        console.log('Identidad de administrador enrolada y añadida a la billetera.');

    } catch (error) {
        console.error(`Error en enrollAdmin.js: ${error}`);
        process.exit(1);
    }
}

main();
