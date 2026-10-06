# 🏎️ Marketing VIP - Ruleta Gran Pantalla & Apps Móviles PWA
> **Empresa:** Marketing VIP  
> **Slogan:** *"Especialistas en sueños"*  
> **Color Corporativo:** `#9AC31C` (Verde Lima VIP)  
> **Campaña:** Gran Premio Feria del Automóvil 2026  
> **Subdominio de Producción:** [https://autos.mvevip.com](https://autos.mvevip.com)

Plataforma interactiva de captación de leads de alto impacto diseñada para stands de ferias automotrices y eventos comerciales. Sincroniza en tiempo real la pantalla gigante del stand con los teléfonos inteligentes de los visitantes y asesores de venta.

---

## 🏗️ Arquitectura del Sistema

El proyecto opera bajo dos modalidades totalmente desacopladas:

### 1. Producción en AWS (100% Serverless bajo un solo subdominio)
```
                                     [ DNS GoDaddy: autos.mvevip.com ]
                                                    │
                                                    ▼
                             [ AWS CloudFront: autos.mvevip.com (SSL ACM *.mvevip.com) ]
                                ├── /*             ──> AWS S3: App Móvil Clientes (QR)
                                ├── /pantalla/*    ──> AWS S3: Pantalla Stand (Ruleta & Odómetro)
                                ├── /admin/*       ──> AWS S3: PWA Asesores (PIN VIP2026)
                                └── /api/*         ──> AWS API Gateway (HTTP API)
                                                             │
                                                             ▼
                                                    [ AWS Lambda (Node.js 20) ]
                                                             │
                                                             ▼
                                                  [ AWS MySQL RDS (us-west-2) ]
                                                     database-mvevip:3306
```

### 2. Desarrollo Local (Docker Compose)
* Red interna de Docker con 5 contenedores en el rango de puertos `5500 - 5504`.

---

## 🎯 Características y Ajustes Implementados

1. **Logotipo Oficial Corporativo:**
   * Integrado en la cabecera superior y como emblema central giratorio en el cubo del rin de aleación (`AlloyWheel`).
2. **Odómetro Automotriz Réplica:**
   * Instrumento circular estático de 0 a 200 km/h con marcas cónicas y display digital LCD.
   * **Aguja deportiva roja** y efecto de iluminación progresiva en verde neón corporativo (`#9AC31C`) que se activa en sincronía con el motor al presionar *ENGINE START*.
3. **PWA Móvil de Asesores / Admin:**
   * Diseñada para smartphones de asesores en el stand.
   * Acceso por clave alfanumérica (`VIP2026` o `vip2026`).
   * Teclado alfanumérico en móviles (sin teclado restringido numérico).
   * Gestión en vivo de probabilidades y pesos ponderados (0-1000), stock y límites diarios.
   * Buscador de leads en tiempo real con detección de multicuentas por dispositivo (`device_id`).
   * Canje de tickets en 1 toque.
4. **Validaciones Estrictas Ecuador:**
   * Número celular de 10 dígitos iniciando con `09` (ej: `0991234567`).
   * Validación RFC de correo electrónico.
   * Si un lead ya concursó, el sistema le muestra directamente su premio anterior sin volver a girar la ruleta.
5. **Funcionamiento Silencioso:**
   * Operación 100% táctil y visual, adaptada para ferias ruidosas.
6. **Resiliencia de Red Stand Dual:**
   * Combina WebSockets y polling ultra ligero automático (1s). Si la red Wi-Fi de la feria parpadea, la ruleta no se detiene ni pierde eventos.

---

## 🌐 Esquema de Rutas (`autos.mvevip.com`)

| Ruta | Componente | Descripción |
| :--- | :--- | :--- |
| **`https://autos.mvevip.com/`** | `frontend-mobile` | **PWA de Clientes:** Se abre al escanear el QR en el stand. Formulario y botón rojo *ENGINE START*. |
| **`https://autos.mvevip.com/pantalla`** | `frontend-screen` | **Pantalla Stand:** Ruleta de aleación, odómetro dinámico y QR para escanear. |
| **`https://autos.mvevip.com/admin`** | `frontend-admin` | **PWA Asesores:** Control de premios, leads y canjes (PIN `VIP2026`). |
| **`https://autos.mvevip.com/api/*`** | Backend Lambda | API REST (`/api/leads`, `/api/prizes`, `/api/spin`, `/api/stats`, `/health`). |

---

## 🗄️ Base de Datos MySQL (Script de Inicialización)

El script SQL completo se encuentra en [deploy/init_db.sql](file:///deploy/init_db.sql):

```sql
CREATE DATABASE IF NOT EXISTS marketingvip_roulette CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE marketingvip_roulette;

-- 1. Tabla de Premios (con pesos de probabilidad y stock)
CREATE TABLE IF NOT EXISTS prizes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    category ENUM('DESCUENTO', 'ALOJAMIENTO', 'VUELO', 'EXPERIENCIA', 'SOUVENIR') DEFAULT 'DESCUENTO',
    color_hex VARCHAR(20) NOT NULL DEFAULT '#9AC31C',
    text_color VARCHAR(20) NOT NULL DEFAULT '#FFFFFF',
    weight INT NOT NULL DEFAULT 100,
    stock INT NOT NULL DEFAULT 100,
    max_daily_wins INT NOT NULL DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Tabla de Leads (con huella de dispositivo e IP)
CREATE TABLE IF NOT EXISTS leads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    dream_destination VARCHAR(100) DEFAULT '🌴 Cancún',
    screen_id VARCHAR(50) DEFAULT 'STAND_01',
    device_id VARCHAR(64) NOT NULL DEFAULT 'unknown',
    ip_address VARCHAR(50) NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_phone (phone),
    INDEX idx_email (email),
    INDEX idx_device (device_id)
) ENGINE=InnoDB;

-- 3. Tabla de Giros de Ruleta (Historial & Tickets)
CREATE TABLE IF NOT EXISTS spins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lead_id INT NOT NULL,
    prize_id INT NOT NULL,
    ticket_code VARCHAR(50) UNIQUE NOT NULL,
    screen_id VARCHAR(50) DEFAULT 'STAND_01',
    redeemed BOOLEAN DEFAULT FALSE,
    redeemed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (prize_id) REFERENCES prizes(id) ON DELETE RESTRICT,
    INDEX idx_lead_id (lead_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB;
```

---

## ☁️ Despliegue en AWS

### Requisitos:
* AWS CLI configurado con el perfil `marketingvip` (`us-west-2`).
* Certificado SSL Wildcard `*.mvevip.com` en ACM `us-east-1`.

### Ejecutar Despliegue Automático:
```powershell
.\deploy\deploy_aws.ps1
```
El script:
1. Empaqueta la API y la sube a S3.
2. Despliega la infraestructura con CloudFormation (`MarketingVIP-Roulette-Stack`).
3. Compila los 3 frontends con sus rutas base relativas (`/pantalla/`, `/admin/`, `/`).
4. Sincroniza los archivos con S3 e invalida la caché de CloudFront.

### Registro en GoDaddy:
* **Tipo:** `CNAME`
* **Nombre:** `autos`
* **Valor:** `d16kuftm1n5423.cloudfront.net`
* **TTL:** `1/2 hora` (600 segundos)

---

## 🐳 Ejecución Local con Docker Compose

```bash
docker compose up -d --build
```

### Puertos Locales:
* **API REST & WebSockets:** [http://localhost:5500](http://localhost:5500)
* **Base de Datos MySQL:** Puerto `5501`
* **Pantalla Stand Ruleta:** [http://localhost:5502](http://localhost:5502)
* **App Celular Registro:** [http://localhost:5503](http://localhost:5503)
* **App Celular Asesores:** [http://localhost:5504](http://localhost:5504) *(PIN: `VIP2026`)*

---

## 🔒 Seguridad
* Las credenciales de producción y archivos `.env` están protegidos e ignorados por [.gitignore](file:///.gitignore).
* Se provee [.env.example](file:///.env.example) como plantilla para nuevas configuraciones.
