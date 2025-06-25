'use strict';

const FabricCAServices = require('fabric-ca-client'); // Necesario para interactuar con la CA
const { Wallets } = require('@hyperledger/fabric-gateway'); // Necesario para la API de Wallets para leer y guardar
const path = require('path');
const fs = require('fs');
const { promises: fsPromises } = fs;

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
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath); // Usamos el Wallets de fabric-gateway

        // --- Verificar si el usuario de la aplicación ya existe ---
        const userId = 'appUser'; // El ID de usuario que tu aplicación utilizará
        const userIdentity = await wallet.get(userId);
        if (userIdentity) {
            console.log(`Una identidad para el usuario "${userId}" ya existe en la billetera. No es necesario registrar/enrolar de nuevo.`);
            return;
        }

        // --- 1. Cargar la identidad del administrador ---
        // Se necesita el administrador para registrar nuevos usuarios
        const adminIdentity = await wallet.get('admin');
        if (!adminIdentity) {
            console.log('La identidad de administrador no existe en la billetera.');
            console.log('Por favor, ejecuta enrollAdmin.js primero.');
            return;
        }

        // Crear un IdentityService para usar el administrador como registrador
        const provider = wallet.get       // Reemplazar con la forma correcta de obtener el registrador del wallet.
        // const provider = wallet.getProvider(adminIdentity.type); // Esta es la forma en fabric-network.
        // En fabric-gateway, la billetera devuelve la identidad X.509, no un objeto de proveedor
        // Debemos crear un registrador a partir de la identidad admin.
        const registrar = caClient.get
        // Crear un registrador a partir de la identidad de admin para el registro
        const registrarIdentity = new FabricCAServices.X509Provider(adminIdentity.mspId, adminIdentity.credentials.certificate, adminIdentity.credentials.privateKey);
        const registrarClient = caClient.getIdentityService();

        // --- 2. Registrar al nuevo usuario ---
        const secret = await registrarClient.register({
            affiliation: 'org1.department1', // Ajusta la afiliación según tu configuración
            enrollmentID: userId,
            role: 'client',
            attrs: [{ name: 'hospital', value: 'HospitalFabric', ecert: true }] // Atributos opcionales
        }, registrarIdentity); // Pasa la identidad del registrador

        // --- 3. Enrolar al nuevo usuario ---
        const enrollment = await caClient.enroll({ enrollmentID: userId, enrollmentSecret: secret });

        // --- 4. Crear una identidad para el nuevo usuario ---
        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: 'Org1MSP', // Asegúrate de que esto coincide con el MSP de tu organización
            type: 'X.509',
        };

        // --- 5. Guardar la identidad del nuevo usuario en la billetera ---
        await wallet.put(userId, x509Identity);
        console.log(`Identidad para el usuario "${userId}" registrada y añadida a la billetera.`);

    } catch (error) {
        console.error(`Error en registerUser.js: ${error}`);
        process.exit(1);
    }
}

main();
