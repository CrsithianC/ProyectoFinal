'use strict';

const { Contract, Context } = require('fabric-contract-api'); // Importa las clases necesarias de fabric-contract-api

// Clase para representar un registro médico electrónico de un paciente.
class PatientRecord {
    constructor(patientID, name, dateOfBirth) {
        this.patientID = patientID;
        this.name = name;
        this.dateOfBirth = dateOfBirth;
        this.entries = [];
        this.accessConsents = [];
    }
}

class RecordEntry {
    // CAMBIO: Se añade 'timestamp' como parámetro del constructor.
    constructor(entryID, timestamp, eventType, description, doctorID, hospitalID) {
        this.entryID = entryID;
        this.timestamp = timestamp; // Se usa el timestamp proporcionado.
        this.eventType = eventType;
        this.description = description;
        this.doctorID = doctorID;
        this.hospitalID = hospitalID;
    }
}

class AccessConsent {
    // CAMBIO: Se añade 'grantedAt' como parámetro.
    constructor(consenterID, purpose, grantedAt, expiresAt = 'indefinido') {
        this.consenterID = consenterID;
        this.purpose = purpose;
        this.grantedAt = grantedAt; // Se usa la fecha proporcionada.
        this.expiresAt = expiresAt;
        this.isActive = true;
    }
}

class DrugBatch {
    constructor(batchID, productName, manufacturer, manufactureDate, expiryDate) {
        this.batchID = batchID;
        this.productName = productName;
        this.manufacturer = manufacturer;
        this.manufactureDate = manufactureDate;
        this.expiryDate = expiryDate;
        this.history = [];
    }
}

class BatchEvent {
    // CAMBIO: Se añade 'timestamp' como parámetro.
    constructor(eventID, timestamp, location, status, actorID) {
        this.eventID = eventID;
        this.timestamp = timestamp; // Se usa el timestamp proporcionado.
        this.location = location;
        this.status = status;
        this.actorID = actorID;
    }
}

// Clase para representar una credencial de un profesional médico.
class ProfessionalCredential {
    constructor(profID, name, licenseType, licenseNumber, issueDate, expiryDate, issuerID, status) {
        this.profID = profID;
        this.name = name;
        this.licenseType = licenseType;
        this.licenseNumber = licenseNumber;
        this.issueDate = issueDate;
        this.expiryDate = expiryDate;
        this.issuerID = issuerID;
        this.status = status;
    }
}

// Clase para representar una reclamación o registro de pago.
class PaymentClaim {
    constructor(claimID, patientID, serviceID, amount, currency, submitterID, status) {
        this.claimID = claimID;
        this.patientID = patientID;
        this.serviceID = serviceID;
        this.amount = amount;
        this.currency = currency;
        this.claimDate = new Date().toISOString();
        this.submitterID = submitterID;
        this.status = status;
    }
}

// Clase para representar el consentimiento de un paciente para la investigación.
class ResearchConsent {
    constructor(patientID, researchProjectID, dataTypesConsented) {
        this.patientID = patientID;
        this.researchProjectID = researchProjectID;
        this.consentDate = new Date().toISOString();
        this.dataTypesConsented = dataTypesConsented;
        this.isActive = true;
    }
}

// Define el contexto del contrato inteligente
class HealthcareContext extends Context {
    constructor() {
        super();
    }
}

// Define el contrato inteligente principal
class HealthcareContract extends Contract {

    constructor() {
        super('org.healthcare.HealthcareContract'); // Nombre del contrato inteligente
    }

    // Crea un nuevo contexto para el contrato
    createContext() {
        return new HealthcareContext();
    }

    // Método de inicialización del chaincode
    async initLedger(ctx) {
        console.info('=========== Initializing Ledger ===========');
        // Puedes poblar el ledger con datos iniciales aquí si es necesario
        console.info('=========== Ledger Initialized ===========');
    }

    /**
     * Crea un nuevo registro de paciente.
     * @param {HealthcareContext} ctx El contexto de la transacción.
     * @param {string} patientID ID único del paciente.
     * @param {string} name Nombre completo del paciente.
     * @param {string} dateOfBirth Fecha de nacimiento del paciente (ISO 8601).
     */
    async createPatient(ctx, patientID, name, dateOfBirth) {
        console.info(`Creating patient: ${patientID}`);

        const exists = await this.patientExists(ctx, patientID);
        if (exists) {
            throw new Error(`The patient ${patientID} already exists`);
        }

        const patient = new PatientRecord(patientID, name, dateOfBirth);
        await ctx.stub.putState(patientID, Buffer.from(JSON.stringify(patient)));
        console.info(`Patient ${patientID} created successfully.`);
        return JSON.stringify(patient);
    }

    /**
     * Añade una nueva entrada al historial médico de un paciente.
     * @param {HealthcareContext} ctx El contexto de la transacción.
     * @param {string} patientID ID del paciente.
     * @param {string} entryID ID único para esta entrada del registro.
     * @param {string} eventType Tipo de evento (ej: "Diagnóstico", "Tratamiento").
     * @param {string} description Descripción detallada de la entrada.
     * @param {string} doctorID ID del médico que realiza la entrada.
     * @param {string} hospitalID ID del hospital.
     */
    async addRecordEntry(ctx, patientID, entryID, eventType, description, doctorID, hospitalID, timestamp) {
        console.info(`Adding record entry ${entryID} for patient ${patientID}`);

        const patientAsBytes = await ctx.stub.getState(patientID);
        if (!patientAsBytes || patientAsBytes.length === 0) {
            throw new Error(`Patient ${patientID} not found`);
        }

        const patient = JSON.parse(patientAsBytes.toString());

        // Verificar si la entrada ya existe
        const entryExists = patient.entries.some(entry => entry.entryID === entryID);
        if (entryExists) {
            throw new Error(`Entry ID ${entryID} already exists for patient ${patientID}`);
        }

        const newEntry = new RecordEntry(entryID, timestamp, eventType, description, doctorID, hospitalID);
        patient.entries.push(newEntry);

        await ctx.stub.putState(patientID, Buffer.from(JSON.stringify(patient)));
        console.info(`Record entry ${entryID} added for patient ${patientID}.`);
        return JSON.stringify(patient);
    }

    /**
     * Registra el consentimiento de un paciente para que una entidad acceda a sus datos.
     * @param {HealthcareContext} ctx El contexto de la transacción.
     * @param {string} patientID ID del paciente.
     * @param {string} consenterID ID de la entidad o profesional que solicita acceso.
     * @param {string} purpose Propósito del acceso (ej: "Tratamiento", "Investigación").
     * @param {string} [expiresAt='indefinido'] Fecha de expiración del consentimiento (ISO 8601).
     */
    async grantPatientAccess(ctx, patientID, consenterID, purpose, expiresAt, grantedAt) {
        console.info(`Granting access for ${consenterID} to patient ${patientID}`);

        const patientAsBytes = await ctx.stub.getState(patientID);
        if (!patientAsBytes || patientAsBytes.length === 0) {
            throw new Error(`Patient ${patientID} not found`);
        }

        const patient = JSON.parse(patientAsBytes.toString());

        // Desactivar consentimientos previos activos para el mismo consenterID y propósito
        patient.accessConsents.forEach(consent => {
            if (consent.consenterID === consenterID && consent.purpose === purpose && consent.isActive) {
                consent.isActive = false;
            }
        });

        const newConsent = new AccessConsent(consenterID, purpose, grantedAt ,expiresAt);
        patient.accessConsents.push(newConsent);

        await ctx.stub.putState(patientID, Buffer.from(JSON.stringify(patient)));
        console.info(`Access granted to ${consenterID} for patient ${patientID}.`);
        return JSON.stringify(patient);
    }

    /**
     * Desactiva un consentimiento existente de un paciente.
     * @param {HealthcareContext} ctx El contexto de la transacción.
     * @param {string} patientID ID del paciente.
     * @param {string} consenterID ID de la entidad o profesional.
     * @param {string} purpose Propósito del acceso.
     */
    async revokePatientAccess(ctx, patientID, consenterID, purpose) {
        console.info(`Revoking access for ${consenterID} to patient ${patientID} for purpose ${purpose}`);

        const patientAsBytes = await ctx.stub.getState(patientID);
        if (!patientAsBytes || patientAsBytes.length === 0) {
            throw new Error(`Patient ${patientID} not found`);
        }

        const patient = JSON.parse(patientAsBytes.toString());

        let foundAndRevoked = false;
        for (let i = 0; i < patient.accessConsents.length; i++) {
            const consent = patient.accessConsents[i];
            if (consent.consenterID === consenterID && consent.purpose === purpose && consent.isActive) {
                consent.isActive = false;
                foundAndRevoked = true;
                break;
            }
        }

        if (!foundAndRevoked) {
            throw new Error(`No active consent found for ${consenterID} with purpose '${purpose}' for patient ${patientID}.`);
        }

        await ctx.stub.putState(patientID, Buffer.from(JSON.stringify(patient)));
        console.info(`Access revoked for ${consenterID} to patient ${patientID}.`);
        return JSON.stringify(patient);
    }

    /**
     * Consulta el registro médico de un paciente, verificando el consentimiento.
     * @param {HealthcareContext} ctx El contexto de la transacción.
     * @param {string} patientID ID del paciente.
     * @param {string} requestingConsenterID ID de la entidad que solicita el acceso.
     * @param {string} purpose Propósito del acceso.
     */
    async queryPatientRecord(ctx, patientID, requestingConsenterID, purpose) {
        console.info(`Querying patient record for ${patientID} by ${requestingConsenterID} for purpose ${purpose}`);

        const patientAsBytes = await ctx.stub.getState(patientID);
        if (!patientAsBytes || patientAsBytes.length === 0) {
            throw new Error(`Patient ${patientID} not found`);
        }

        const patient = JSON.parse(patientAsBytes.toString());

        let hasAccess = false;
        for (const consent of patient.accessConsents) {
            if (consent.consenterID === requestingConsenterID && consent.purpose === purpose && consent.isActive) {
                if (consent.expiresAt && consent.expiresAt !== 'indefinido') {
                    const expiryTime = new Date(consent.expiresAt);
                    const txTimestamp = new Date(ctx.stub.getTxTimestamp().seconds.low * 1000);
                    if (txTimestamp < expiryTime) {
                        hasAccess = true;
                        break;
                    }
                } else {
                    hasAccess = true;
                    break;
                }
            }
        }

        if (!hasAccess) {
            throw new Error(`Access denied. ${requestingConsenterID} does not have active consent for purpose '${purpose}' for patient ${patientID}.`);
        }

        return JSON.stringify(patient);
    }

    /**
     * Verifica si un paciente existe en el ledger.
     * @param {HealthcareContext} ctx El contexto de la transacción.
     * @param {string} patientID ID del paciente.
     * @returns {boolean} True si el paciente existe, False en caso contrario.
     */
    async patientExists(ctx, patientID) {
        const patientAsBytes = await ctx.stub.getState(patientID);
        return patientAsBytes && patientAsBytes.length > 0;
    }

    /**
     * Registra un nuevo lote de medicamentos en el ledger.
     * @param {HealthcareContext} ctx El contexto de la transacción.
     * @param {string} batchID ID único del lote.
     * @param {string} productName Nombre del producto.
     * @param {string} manufacturer Fabricante.
     * @param {string} manufactureDate Fecha de fabricación (ISO 8601).
     * @param {string} expiryDate Fecha de expiración (ISO 8601).
     */
    async createDrugBatch(ctx, batchID, productName, manufacturer, manufactureDate, expiryDate) {
       console.info(`Creating drug batch: ${batchID}`);

       const exists = await this.drugBatchExists(ctx, batchID);
       if (exists) {
           throw new Error(`The drug batch ${batchID} already exists`);
       }

       const drugBatch = new DrugBatch(batchID, productName, manufacturer, manufactureDate, expiryDate);
       const txTimestamp = new Date(ctx.stub.getTxTimestamp().seconds.low * 1000).toISOString();
       const initialEvent = new BatchEvent(`${batchID}-init`, txTimestamp, manufacturer, 'Fabricado', manufacturer);
       drugBatch.history.push(initialEvent);

       await ctx.stub.putState(batchID, Buffer.from(JSON.stringify(drugBatch)));
       console.info(`Drug batch ${batchID} created successfully.`);
       return JSON.stringify(drugBatch);
   }

    /**
     * Añade un nuevo evento a la historia de un lote de medicamentos.
     * @param {HealthcareContext} ctx El contexto de la transacción.
     * @param {string} batchID ID del lote.
     * @param {string} eventID ID único para este evento.
     * @param {string} location Ubicación actual del lote.
     * @param {string} status Estado del lote (ej: "En Tránsito", "Recibido").
     * @param {string} actorID Quién realizó la acción.
     */
    async updateDrugBatchStatus(ctx, batchID, eventID, location, status, actorID, timestamp) {
        console.info(`Updating status for drug batch ${batchID} with event ${eventID}`);

        const drugBatchAsBytes = await ctx.stub.getState(batchID);
        if (!drugBatchAsBytes || drugBatchAsBytes.length === 0) {
            throw new Error(`Drug batch ${batchID} not found`);
        }

        const drugBatch = JSON.parse(drugBatchAsBytes.toString());

        // Verificar si el evento ya existe
        const eventExists = drugBatch.history.some(event => event.eventID === eventID);
        if (eventExists) {
            throw new Error(`Event ID ${eventID} already exists for batch ${batchID}`);
        }

        const newEvent = new BatchEvent(eventID, timestamp, location, status, actorID);
        drugBatch.history.push(newEvent);

        await ctx.stub.putState(batchID, Buffer.from(JSON.stringify(drugBatch)));
        console.info(`Drug batch ${batchID} status updated.`);
        return JSON.stringify(drugBatch);
    }

    async patientExists(ctx, patientID) {
        const patientAsBytes = await ctx.stub.getState(patientID);
        return patientAsBytes && patientAsBytes.length > 0;

    }

    /**
     * Consulta la historia completa de un lote de medicamentos.
     * @param {HealthcareContext} ctx El contexto de la transacción.
     * @param {string} batchID ID del lote.
     */
    async queryDrugBatchHistory(ctx, batchID) {
        console.info(`Querying drug batch history for ${batchID}`);

        const drugBatchAsBytes = await ctx.stub.getState(batchID);
        if (!drugBatchAsBytes || drugBatchAsBytes.length === 0) {
            throw new Error(`Drug batch ${batchID} not found`);
        }

        return drugBatchAsBytes.toString();
    }

    /**
     * Verifica si un lote de medicamento existe en el ledger.
     * @param {HealthcareContext} ctx El contexto de la transacción.
     * @param {string} batchID ID del lote.
     * @returns {boolean} True si el lote existe, False en caso contrario.
     */
    async drugBatchExists(ctx, batchID) {
        const drugBatchAsBytes = await ctx.stub.getState(batchID);
        return drugBatchAsBytes && drugBatchAsBytes.length > 0;
    }

    /**
     * Registra las credenciales de un profesional médico.
     * @param {HealthcareContext} ctx El contexto de la transacción.
     * @param {string} profID ID único del profesional.
     * @param {string} name Nombre completo del profesional.
     * @param {string} licenseType Tipo de licencia (ej: "Médico", "Enfermero").
     * @param {string} licenseNumber Número de licencia.
     * @param {string} issueDate Fecha de emisión (ISO 8601).
     * @param {string} expiryDate Fecha de expiración (ISO 8601).
     * @param {string} issuerID Entidad que emitió la credencial.
     * @param {string} status Estado de la credencial ("Activo", "Suspendido").
     */
    async registerProfessional(ctx, profID, name, licenseType, licenseNumber, issueDate, expiryDate, issuerID, status) {
        console.info(`Registering professional: ${profID}`);

        const exists = await this.professionalExists(ctx, profID);
        if (exists) {
            throw new Error(`The professional ${profID} already exists`);
        }

        const professional = new ProfessionalCredential(profID, name, licenseType, licenseNumber, issueDate, expiryDate, issuerID, status);
        await ctx.stub.putState(profID, Buffer.from(JSON.stringify(professional)));
        console.info(`Professional ${profID} registered successfully.`);
        return JSON.stringify(professional);
    }

    /**
     * Consulta y verifica las credenciales de un profesional médico.
     * @param {HealthcareContext} ctx El contexto de la transacción.
     * @param {string} profID ID del profesional.
     */
    async verifyProfessional(ctx, profID) {
        console.info(`Verifying professional: ${profID}`);

        const profAsBytes = await ctx.stub.getState(profID);
        if (!profAsBytes || profAsBytes.length === 0) {
            throw new Error(`Professional ${profID} not found`);
        }

        // En un escenario real, aquí se podría añadir lógica de verificación de expiración, estado, etc.
        return profAsBytes.toString();
    }

    /**
     * Verifica si un profesional existe en el ledger.
     * @param {HealthcareContext} ctx El contexto de la transacción.
     * @param {string} profID ID del profesional.
     * @returns {boolean} True si el profesional existe, False en caso contrario.
     */
    async professionalExists(ctx, profID) {
        const profAsBytes = await ctx.stub.getState(profID);
        return profAsBytes && profAsBytes.length > 0;
    }

    /**
     * Registra una nueva reclamación de pago.
     * @param {HealthcareContext} ctx El contexto de la transacción.
     * @param {string} claimID ID único de la reclamación.
     * @param {string} patientID ID del paciente asociado.
     * @param {string} serviceID ID del servicio médico.
     * @param {number} amount Monto de la reclamación.
     * @param {string} currency Moneda (ej: "EUR").
     * @param {string} submitterID Quién presenta la reclamación (Hospital, Aseguradora).
     * @param {string} status Estado inicial ("Pendiente").
     */
    async submitPaymentClaim(ctx, claimID, patientID, serviceID, amount, currency, submitterID, status) {
        console.info(`Submitting payment claim: ${claimID}`);

        const exists = await this.paymentClaimExists(ctx, claimID);
        if (exists) {
            throw new Error(`The payment claim ${claimID} already exists`);
        }

        // Convertir el monto a número
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount)) {
            throw new Error(`Invalid amount provided: ${amount}`);
        }

        const claim = new PaymentClaim(claimID, patientID, serviceID, parsedAmount, currency, submitterID, status);
        await ctx.stub.putState(claimID, Buffer.from(JSON.stringify(claim)));
        console.info(`Payment claim ${claimID} submitted successfully.`);
        return JSON.stringify(claim);
    }

    /**
     * Actualiza el estado de una reclamación de pago existente.
     * @param {HealthcareContext} ctx El contexto de la transacción.
     * @param {string} claimID ID de la reclamación.
     * @param {string} newStatus Nuevo estado (ej: "Aprobado", "Pagado").
     */
    async updateClaimStatus(ctx, claimID, newStatus) {
        console.info(`Updating status for payment claim: ${claimID} to ${newStatus}`);

        const claimAsBytes = await ctx.stub.getState(claimID);
        if (!claimAsBytes || claimAsBytes.length === 0) {
            throw new Error(`Payment claim ${claimID} not found`);
        }

        const claim = JSON.parse(claimAsBytes.toString());
        claim.status = newStatus; // Actualiza el estado

        await ctx.stub.putState(claimID, Buffer.from(JSON.stringify(claim)));
        console.info(`Payment claim ${claimID} status updated to ${newStatus}.`);
        return JSON.stringify(claim);
    }

    /**
     * Verifica si una reclamación de pago existe en el ledger.
     * @param {HealthcareContext} ctx El contexto de la transacción.
     * @param {string} claimID ID de la reclamación.
     * @returns {boolean} True si la reclamación existe, False en caso contrario.
     */
    async paymentClaimExists(ctx, claimID) {
        const claimAsBytes = await ctx.stub.getState(claimID);
        return claimAsBytes && claimAsBytes.length > 0;
    }

    /**
     * Registra el consentimiento de un paciente para la investigación.
     * @param {HealthcareContext} ctx El contexto de la transacción.
     * @param {string} patientID ID del paciente.
     * @param {string} researchProjectID ID del proyecto de investigación.
     * @param {string} dataTypesConsented Tipos de datos consentidos (ej: "historial completo").
     */
    async recordResearchConsent(ctx, patientID, researchProjectID, dataTypesConsented) {
        console.info(`Recording research consent for patient ${patientID} for project ${researchProjectID}`);

        const patientExists = await this.patientExists(ctx, patientID);
        if (!patientExists) {
            throw new Error(`Patient ${patientID} not found`);
        }

        const consentKey = `RESEARCHCONSENT:${patientID}:${researchProjectID}`;
        const existingConsentAsBytes = await ctx.stub.getState(consentKey);

        if (existingConsentAsBytes && existingConsentAsBytes.length > 0) {
            const existingConsent = JSON.parse(existingConsentAsBytes.toString());
            if (existingConsent.isActive) {
                throw new Error(`Active research consent already exists for patient ${patientID} and project ${researchProjectID}.`);
            }
        }

        const newConsent = new ResearchConsent(patientID, researchProjectID, dataTypesConsented);
        await ctx.stub.putState(consentKey, Buffer.from(JSON.stringify(newConsent)));
        console.info(`Research consent recorded for patient ${patientID} and project ${researchProjectID}.`);
        return JSON.stringify(newConsent);
    }

    /**
     * Consulta el estado de un consentimiento de investigación para un paciente y proyecto.
     * @param {HealthcareContext} ctx El contexto de la transacción.
     * @param {string} patientID ID del paciente.
     * @param {string} researchProjectID ID del proyecto de investigación.
     */
    async queryResearchConsent(ctx, patientID, researchProjectID) {
        console.info(`Querying research consent for patient ${patientID} and project ${researchProjectID}`);

        const consentKey = `RESEARCHCONSENT:${patientID}:${researchProjectID}`;
        const consentAsBytes = await ctx.stub.getState(consentKey);

        if (!consentAsBytes || consentAsBytes.length === 0) {
            throw new Error(`No research consent found for patient ${patientID} and project ${researchProjectID}.`);
        }

        return consentAsBytes.toString();
    }
}

// Exporta la clase del contrato para que pueda ser utilizada por el entorno de Hyperledger Fabric
module.exports = HealthcareContract;
