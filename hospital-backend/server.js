const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const FabricSDKMock = require('./fabric-sdk-mock'); // Importa la CLASE FabricSDKMock

const app = express();
const PORT = process.env.PORT || 3000;

// Crea una instancia del mock del SDK de Fabric
const fabricSDKMockInstance = new FabricSDKMock();

// Middleware
app.use(cors()); // Habilita CORS para permitir solicitudes desde el frontend
app.use(bodyParser.json()); // Para parsear cuerpos de solicitud JSON

// Rutas de la API

// Ruta de prueba para verificar que el backend está funcionando
app.get('/', (req, res) => {
    res.status(200).json({ message: 'Backend de gestión hospitalaria con blockchain (mock) funcionando.' });
});

// Ruta para simular la conexión a la red Fabric
app.post('/api/connect-fabric', async (req, res) => {
    try {
        // Usa la instancia para llamar al método
        const result = await fabricSDKMockInstance.connect();
        res.status(200).json(result);
    } catch (error) {
        console.error(`Error al conectar a Fabric (mock): ${error.message}`);
        res.status(500).json({ status: 'error', message: 'Error al conectar a Fabric (mock).' });
    }
});

// Ruta para simular la desconexión de la red Fabric
app.post('/api/disconnect-fabric', async (req, res) => {
    try {
        // Usa la instancia para llamar al método
        const result = await fabricSDKMockInstance.disconnect();
        res.status(200).json(result);
    } catch (error) {
        console.error(`Error al desconectar de Fabric (mock): ${error.message}`);
        res.status(500).json({ status: 'error', message: 'Error al desconectar de Fabric (mock).' });
    }
});

// 1. Rutas para Historias Clínicas Electrónicas (HCE)
app.post('/api/hce/crear', async (req, res) => {
    const { pacienteId, diagnostico, tratamiento } = req.body;
    try {
        // Usa la instancia para llamar al método
        const result = await fabricSDKMockInstance.invokeChaincode('crearHistoriaClinica', [pacienteId, diagnostico, tratamiento]);
        res.status(200).json(result);
    } catch (error) {
        console.error(`Error al crear HCE: ${error.message}`);
        res.status(500).json({ status: 'error', message: 'Error al crear la historia clínica.' });
    }
});

app.get('/api/hce/:pacienteId', async (req, res) => {
    const { pacienteId } = req.params;
    try {
        // Usa la instancia para llamar al método
        const result = await fabricSDKMockInstance.queryChaincode('obtenerHistoriaClinica', [pacienteId]);
        res.status(200).json(result);
    } catch (error) {
        console.error(`Error al obtener HCE: ${error.message}`);
        res.status(500).json({ status: 'error', message: 'Error al obtener la historia clínica.' });
    }
});

// 2. Rutas para Trazabilidad de Medicamentos
app.post('/api/medicamentos/registrar', async (req, res) => {
    const { medicamentoId, nombre, lote, fabricante, fechaFabricacion } = req.body;
    try {
        // Usa la instancia para llamar al método
        const result = await fabricSDKMockInstance.invokeChaincode('registrarMedicamento', [medicamentoId, nombre, lote, fabricante, fechaFabricacion]);
        res.status(200).json(result);
    } catch (error) {
        console.error(`Error al registrar medicamento: ${error.message}`);
        res.status(500).json({ status: 'error', message: 'Error al registrar el medicamento.' });
    }
});

app.get('/api/medicamentos/trazabilidad/:medicamentoId', async (req, res) => {
    const { medicamentoId } = req.params;
    try {
        // Usa la instancia para llamar al método
        const result = await fabricSDKMockInstance.queryChaincode('obtenerTrazabilidadMedicamento', [medicamentoId]);
        res.status(200).json(result);
    } catch (error) {
        console.error(`Error al obtener trazabilidad: ${error.message}`);
        res.status(500).json({ status: 'error', message: 'Error al obtener la trazabilidad del medicamento.' });
    }
});

// 3. Rutas para Gestión de Consentimientos
app.post('/api/consentimientos/registrar', async (req, res) => {
    const { pacienteId, tipoConsentimiento, fechaConsentimiento, estado } = req.body;
    try {
        // Usa la instancia para llamar al método
        const result = await fabricSDKMockInstance.invokeChaincode('registrarConsentimiento', [pacienteId, tipoConsentimiento, fechaConsentimiento, estado]);
        res.status(200).json(result);
    } catch (error) {
        console.error(`Error al registrar consentimiento: ${error.message}`);
        res.status(500).json({ status: 'error', message: 'Error al registrar el consentimiento.' });
    }
});

app.get('/api/consentimientos/:pacienteId', async (req, res) => {
    const { pacienteId } = req.params;
    try {
        // Usa la instancia para llamar al método
        const result = await fabricSDKMockInstance.queryChaincode('obtenerConsentimiento', [pacienteId]);
        res.status(200).json(result);
    } catch (error) {
        console.error(`Error al obtener consentimiento: ${error.message}`);
        res.status(500).json({ status: 'error', message: 'Error al obtener el consentimiento.' });
    }
});

// 4. Rutas para Credenciales de Profesionales de la Salud
app.post('/api/credenciales/registrar', async (req, res) => {
    const { profesionalId, nombre, licencia, especialidad } = req.body;
    try {
        // Usa la instancia para llamar al método
        const result = await fabricSDKMockInstance.invokeChaincode('registrarCredencial', [profesionalId, nombre, licencia, especialidad]);
        res.status(200).json(result);
    } catch (error) {
        console.error(`Error al registrar credencial: ${error.message}`);
        res.status(500).json({ status: 'error', message: 'Error al registrar la credencial.' });
    }
});

app.get('/api/credenciales/:profesionalId', async (req, res) => {
    const { profesionalId } = req.params;
    try {
        // Usa la instancia para llamar al método
        const result = await fabricSDKMockInstance.queryChaincode('obtenerCredencial', [profesionalId]);
        res.status(200).json(result);
    } catch (error) {
        console.error(`Error al obtener credencial: ${error.message}`);
        res.status(500).json({ status: 'error', message: 'Error al obtener la credencial.' });
    }
});

// 5. Rutas para Gestión de Ensayos Clínicos
app.post('/api/ensayos/registrar', async (req, res) => {
    const { ensayoId, nombreEnsayo, fase, fechaInicio, fechaFin } = req.body;
    try {
        // Usa la instancia para llamar al método
        const result = await fabricSDKMockInstance.invokeChaincode('registrarEnsayo', [ensayoId, nombreEnsayo, fase, fechaInicio, fechaFin]);
        res.status(200).json(result);
    } catch (error) {
        console.error(`Error al registrar ensayo clínico: ${error.message}`);
        res.status(500).json({ status: 'error', message: 'Error al registrar el ensayo clínico.' });
    }
});

app.get('/api/ensayos/:ensayoId', async (req, res) => {
    const { ensayoId } = req.params;
    try {
        // Usa la instancia para llamar al método
        const result = await fabricSDKMockInstance.queryChaincode('obtenerEnsayo', [ensayoId]);
        res.status(200).json(result);
    } catch (error) {
        console.error(`Error al obtener ensayo clínico: ${error.message}`);
        res.status(500).json({ status: 'error', message: 'Error al obtener el ensayo clínico.' });
    }
});


// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor backend mock escuchando en http://localhost:${PORT}`);
    console.log('Para probar, puedes usar herramientas como Postman o un frontend.');
    console.log('Ejemplos de rutas:');
    console.log(`GET /`);
    console.log(`POST /api/connect-fabric`);
    console.log(`POST /api/hce/crear (con body: { "pacienteId": "P001", "diagnostico": "Fiebre", "tratamiento": "Reposo" })`);
    console.log(`GET /api/hce/P001`);
});
