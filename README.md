# Sistema de Notas de Remisión - Ganadería Catorce

Sistema web estático para generar notas de remisión con numeración automática, generación de PDF y envío por correo electrónico.

## Características

- ✅ Generación de remisiones con numeración automática secuencial
- 📄 Generación de PDF descargable
- 📧 Envío de remisiones por correo electrónico
- 💾 Historial completo de remisiones
- 🔄 Sincronización automática con GitHub
- 🎨 Interfaz moderna y responsive

## Estructura del Proyecto

```
notas_gc/
├── index.html              # Página principal
├── style.css               # Estilos
├── script.js               # Lógica de la aplicación
├── assets/
│   └── logo.png           # Logo de Ganadería Catorce
├── data/
│   ├── secuencia.json     # Número de última remisión
│   └── historial.json     # Historial de remisiones
└── .github/
    └── workflows/
        └── update-remision.yml  # Workflow de validación
```

## Configuración Inicial

### 1. GitHub Token

Para que la aplicación pueda leer y actualizar archivos en GitHub, necesitas un Personal Access Token:

1. Ve a GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Genera un nuevo token con permisos de `repo`
3. Copia el token

En la consola del navegador, ejecuta:
```javascript
setGitHubToken('TU_TOKEN_AQUI');
```

### 2. EmailJS (Opcional)

Para enviar remisiones por correo:

1. Crea una cuenta en [EmailJS](https://www.emailjs.com/)
2. Crea un servicio de email
3. Crea un template con los siguientes parámetros:
   - `remision`: Número de remisión
   - `cliente`: Nombre del cliente
   - `fecha`: Fecha
   - `total`: Total de la remisión
   - `pdf_attachment`: PDF en base64

En la consola del navegador, ejecuta:
```javascript
setEmailJSConfig('SERVICE_ID', 'TEMPLATE_ID', 'PUBLIC_KEY');
```

### 3. GitHub Pages

1. Ve a Settings → Pages en tu repositorio
2. Selecciona la rama `main` como source
3. Guarda los cambios
4. Tu sitio estará disponible en: `https://dorianguzman.github.io/notas_gc/`

## Uso

### Generar una Remisión

1. La fecha y número de remisión se establecen automáticamente
2. Ingresa el nombre del cliente y ciudad
3. Agrega líneas de conceptos:
   - Cantidad
   - Descripción del concepto
   - Precio unitario
   - El importe se calcula automáticamente
4. Ajusta el IVA si es necesario
5. Usa los botones de acción:
   - **Generar PDF**: Descarga el PDF de la remisión
   - **Enviar por Correo**: Envía la remisión por email
   - **Guardar Remisión**: Guarda en el historial y actualiza la secuencia

### Gestión de Conceptos

- **Agregar línea**: Click en "+ Agregar línea"
- **Eliminar línea**: Click en el botón "✕" (debe haber al menos una línea)
- Los cálculos se actualizan automáticamente

## Workflow de GitHub Actions

El workflow se ejecuta automáticamente cuando se modifican los archivos de datos:
- Valida que los archivos JSON sean correctos
- No genera backups ni CSV
- Solo valida, no modifica datos

## Archivos de Datos

### secuencia.json
```json
{
  "ultima": "00000001"
}
```

### historial.json
```json
[
  {
    "fecha": "2025-03-10",
    "remision": "00000001",
    "cliente": "Cliente Ejemplo",
    "ciudad": "Querétaro",
    "conceptos": [
      {
        "cantidad": 2,
        "descripcion": "Producto X",
        "pu": 100,
        "importe": 200
      }
    ],
    "subtotal": 200,
    "iva": 32,
    "total": 232
  }
]
```

## Tecnologías Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript
- **PDF**: jsPDF
- **Email**: EmailJS
- **Almacenamiento**: GitHub API
- **CI/CD**: GitHub Actions
- **Hosting**: GitHub Pages

## Contribuir

Este es un proyecto privado de Ganadería Catorce.

## Licencia

Todos los derechos reservados - Ganadería Catorce
