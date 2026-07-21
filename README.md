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

#### 4. Contador de Gasto de OpenAI (`services/spendTracker.ts` + Supabase)
La app registra el coste de cada llamada a `gpt-image-1` en un proyecto Supabase dedicado (**"sofas"**), acumulando un **total global compartido** entre todos los usuarios y dispositivos.
- **Cálculo de coste:** exacto a partir del objeto `usage` que devuelve la API (texto $5, imagen entrada $10, imagen salida $40 / 1M tokens). Si no viene `usage`, se estima por imagen según tamaño (calidad `high`).
- **Backend:** tabla `openai_spend_events` con RLS bloqueado; el frontend solo puede llamar a las RPC `record_openai_spend()` y `get_openai_spend_total()` (SECURITY DEFINER).
- **UI:** badge flotante (`components/SpendCounter.tsx`) **visible solo para el usuario `digency`**. Se actualiza al generar y mediante sondeo cada 15s para reflejar el gasto de otros usuarios.

---

## 🏃 Ejecución Local

1. **Instalar dependencias:**
   ```bash
   npm install
   ```
2. **Configurar Variables de Entorno:**
   Copia `.env.example` a `.env` y rellena las claves (OpenAI + Supabase). El `.env` ya incluye la config del proyecto Supabase "sofas":
   ```env
   VITE_OPENAI_API_KEY=sk-...
   VITE_SUPABASE_URL=https://akfcdbttatlpzakmukoe.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_...
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
