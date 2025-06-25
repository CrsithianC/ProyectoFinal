# Informe de Evolución y Arquitectura: De Script de Consola a API REST con Hyperledger Fabric  
## Proyecto: Sistema de Gestión Hospitalaria con Hyperledger Fabric  

1. **Introducción**  
Este documento detalla el proceso de desarrollo, depuración y refactorización de la aplicación cliente Node.js, diseñada para interactuar con un smart contract (HealthcareContract) en una red Hyperledger Fabric. El objetivo inicial era crear un script funcional, pero el proyecto evolucionó hasta convertirse en una robusta API REST con una interfaz web, siguiendo las mejores prácticas de la industria.  

Este informe sirve como una memoria técnica que explica la razón de ser de cada cambio significativo, proporcionando un contexto valioso sobre los desafíos comunes en el desarrollo de aplicaciones blockchain.  

2. **Fase I: Depuración del Script de Consola (index.js)**  
El punto de partida fue un único script (index.js) destinado a conectarse a la red Fabric y ejecutar una serie de transacciones. Durante esta fase, se abordaron varios errores críticos de conexión e identidad.  

2.1. **Problema: Invalid key type: undefined**  
Causa: La versión más reciente del SDK de Fabric (@hyperledger/fabric-gateway) introdujo cambios en la gestión de claves. Ya no acepta la clave privada como una simple cadena de texto en formato PEM. Espera un objeto criptográfico nativo.  

Solución Implementada: Se importó el módulo crypto de Node.js y se utilizó la función crypto.createPrivateKey(privateKeyPem) para convertir la cadena de texto de la clave en el objeto PrivateKeyObject requerido por el SDK.  

Importancia: Este cambio fue crucial para adaptarse a la nueva API del SDK y es un requisito fundamental para establecer una identidad de firma válida.  
 
2.2. **Problema: Cannot coerce to Uint8Array: object**  
Causa: Este error de serialización se produjo porque la estructura del objeto de identidad que se pasaba a la función connect era incorrecta. El SDK esperaba que las credenciales del certificado fueran un Buffer de bytes, pero estaba recibiendo un objeto anidado.  

Solución Implementada: Se modificó la creación del objeto gatewayIdentity. La propiedad credentials pasó de ser { certificate: certPem } a ser directamente Buffer.from(certPem).  

Importancia: Asegura que la estructura de datos del cliente coincida exactamente con lo que el SDK de Fabric espera, permitiendo que la identidad se serialice correctamente para la comunicación gRPC.  

2.3. **Problema: unable to verify the first certificate**  
Causa: Este es un error de seguridad TLS. Ocurre cuando la aplicación cliente no puede validar el certificado TLS presentado por el peer de la red Fabric. La causa más común es un formato incorrecto del certificado de la CA raíz en el archivo connection-org1.json.  

Solución Implementada: Se añadió una lógica robusta para leer el certificado PEM de la CA, que comprueba si es un array de líneas (común en los perfiles de conexión generados) y, en tal caso, lo une en una única cadena de texto válida.  

Importancia: Garantiza que el cliente gRPC tenga un certificado de CA raíz limpio y válido para establecer una conexión segura y de confianza con la red.  

2.4. **Problema: creator org unknown, creator is malformed**  
Causa: Este es un error de autenticación a nivel de Fabric. El peer recibe la transacción pero no reconoce a la organización que la firma. Esto sucede cuando las credenciales en la carpeta wallet de la aplicación se desincronizan con la CA de la red (por ejemplo, después de reiniciar la red).  

Solución Implementada: La solución no fue un cambio en el código, sino un procedimiento operacional. Se borró la carpeta wallet y se volvieron a ejecutar los scripts enrollAdmin.js y registerUser.js para generar un nuevo conjunto de credenciales válidas y sincronizadas.  

Importancia: Demuestra que la gestión del ciclo de vida de las identidades es tan crucial como el propio código de la aplicación.  
 
3. **Fase II: Refactorización del Chaincode para Lógica Determinista**  
Una vez establecida la conexión, nos enfrentamos a errores lógicos que provenían del propio smart contract.  

Problema: ProposalResponsePayloads do not match  

Causa: Este es un error conceptual clave en blockchain. La red requiere que cada transacción sea determinista: ejecutada en cualquier peer, debe producir exactamente el mismo resultado. El chaincode original generaba valores como IDs y timestamps (new Date().toISOString()) internamente. Esto causaba que diferentes peers produjeran resultados diferentes, haciendo imposible el consenso.  

Solución Implementada: Se refactorizó el chaincode (HealthcareContract.js).  

Se eliminó toda la generación interna de IDs y timestamps.  

Los constructores de las clases de modelo (RecordEntry, AccessConsent, etc.) se modificaron para recibir estos valores como parámetros.  

Las funciones del contrato (addRecordEntry, grantPatientAccess, etc.) se actualizaron para aceptar estos nuevos argumentos.  

Importancia: Este fue el cambio más importante a nivel de arquitectura blockchain. Se trasladó la responsabilidad de generar datos variables del chaincode (entorno compartido y restringido) a la aplicación cliente (entorno controlado), garantizando así el determinismo y la viabilidad de la red.  

4. **Fase III: Evolución a una API REST con Frontend**  
Para hacer el proyecto más robusto, escalable y, sobre todo, demostrable, se tomó la decisión de abandonar el script de consola y construir una API REST.  

Motivación: Una API REST permite que múltiples clientes (una web, una app móvil, otros servicios) interactúen con la blockchain de forma estandarizada. Una interfaz web facilita enormemente la demostración del proyecto.  

Cambios Arquitectónicos Implementados:  

Modularización: Se dividió la lógica. Todo el código de conexión e interacción con Fabric se movió a un módulo dedicado (fabric-client.js). Esto limpia el código y sigue el Principio de Responsabilidad Única.  

Servidor Express (server.js): Se creó un servidor web con Express.js. Este archivo se convirtió en el nuevo punto de entrada (npm start). Su única responsabilidad es gestionar las rutas HTTP (endpoints), recibir peticiones, llamar al módulo fabric-client.js y devolver respuestas.  

Frontend (public/): Se creó una carpeta public para alojar los archivos estáticos de la interfaz de usuario (index.html, style.css, app.js), que son servidos directamente por Express.  

Flujo de Trabajo del Usuario: Se completó el flujo lógico en la interfaz, añadiendo el formulario "Conceder Acceso". Esto permitió demostrar el ciclo completo: crear paciente -> conceder acceso -> consultar historial, validando así la lógica de seguridad del chaincode.  

Importancia: Esta refactorización transformó el proyecto de un simple script de prueba a una aplicación full-stack bien estructurada, escalable y profesional, lista para ser presentada o integrada con otros sistemas.  

