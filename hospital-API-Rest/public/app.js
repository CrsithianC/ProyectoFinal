document.addEventListener('DOMContentLoaded', () => {

    const API_BASE_URL = 'http://localhost:3000/api';

    // Obtener todos los formularios
    const createPatientForm = document.getElementById('createPatientForm');
    const queryPatientForm = document.getElementById('queryPatientForm');
    const addEntryForm = document.getElementById('addEntryForm');
    const grantAccessForm = document.getElementById('grantAccessForm');
    
    // Obtener elementos de la UI para resultados
    const statusDiv = document.getElementById('status');
    const resultDiv = document.getElementById('result');

    // Función para actualizar la UI
    const updateUI = (message, isError = false, data = null) => {
        statusDiv.textContent = message;
        statusDiv.className = isError ? 'status-error' : 'status-success';
        if (data) {
            resultDiv.textContent = JSON.stringify(data, null, 2);
        } else {
            resultDiv.textContent = '';
        }
    };

    // Función para mostrar estado de carga
     const setLoading = () => {
        statusDiv.textContent = 'Procesando, por favor espera...';
        statusDiv.className = 'status-loading';
        resultDiv.textContent = '';
    };
    
    // Función para establecer una fecha de expiración por defecto (1 año en el futuro)
    const setDefaultExpirationDate = () => {
        const expiresAtInput = document.getElementById('expiresAt');
        if (expiresAtInput) {
            const now = new Date();
            now.setFullYear(now.getFullYear() + 1);
            const year = now.getFullYear();
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            const day = now.getDate().toString().padStart(2, '0');
            const hours = now.getHours().toString().padStart(2, '0');
            const minutes = now.getMinutes().toString().padStart(2, '0');
            expiresAtInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
        }
    };
    setDefaultExpirationDate();

    // --- Manejadores de Eventos para los Formularios ---

    createPatientForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        setLoading();

        const patientId = document.getElementById('patientId').value;
        const name = document.getElementById('patientName').value;
        const dob = document.getElementById('patientDob').value;

        try {
            const response = await fetch(`${API_BASE_URL}/createPatient`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ patientId, name, dob })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Error desconocido');

            updateUI('Paciente creado con éxito!', false, result);
            // Autocompletar los campos de otros formularios
            document.getElementById('grantAccessPatientId').value = patientId;
            document.getElementById('queryPatientId').value = patientId;
            document.getElementById('addEntryPatientId').value = patientId;

        } catch (error) {
            updateUI(`Error al crear paciente: ${error.message}`, true);
        }
    });

    grantAccessForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        setLoading();

        const patientId = document.getElementById('grantAccessPatientId').value;
        const consenterId = document.getElementById('consenterId').value;
        const purpose = document.getElementById('purpose').value;
        const expiresAtValue = document.getElementById('expiresAt').value;
        const expiresAt = new Date(expiresAtValue).toISOString(); // Convertir a UTC

        try {
            const response = await fetch(`${API_BASE_URL}/grantAccess`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ patientId, consenterId, purpose, expiresAt })
            });
            const result = await response.json();
             if (!response.ok) throw new Error(result.error || 'Error desconocido');
            updateUI('Acceso concedido con éxito!', false, result);
        } catch (error) {
            updateUI(`Error al conceder acceso: ${error.message}`, true);
        }
    });

    queryPatientForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        setLoading();
        const patientId = document.getElementById('queryPatientId').value;
        try {
            const response = await fetch(`${API_BASE_URL}/queryPatientRecord/${patientId}`);
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Error desconocido');
            updateUI('Consulta realizada con éxito!', false, result);
        } catch (error) {
             updateUI(`Error al consultar: ${error.message}`, true);
        }
    });
    
    addEntryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        setLoading();

        const patientId = document.getElementById('addEntryPatientId').value;
        const entryType = document.getElementById('entryType').value;
        const description = document.getElementById('description').value;
        const doctorId = document.getElementById('doctorId').value;
        const hospitalId = document.getElementById('hospitalId').value;

        try {
            const response = await fetch(`${API_BASE_URL}/addRecordEntry`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ patientId, entryType, description, doctorId, hospitalId })
            });
            const result = await response.json();
             if (!response.ok) throw new Error(result.error || 'Error desconocido');
            updateUI('Entrada añadida con éxito!', false, result);
        } catch (error) {
            updateUI(`Error al añadir entrada: ${error.message}`, true);
        }
    });
});