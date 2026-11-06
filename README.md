# Control de Rifa — Vanilla JavaScript SPA

Aplicación web estática de página única (SPA) para gestión de rifas, implementada con HTML5, CSS3 y JavaScript ES6+ sin frameworks ni dependencias externas.

## Arquitectura

### Stack Tecnológico
- **Frontend**: HTML5 semántico, CSS3 con variables CSS y Grid/Flexbox
- **JavaScript**: ES6+ (ES2015+) con modo estricto
- **Almacenamiento**: `localStorage` del navegador (Web Storage API)
- **Despliegue**: Sitio estático en Vercel (sin backend)

### Patrón de Diseño
Arquitectura basada en componentes funcionales con renderizado imperativo:
- **State Management**: Objeto global `data` que contiene el estado completo de la aplicación
- **Reactividad**: Función `render()` que reconstruye la UI basada en el estado actual
- **Persistencia**: Funciones `load()` y `save()` para sincronizar con localStorage
- **Validación**: Esquema de validación `valid()` para integridad de datos

## Estructura de Datos

### Schema Principal
```javascript
{
  version: 1,
  price: Number,           // Precio por número en colones
  numbers: [
    {
      number: String,      // "00" a "99"
      buyer: String,       // Nombre del comprador (max 100 chars)
      paid: Number,        // Monto abonado (>= 0, <= price)
      movements: [
        {
          id: String,      // UUID o timestamp único
          date: String,    // ISO 8601 timestamp
          amount: Number   // Monto del abono (> 0)
        }
      ]
    }
  ]
}
```

### Clave de Almacenamiento
- **Key**: `control_rifa_vanilla_v1`
- **Formato**: JSON stringificado
- **Tamaño**: ~10-20KB dependiendo de los datos

## API Interna

### Funciones Core

#### Gestión de Estado
- `load()`: Carga datos desde localStorage con validación de esquema
- `save()`: Persiste estado actual en localStorage
- `update()`: Guarda y re-renderiza la aplicación
- `render()`: Reconstruye la interfaz basada en el estado

#### Validación
- `valid(data)`: Valida integridad del schema de datos
  - Verifica versión, tipo de datos, rangos numéricos
  - Valida que los pagos coincidan con movimientos
  - Asegura consistencia entre arrays y estructuras

#### Utilidades
- `$(id)`: Shortcut para `document.getElementById()`
- `blank()`: Genera estado inicial limpio
- `money(n)`: Formatea números a colones (₡2 000)
- `parseMoney(s)`: Parsea strings con símbolo ₡ a números
- `key(s)`: Normaliza strings para comparación (case-insensitive, trim)
- `el(tag, content, className)`: Factory para elementos DOM
- `download(blob, name)`: Utilidad para descarga de archivos

#### Lógica de Negocio
- `status(x)`: Determina estado de un número (libre/pendiente/pagado)
- `groups()`: Agrupa números por comprador (normalizando nombres)
- `movementsFor(g)`: Obtiene historial de movimientos de un grupo
- `release(num)`: Libera un número (solo si no tiene pagos)

### Event Listeners
- `assignForm`: Asigna números a compradores
- `paymentForm`: Registra abonos a compradores
- `priceInput`: Edición del precio del número
- `resetBtn`: Restablecimiento completo con limpieza de localStorage
- `copyBtn`: Copia números disponibles al clipboard
- Navegación de tabs (numeros/pagos)
- Filtros y búsqueda

## Funcionalidades

### Gestión de Números
- Grid interactivo de 100 números (00-99)
- Selección múltiple para asignación
- Estados visuales: libre (gris), pendiente (amarillo), pagado (verde)
- Búsqueda por número o nombre de comprador
- Filtros por estado

### Sistema de Pagos
- Agrupación automática por comprador (normalización de nombres)
- Distribución automática de abonos entre números pendientes
- Historial detallado de movimientos por persona
- Validación de pagos (no pueden exceder el saldo pendiente)
- Liberación de números sin pagos

### Precio Dinámico
- Campo editable para precio del número
- Formato automático en colones (₡)
- Validación de valores positivos
- Confirmación antes de cambios

### Restablecimiento
- Botón de reset con doble confirmación
- Limpieza de todas las claves relacionadas con "rifa" en localStorage
- Restauración a estado inicial (100 números libres)
- Limpieza de estado de la UI

## Despliegue

### Vercel
1. Subir a repositorio GitHub
2. Conectar a Vercel
3. Framework Preset: **Other**
4. Build Command: (vacío)
5. Output Directory: (vacío - raíz del proyecto)

### Local
Simplemente abrir `index.html` en un navegador moderno (Chrome, Firefox, Safari, Edge).

## Limitaciones

- **Persistencia**: Solo en el navegador del usuario (localStorage)
- **Sincronización**: No sincroniza entre dispositivos o navegadores
- **Backup**: Sin exportación/importación de datos (eliminado en v2)
- **Escalabilidad**: Diseñado para 100 números fijos

## Archivos

- `index.html`: Estructura HTML semántica con accesibilidad (ARIA)
- `styles.css`: Estilos con CSS Grid, Flexbox, media queries responsive
- `app.js`: Lógica de aplicación (~500 líneas)
- `vercel.json`: Configuración de despliegue estático

## Compatibilidad

- Navegadores modernos con soporte ES6+
- Chrome 51+, Firefox 54+, Safari 10+, Edge 15+
- Responsive: desktop (850px+), tablet (520-850px), mobile (<520px)

## Seguridad

- Sin XSS (no hay inyección de HTML de usuario)
- Validación de entrada en todos los formularios
- Sanitización de nombres de compradores
- Confirmación para acciones destructivas
