'use strict';

const express = require('express');
const cors = require('cors');
const path = require('path');
const { submitTransaction, evaluateTransaction } = require('./fabric-client');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors()); // Permite peticiones desde el frontend
app.use(express.json()); // Permite parsear JSON en el body de las peticiones
app.use(express.urlencoded({ extended: true }));

// Servir los archivos estáticos del frontend
app.use(express.static(path.join(__dirname, 'public')));

// Wrapper para manejar errores de forma consistente
const handleRequest = (handler) => async (req, res) => {
    try {
        const result = await handler(req, res);
        res.status(200).json(result);
    } catch (error) {
        console.error(`Error en la petición: ${error.stack}`);
        const errorDetails = (error.details && error.details.length > 0) ? error.details[0].message : error.message;
        res.status(500).json({
            success: false,
            message: 'Fallo al procesar la transacción.',
            error: errorDetails
        });
    }
};

// --- RUTAS DE LA API ---

app.get('/api/test', (req, res) => {
    res.json({ message: 'La API está funcionando correctamente.' });
});

// Endpoint para crear un nuevo paciente
app.post('/api/createPatient', handleRequest(async (req) => {
    const { patientId, name, dob } = req.body;
    if (!patientId || !name || !dob) {
        throw new Error('Faltan los parámetros patientId, name, o dob.');
    }
    return await submitTransaction('createPatient', patientId, name, dob);
}));

// Endpoint para añadir una entrada al historial
app.post('/api/addRecordEntry', handleRequest(async (req) => {
    const { patientId, entryType, description, doctorId, hospitalId } = req.body;
    const entryId = `ENTRY_${Date.now().toString().slice(-6)}`;
    const timestamp = new Date().toISOString();
    return await submitTransaction('addRecordEntry', patientId, entryId, entryType, description, doctorId, hospitalId, timestamp);
}));

// Endpoint para consultar el historial de un paciente
app.get('/api/queryPatientRecord/:patientId', handleRequest(async (req) => {
    const { patientId } = req.params;
    // NOTA: Para este ejemplo, el ID del solicitante y el propósito están hardcodeados.
    // En una aplicación real, vendrían del sistema de autenticación del usuario.
    const requestingConsenterID = 'MEDICO_ESPECIALISTA';
    const purpose = 'Tratamiento';
    return await evaluateTransaction('queryPatientRecord', patientId, requestingConsenterID, purpose);
}));

// Endpoint para conceder acceso
app.post('/api/grantAccess', handleRequest(async (req) => {
    const { patientId, consenterId, purpose, expiresAt } = req.body;
    const grantedAt = new Date().toISOString();
    return await submitTransaction('grantPatientAccess', patientId, consenterId, purpose, expiresAt, grantedAt);
}));


// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`✅ Servidor API REST escuchando en http://localhost:${PORT}`);
});