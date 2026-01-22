# 🛋️ OkSofás AI Visualizer

El **Visualizador Virtual de OkSofás** es una aplicación premium basada en IA diseñada para permitir a los clientes ver cómo quedarían los sofás del catálogo en sus propios hogares, o visualizar cambios de tapizado en tiempo real.

---

## 🚀 Guía Rápida para Desarrolladores & Agentes IA

Este proyecto ha sido optimizado para la **fidelidad del producto** y el **despliegue en Hostinger**.

### 🛠️ Stack Tecnológico
- **Frontend:** React + Vite + TypeScript.
- **Estilos:** Tailwind CSS (Diseño Premium Dark/Modern).
- **IA:** Google Gemini (`gemini-2.5-flash-image`).
- **Despliegue:** Hostinger (Carpeta `dist/`).

### 🧬 Lógica Crítica (Contexto para Agentes)

#### 1. Advanced Fidelity Engine (`services/geminiService.ts`)
Para evitar que la IA "alucine" o invente formas, el sistema utiliza **Anclaje Geométrico**. Cualquier modificación en los prompts debe mantener estas reglas:
- **Protección de Anatomía:** No se puede alterar el número de asientos, brazos o forma de las patas.
- **REGLA DE ORO:** El mueble es el protagonista real, el entorno es el que se genera alrededor.

#### 2. Branding Digency & OkSofás
El branding está integrado de forma robusta:
- **Assets:** Se utilizan URLs públicas (p. ej., logos de OkSofás y Digency) para evitar problemas de assets perdidos durante despliegues Git.
- **Crédito:** El pie de página y el login deben mantener siempre la firma: *"Desarrollado con 🤍 por Digency"*.

#### 3. Configuración de Despliegue
Para Hostinger, es vital usar el archivo `.htaccess` proporcionado en los flujos de trabajo (`.agent/workflows/deploy-hostinger.md`) para manejar el routing de SPA y evitar errores 404 al recargar.

---

## 🏃 Ejecución Local

1. **Instalar dependencias:**
   ```bash
   npm install
   ```
2. **Configurar Variable de Entorno:**
   Crea o edita `.env.local` con:
   ```env
   API_KEY=tu_clave_de_gemini
   ```
3. **Iniciar Servidor Dev:**
   ```bash
   npm run dev
   ```

---

## 🚢 Despliegue
Consulta el workflow específico en:
`[.agent/workflows/deploy-hostinger.md](.agent/workflows/deploy-hostinger.md)`

---
*Desarrollado con ❤️ para OkSofás por Alejandro y el equipo de Digency.*
