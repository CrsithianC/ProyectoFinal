# Proyecto de Gestión Hospitalaria con Hyperledger Fabric

## Descripción del Proyecto

Este proyecto es una innovadora solución tecnológica diseñada para revolucionar la gestión médica en hospitales mediante el uso de la tecnología blockchain, específicamente Hyperledger Fabric. El objetivo principal es mejorar la trazabilidad, seguridad y eficiencia de los procesos médicos y administrativos, proporcionando una plataforma confiable y transparente para el manejo de la información sanitaria.

## Propósito

La finalidad de este proyecto es abordar los desafíos actuales en el sector salud, como la fragmentación de la información, los errores médicos, el fraude farmacéutico y las ineficiencias administrativas. Al implementar una red blockchain permisionada, buscamos:

- **Reducir errores:** Asegurar la precisión y la inmutabilidad de los datos clínicos y administrativos.
- **Generar ahorro económico:** Minimizar pérdidas por fraude, optimizar la cadena de suministro y agilizar procesos.
- **Garantizar cumplimiento normativo:** Facilitar la auditoría y la adhesión a regulaciones de privacidad de datos (ej. GDPR, HIPAA).
- **Incrementar seguridad y transparencia:** Proteger la información sensible del paciente y fomentar la confianza entre todos los participantes de la red.

## Características

La aplicación ofrece funcionalidades clave para la gestión hospitalaria:

- **Historias Clínicas Electrónicas (HCE) Compartidas y Seguras:** Acceso autorizado y seguro a las HCE de los pacientes, mejorando la coordinación y evitando duplicidades.
- **Trazabilidad de Medicamentos y Suministros Médicos:** Registro del ciclo de vida completo de productos farmacéuticos y suministros, combatiendo la falsificación y optimizando el inventario.
- **Gestión de Consentimientos Informados Digitales:** Digitalización y aseguramiento del proceso de obtención y verificación de consentimientos.
- **Credenciales de Profesionales de la Salud:** Registro verificable de licencias y certificaciones del personal médico.
- **Gestión de Ensayos Clínicos:** Plataforma segura para la integridad y transparencia de los datos de ensayos clínicos.

## Tecnologías Utilizadas

**Frontend:**

- HTML5
- Tailwind CSS
- JavaScript (Vanilla JS)
- Chart.js

**Backend:**

- Node.js
- Express.js
- Hyperledger Fabric SDK for Node.js
- body-parser, cors

**Blockchain:**

- Hyperledger Fabric
- Chaincode (Smart Contracts)

## Cómo Ejecutar el Proyecto

### Prerrequisitos

- Node.js (versión 14 o superior recomendada)
- npm
- Una red Hyperledger Fabric desplegada y en funcionamiento (para la versión completa)
- Alternativamente, puedes usar el backend mock para desarrollo sin una red Fabric.

### Estructura del Proyecto

```
proyecto-final/
├── backend/
│   ├── server.js
│   ├── fabric.service.js       (o fabric-sdk-mock.js para la versión de prueba)
│   ├── connection-org1.json
│   ├── enrollAdmin.js
│   └── wallet/                 (se creará al inscribir al admin)
├── html/
│   └── hospital_blockchain_spa_html.html
└── package.json                (en la raíz del backend)
```

### Pasos para el Backend

1. **Clonar el repositorio:**

```bash
git clone <URL_DEL_REPOSITORIO>
cd proyecto-final/backend
```

2. **Instalar dependencias:**

```bash
npm install
```

3. **Configurar la conexión a Fabric (Solo para Fabric Real):**

- Asegúrate de que tu red Hyperledger Fabric esté funcionando.
- Actualiza `backend/connection-org1.json` con las URLs correctas de tus peers, orderers y CAs, así como los certificados TLS reales (.pem).
- Inscribe al usuario administrador:

```bash
node enrollAdmin.js
```

Esto creará la carpeta `wallet` y guardará la identidad del administrador.

4. **Iniciar el servidor backend:**

- **Para Fabric Real:** Asegúrate de importar `fabricService`.

```bash
node server.js
```

- **Para la Versión Mock (Desarrollo):** Asegúrate de importar y crear una instancia de `fabricSDKMock`.

```bash
node server.js
```

El servidor estará disponible en `http://localhost:3000`.

### Pasos para el Frontend

1. **Abrir el archivo HTML:**

Navega a la carpeta `proyecto-final/html` y abre el archivo `hospital_blockchain_spa_html.html` en tu navegador web.

2. **Interactuar con la aplicación:**

- En la sección "Inicio", haz clic en "Conectar a Fabric (Mock)" para simular la conexión.
- En "La Solución", puedes interactuar con formularios de demostración (Historias Clínicas, Trazabilidad, etc.).

## Créditos

- **Desarrollado por:** [Tu Nombre / Nombre del Equipo]
- **Tecnología Blockchain:** Hyperledger Fabric
- **Librerías Frontend:** Chart.js, Tailwind CSS
- **Framework Backend:** Express.js
