# Trionix Tickets — Sistema de Soporte con Agentes

**Estudiante:** _[Escribe aquí tu nombre completo]_
**Curso:** Desarrollo Web Backend · Node.js — Parcial Segundo Corte (Docente: Rafael Pérez Meriño)

Aplicación completa para gestionar tickets de soporte técnico y los agentes que los atienden.
Incluye una API REST (Express + Joi + MongoDB/Mongoose) con dos colecciones relacionadas
(`tickets` y `agentes`), un endpoint de asignación y un frontend estático (HTML/CSS/JS) que
consume la API sin recargar la página.

## URL pública

**_[Pega aquí la URL del despliegue, p. ej. https://trionix-tickets.onrender.com]_**

## Correrlo localmente

Requisitos: Node.js 18+ y una base MongoDB (local o MongoDB Atlas).

```bash
git clone <URL-del-repositorio>
cd trionix-tickets-agentes
npm install
cp .env.example .env      # y completa MONGODB_URI
npm run seed              # (opcional) carga agentes y tickets de prueba
npm start                 # http://localhost:3000
```

> `npm run seed` **borra** las colecciones `tickets` y `agentes` antes de insertar los datos de prueba.

## Variables de entorno

| Variable      | Descripción                                                                 |
|---------------|-----------------------------------------------------------------------------|
| `MONGODB_URI` | Cadena de conexión de MongoDB (en producción, la de MongoDB Atlas).         |
| `PORT`        | Puerto del servidor (opcional; por defecto 3000; la plataforma suele fijarlo). |

El archivo `.env` no se sube al repositorio; `.env.example` sirve de plantilla.

## Estructura

```
├── public/            frontend estático (index.html, styles.css, app.js)
├── models/            Ticket.js y Agente.js (Mongoose)
├── routes/            tickets.js y agentes.js
├── middleware/        validación Joi / ids y manejo uniforme de errores
├── utils/             serialización de tickets (agente resuelto)
├── db.js              conexión a MongoDB (+ syncIndexes)
├── seed.js            datos de prueba
└── app.js             arranque de Express
```

## Endpoints

### Tickets
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/tickets` | Lista tickets. Filtros: `?estado=`, `?prioridad=`, `?q=` (bonus) |
| GET | `/api/tickets/:id` | Un ticket (400 id inválido, 404 no existe) |
| POST | `/api/tickets` | Crea ticket (siempre `abierto`) → 201 |
| PUT | `/api/tickets/:id` | Actualiza (Joi + `runValidators`) |
| DELETE | `/api/tickets/:id` | Elimina → 204 |
| POST | `/api/tickets/:id/comentarios` | Agrega comentario embebido → 201 |
| POST | `/api/tickets/:id/asignar` | Asigna agente `{ "agenteId": "..." }` → 200 |

### Agentes
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/agentes` | Lista agentes. Filtros: `?especialidad=`, `?activo=` |
| GET | `/api/agentes/stats` | Bonus: tickets abiertos/resueltos por agente (`$lookup`) |
| GET | `/api/agentes/:id` | Un agente |
| GET | `/api/agentes/:id/tickets` | Tickets asignados al agente |
| POST | `/api/agentes` | Crea agente (correo duplicado → 400 legible) |
| PUT | `/api/agentes/:id` | Actualiza agente |
| DELETE | `/api/agentes/:id` | Elimina; 409 si tiene tickets abiertos asignados |

Los tickets devuelven el agente asignado resuelto en el campo `agente` (`{ _id, nombre, especialidad }`
o `null`) usando `populate("agenteId", "nombre especialidad")`.

Todos los errores responden con el formato `{ "error": "mensaje legible" }`.

## Despliegue (Render + MongoDB Atlas)

1. En MongoDB Atlas: crear un cluster gratuito, un usuario de base de datos y, en *Network Access*,
   permitir acceso desde `0.0.0.0/0`. Copiar la cadena de conexión.
2. Subir el repositorio a GitHub (sin `node_modules/` ni `.env`).
3. En Render: *New → Web Service* desde el repositorio. Build command: `npm install`. Start command: `npm start`.
4. En *Environment* agregar `MONGODB_URI` con la cadena de Atlas.
5. Al arrancar, `db.js` ejecuta `syncIndexes()`, por lo que el índice `unique` de `agentes.email`
   y el índice compuesto de `tickets` quedan creados en la base de producción.

## Bonus implementados

- **Punto 21:** `GET /api/agentes/stats` con agregación `$lookup` entre `agentes` y `tickets`.
- **Punto 22:** `GET /api/tickets?q=texto` con búsqueda `$regex` (insensible a mayúsculas) sobre `asunto` y `cliente`.
- **Punto 23:** índice compuesto `{ agenteId: 1, estado: 1 }` en `tickets`. Sirve para las consultas que filtran
  por agente: listar los tickets de un agente, contar sus tickets abiertos antes de eliminarlo (409) y el `$lookup`
  de las estadísticas. Se indexa lo que se filtra con frecuencia.
