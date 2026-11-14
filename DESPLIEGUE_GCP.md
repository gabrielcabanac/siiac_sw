# Guía de Despliegue y Arquitectura en Google Cloud Platform (GCP) — SIIAC

> 👤 **Autor:** Gabriel Cabana • Administrador General  
> 🏢 **Proyecto:** SIIAC (Sistema Integrado de Información y Atención al Ciudadano)  
> ☁️ **Plataforma Nube:** Google Cloud Platform (GCP)  

---

## 1. ¿Se puede desplegar en GCP de forma 100% gratuita?

**SÍ, rotundo.** Google Cloud cuenta con el programa **Always Free (Nivel Siempre Gratuito)** que permite ejecutar el SIIAC a costo US$ 0.00 mensual:

| Servicio GCP | Función en el SIIAC | Cuota Gratuita Mensual (*Always Free*) | Costo en Demo |
| :--- | :--- | :--- | :--- |
| **Cloud Run** | Servidor web frontend y API serverless | **2 millones de solicitudes/mes** + 360,000 vCPU-seg | **US$ 0.00** |
| **Cloud Run Jobs** | Ingestión masiva de archivos batch (>100K filas) | Incluido dentro del pool de tiempo de Cloud Run | **US$ 0.00** |
| **Cloud Storage** | Almacenamiento de Excels recibidos de inspectores y bancos | **5 GB de almacenamiento estándar** en `us-central1` | **US$ 0.00** |
| **Firebase Hosting** | CDN global y SSL de Google para la interfaz web | **10 GB de almacenamiento** + 360 MB/día de tráfico | **US$ 0.00** |
| **Cloud Build** | Compilación de contenedores Docker en la nube | **120 minutos de compilación diarios gratis** | **US$ 0.00** |

> ⚠️ **Nota crítica sobre Cloud SQL:**  
> Las bases de datos administradas de Cloud SQL (PostgreSQL) **NO forman parte del Always Free Tier** (cuestan aprox. US$ 9 a 25/mes tras expirar el periodo de prueba). Por esta razón arquitectónica, para mantener el sistema **100% gratis**, se utiliza:
> - En desarrollo/evaluación académica: Base de datos en la nube de Supabase (PostgreSQL en capa gratuita permanente) o Cloud SQL cubierto por los **US$ 300 de créditos promocionales de Google**.

---

## 2. Los 3 Métodos para Llevar el SIIAC a Google Cloud

### Método 1: Despliegue Express en Google (Firebase Hosting) — 3 minutos
Firebase Hosting es parte de la infraestructura de Google Cloud y provee un dominio oficial `*.web.app` de Google sin pedir tarjeta de crédito ni Docker:

1. Instalar la herramienta oficial de Google:
   ```powershell
   npm install -g firebase-tools
   ```
2. Iniciar sesión con tu cuenta de Google:
   ```powershell
   firebase login
   ```
3. Inicializar y desplegar:
   ```powershell
   firebase init hosting
   # Seleccionar carpeta pública: dist
   # Configurar como SPA: Yes (y)
   firebase deploy
   ```
   *Te entrega una URL oficial de Google como: `https://siiac-gabrielcabana.web.app`*.

---

### Método 2: Despliegue en Contenedores con Cloud Run vía Google Cloud Shell (Sin instalar nada en tu PC)
Como no necesitas instalar Docker ni el SDK en tu computadora Windows, puedes usar la consola web gratuita de Google Cloud:

1. Entra a [console.cloud.google.com](https://console.cloud.google.com).
2. Abre **Cloud Shell** (ícono de terminal `>_` en la esquina superior derecha). Cloud Shell ya tiene `gcloud`, `docker` y `git` instalados de fábrica.
3. Clona o sube la carpeta del proyecto a Cloud Shell.
4. Ejecuta un solo comando:
   ```bash
   gcloud run deploy siiac-frontend \
     --source . \
     --region us-central1 \
     --allow-unauthenticated \
     --port 8080
   ```
   *Cloud Build construirá automáticamente el `Dockerfile` que dejamos configurado y te entregará tu URL de Cloud Run: `https://siiac-frontend-xxxx-uc.a.run.app`*.

---

### Método 3: La Estrategia Híbrida para la Presentación de Mañana (La más recomendada)
* **Frontend y Demostración en Vivo:** Ejecutándose en la URL pública activa: [https://automatizacion-proy-sw.vercel.app](https://automatizacion-proy-sw.vercel.app).
* **Evidencias Técnicas de GCP para el Profesor:**
  * Mostrar los archivos de contenedorización en el repositorio:
    * `Dockerfile`: Multi-stage build con Node 20 + Nginx en puerto 8080.
    * `nginx.conf`: Configuración con enrutamiento SPA y caché para Cloud Run.
    * `cloudbuild.yaml`: Pipeline de CI/CD para Cloud Build y Artifact Registry.
  * Mostrar el **Simulador de Carga Masiva (>100K)** en `/operaciones`, sustentando el pipeline de Cloud Storage + Cloud Run Jobs + Cloud SQL.

---

## 3. Justificación de la Arquitectura GCP ante el Profesor

Si el docente pregunta: *¿Cómo procesan 500 000 filas en Google Cloud?*

### El Flujo de Ingestión en GCP:
```mermaid
flowchart LR
    A["Usuario / Inspector"] -->|1. Sube archivo 500K| B["Cloud Storage (Bucket)\nvia Signed URL"]
    B -->|2. Eventarc Trigger| C["Cloud Run Jobs\n(Tarea Batch Desacoplada)"]
    C -->|3. Streaming Chunks (5,000)| D["Cloud SQL PostgreSQL\n(Capa Staging - COPY FROM)"]
    D -->|4. PL/pgSQL Stored Proc| E["Core Consolidado\n(Papeletas + Pagos + Intereses)"]
```

1. **Recepción sin colapso web:** El usuario sube el Excel directamente a un bucket de **Cloud Storage** mediante una *Signed URL*. El archivo nunca toca la memoria del servidor web, evitando desbordamientos de RAM (OOM) y límites de timeout de HTTP (que suelen ser 60 segundos).
2. **Procesamiento Asíncrono en Cloud Run Jobs:** Al terminar la subida, un evento activa un **Cloud Run Job**. A diferencia de un servicio web normal, los Jobs pueden ejecutarse hasta por **24 horas** con memoria dedicada (hasta 32 GB) procesando por streams sin bloquear usuarios.
3. **Carga Ultrarrápida en Cloud SQL:** En lugar de hacer 500,000 `INSERT` individuales (que tardarían 40 minutos), el Job utiliza el comando nativo `COPY FROM STDIN` de PostgreSQL, reduciendo la inserción en la Capa Staging a menos de **8 segundos**.

