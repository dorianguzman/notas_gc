# Notas de Remisión - Ganadería Catorce

Aplicación web simple para generar notas de remisión en formato PDF optimizada para uso móvil.

## Características

- 📱 **Optimizado para móvil** - Diseño touch-first
- 📄 **Generación de PDF** - Crea PDFs profesionales con logo
- ✉️ **Envío por email** - Envía notas directamente por correo (opcional)
- 🔢 **Numeración automática** - Timestamp en formato YYYYMMDD-HHMM
- 💾 **Sin base de datos** - Todo funciona en el navegador
- 🎨 **Diseño limpio** - Interfaz minimalista gris/negro/blanco
- 🇲🇽 **Zona horaria México** - Fechas en America/Mexico_City
- 💵 **Formato de moneda** - Separador de miles con comas

## Estructura del Proyecto

```
notas_gc/
├── index.html          # Aplicación principal
├── script.js           # Lógica de la aplicación
├── style.css           # Estilos
├── assets/
│   └── logo.png        # Logo de Ganadería Catorce
└── README.md           # Este archivo
```

## 🚀 Instalación

### GitHub Pages (Recomendado)

1. Fork o clona este repositorio
2. Ve a Settings → Pages en tu repositorio
3. Selecciona branch `main` → carpeta `/` (root)
4. Guarda y espera el deployment
5. Tu app estará en `https://tu-usuario.github.io/notas_gc`

### Local

```bash
# Clonar repositorio
git clone https://github.com/dorianguzman/notas_gc.git
cd notas_gc

# Abrir en navegador
open index.html
```

## ⚙️ Configuración de Email (Opcional)

Para habilitar el envío de correos:

1. Crea una cuenta en [EmailJS](https://www.emailjs.com/)
2. Crea un servicio de email
3. Crea una plantilla de email con estos parámetros:
   - `remision`: Número de remisión
   - `cliente`: Nombre del cliente
   - `fecha`: Fecha
   - `total`: Total
   - `pdf_attachment`: PDF en base64
4. Edita `script.js` (líneas 3-7) y actualiza:

```javascript
const CONFIG = {
    emailjs: {
        serviceId: 'tu_service_id',
        templateId: 'tu_template_id',
        publicKey: 'tu_public_key'
    }
};
```

## 💡 Uso

1. **Abrir la aplicación** en tu navegador móvil o desktop
2. **Llenar el formulario:**
   - Fecha (auto-completa con fecha actual de México)
   - Remisión (timestamp automático YYYYMMDD-HHMM)
   - Cliente y Ciudad
   - Agregar conceptos con "+ Agregar línea":
     - Cantidad
     - Descripción
     - Precio Unitario
   - IVA (default 16%, editable)
3. **Generar PDF** - Descarga la remisión como PDF
4. **Enviar por Email** - Envía la nota por correo (requiere configuración)

### Gestión de Conceptos

- **Agregar línea**: Click en "+ Agregar línea"
- **Eliminar línea**: Click en "✕" (mínimo 1 línea requerida)
- **Cálculos automáticos**: Importes, subtotal, IVA y total se actualizan en tiempo real

## 🛠️ Tecnología

- **100% Client-Side** - Sin backend, sin base de datos
- **HTML5, CSS3, Vanilla JavaScript** - Sin frameworks pesados
- **jsPDF** - Generación de PDFs en el navegador
- **EmailJS** - Envío de correos (opcional)
- **GitHub Pages** - Hosting estático gratuito

## 📱 Optimización Móvil

Diseñado específicamente para uso en teléfonos:
- Botones grandes y fáciles de tocar
- Font-size 16px+ en inputs (previene zoom en iOS)
- Tabla optimizada sin scroll horizontal
- Toast notifications para feedback
- Touch targets adecuados (44px+)
- Diseño responsivo adaptativo

## 🎯 Funcionalidades

### Generación de PDF
- Logo personalizado de la empresa
- Información completa de remisión
- Tabla de conceptos profesional
- Cálculos automáticos de subtotal, IVA y total
- Formato de moneda con separadores de miles

### Numeración Automática
- Basada en timestamp (formato: YYYYMMDD-HHMM)
- Se genera automáticamente con fecha/hora actual de México
- Se actualiza después de generar PDF o enviar email
- Única por minuto, sin necesidad de tracking

### Cálculos en Tiempo Real
- Actualización instantánea de importes
- IVA configurable (default 16%)
- Formato de moneda con separador de miles (1,234.56)
- Precisión de 2 decimales

## 📝 Notas

- **No requiere conexión** después de cargar (excepto para enviar emails)
- **No guarda historial** - Solo genera PDFs y envía emails
- **Numeración automática** - Basada en timestamp, sin necesidad de tracking

## 🔒 Privacidad

- Todo el procesamiento es local en el navegador
- No se envían datos a servidores externos (excepto EmailJS si configuras)
- No hay tracking ni analytics
- Los PDFs se generan completamente en el cliente
- Sin cookies, sin rastreo

## 🤝 Contribuciones

Proyecto privado - Ganadería Catorce

## 📄 Licencia

Uso privado - Ganadería Catorce

---

**Desarrollado con ❤️ para Ganadería Catorce**
