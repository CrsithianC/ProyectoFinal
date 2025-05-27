// fabric-sdk-mock.js
// Simula el SDK de Hyperledger Fabric para propósitos de desarrollo y prueba en el frontend
class FabricSDKMock {
    constructor() {
        this.isConnected = false;
        // Simulación de un ledger (libro mayor) en memoria
        this.mockLedger = {
            hce: {}, // { pacienteId: { diagnostico: '...', tratamiento: '...', fecha: '...' } }
            medicamentos: {}, // { medicamentoId: { nombre: '...', lote: '...', fabricante: '...', fechaFabricacion: 'YYYY-MM-DD', eventos: [] } }
            consentimientos: {}, // { pacienteId: { tipo: '...', fecha: '...', estado: '...' } }
            credenciales: {}, // { profesionalId: { nombre: '...', licencia: '...', especialidad: '...' } }
            ensayos: {} // { ensayoId: { nombre: '...', fase: '...', fechaInicio: '...', fechaFin: '...' } }
        };
        console.log("FabricSDKMock inicializado.");
    }

    async connect() {
        return new Promise(resolve => {
            setTimeout(() => {
                this.isConnected = true;
                console.log("Mock Fabric SDK conectado.");
                resolve({ success: true, message: "Conectado al mock de Hyperledger Fabric." });
            }, 500); // Simula un retardo de red
        });
    }

    async invokeChaincode(functionName, args) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                let result = { success: false, message: "Función no reconocida en mock." };
                const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

                switch (functionName) {
                    case 'crearHistoriaClinica':
                        const [pacienteIdHce, diagnostico, tratamiento] = args;
                        if (pacienteIdHce && diagnostico && tratamiento) {
                            this.mockLedger.hce[pacienteIdHce] = {
                                pacienteId: pacienteIdHce,
                                diagnostico,
                                tratamiento,
                                fecha: currentDate // Fecha actual para la creación
                            };
                            result = { success: true, message: `Historia clínica para ${pacienteIdHce} creada con éxito (mock).` };
                        } else {
                            result = { success: false, message: "Faltan argumentos para crear HCE." };
                        }
                        break;

                    case 'registrarMedicamento':
                        const [medicamentoId, nombre, lote, fabricante, fechaFabricacion] = args;
                        if (medicamentoId && nombre && lote && fabricante && fechaFabricacion) {
                            this.mockLedger.medicamentos[medicamentoId] = {
                                medicamentoId,
                                nombre,
                                lote,
                                fabricante,
                                fechaFabricacion,
                                eventos: [
                                    { evento: "Fabricación", fecha: fechaFabricacion } // Primer evento de fabricación
                                ]
                            };
                            result = { success: true, message: `Medicamento ${nombre} (${medicamentoId}) registrado con éxito (mock).` };
                        } else {
                            result = { success: false, message: "Faltan argumentos para registrar medicamento." };
                        }
                        break;

                    case 'registrarConsentimiento':
                        const [pacienteIdCons, tipoConsentimiento, fechaConsentimiento, estado] = args;
                        if (pacienteIdCons && tipoConsentimiento && fechaConsentimiento && estado) {
                            this.mockLedger.consentimientos[pacienteIdCons] = {
                                pacienteId: pacienteIdCons,
                                tipoConsentimiento,
                                fechaConsentimiento,
                                estado,
                                fechaRegistro: currentDate
                            };
                            result = { success: true, message: `Consentimiento para ${pacienteIdCons} registrado con éxito (mock).` };
                        } else {
                            result = { success: false, message: "Faltan argumentos para registrar consentimiento." };
                        }
                        break;
                    
                    case 'registrarCredencial':
                        const [profesionalId, nombreProf, licencia, especialidad] = args;
                        if (profesionalId && nombreProf && licencia && especialidad) {
                            this.mockLedger.credenciales[profesionalId] = {
                                profesionalId,
                                nombre: nombreProf,
                                licencia,
                                especialidad,
                                fechaEmision: currentDate
                            };
                            result = { success: true, message: `Credencial para ${nombreProf} (${profesionalId}) registrada con éxito (mock).` };
                        } else {
                            result = { success: false, message: "Faltan argumentos para registrar credencial." };
                        }
                        break;

                    case 'registrarEnsayo':
                        const [ensayoId, nombreEnsayo, fase, fechaInicio, fechaFin] = args;
                        if (ensayoId && nombreEnsayo && fase && fechaInicio) {
                            this.mockLedger.ensayos[ensayoId] = {
                                ensayoId,
                                nombreEnsayo,
                                fase,
                                fechaInicio,
                                fechaFin: fechaFin || null, // Permite que fechaFin sea opcional
                                fechaRegistro: currentDate
                            };
                            result = { success: true, message: `Ensayo clínico ${nombreEnsayo} (${ensayoId}) registrado con éxito (mock).` };
                        } else {
                            result = { success: false, message: "Faltan argumentos obligatorios para registrar ensayo." };
                        }
                        break;

                    default:
                        result = { success: false, message: `Función de invoke desconocida: ${functionName}` };
                }
                resolve(result);
            }, 500); // Simula un retardo
        });
    }

    async queryChaincode(functionName, args) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                let result = { success: false, message: "Función no reconocida en mock." };

                switch (functionName) {
                    case 'obtenerHistoriaClinica':
                        const pacienteIdHce = args[0];
                        if (this.mockLedger.hce[pacienteIdHce]) {
                            result = { success: true, data: this.mockLedger.hce[pacienteIdHce] };
                        } else {
                            result = { success: false, message: `HCE para paciente ${pacienteIdHce} no encontrada (mock).` };
                        }
                        break;

                    case 'obtenerTrazabilidadMedicamento':
                        const medicamentoId = args[0];
                        const medicamento = this.mockLedger.medicamentos[medicamentoId];
                        if (medicamento) {
                            // Si el medicamento existe, devolvemos sus eventos registrados
                            // Más un evento de "Distribución" simulado con una fecha posterior
                            const fechaDistribucion = new Date(medicamento.fechaFabricacion);
                            fechaDistribucion.setDate(fechaDistribucion.getDate() + 5); // 5 días después de fabricación
                            
                            const trazabilidadEvents = [
                                { evento: "Fabricación", fecha: medicamento.fechaFabricacion },
                                { evento: "Distribución", fecha: fechaDistribucion.toISOString().split('T')[0] } // Formato YYYY-MM-DD
                            ];
                            // Si hubiéramos registrado más eventos en invoke, los añadiríamos aquí también
                            
                            result = { success: true, data: trazabilidadEvents };
                        } else {
                            result = { success: false, message: `Trazabilidad para medicamento ${medicamentoId} no encontrada (mock).` };
                        }
                        break;

                    case 'obtenerConsentimiento':
                        const pacienteIdCons = args[0];
                        if (this.mockLedger.consentimientos[pacienteIdCons]) {
                            result = { success: true, data: this.mockLedger.consentimientos[pacienteIdCons] };
                        } else {
                            result = { success: false, message: `Consentimiento para paciente ${pacienteIdCons} no encontrado (mock).` };
                        }
                        break;

                    case 'obtenerCredencial':
                        const profesionalId = args[0];
                        if (this.mockLedger.credenciales[profesionalId]) {
                            result = { success: true, data: this.mockLedger.credenciales[profesionalId] };
                        } else {
                            result = { success: false, message: `Credencial para profesional ${profesionalId} no encontrada (mock).` };
                        }
                        break;

                    case 'obtenerEnsayo':
                        const ensayoId = args[0];
                        if (this.mockLedger.ensayos[ensayoId]) {
                            result = { success: true, data: this.mockLedger.ensayos[ensayoId] };
                        } else {
                            result = { success: false, message: `Ensayo clínico ${ensayoId} no encontrado (mock).` };
                        }
                        break;

                    default:
                        result = { success: false, message: `Función de query desconocida: ${functionName}` };
                }
                resolve(result);
            }, 500); // Simula un retardo
        });
    }
}

module.exports = FabricSDKMock;
