import { Router } from "express";
import Ticket from "../models/Ticket.js";
import Agente from "../models/Agente.js";
import { serializarTicket, populateAgente } from "../utils/serializar.js";
import {
  Joi,
  validar,
  validarId,
  asyncHandler,
  HttpError,
  OBJECT_ID_REGEX,
} from "../middleware/validar.js";

const router = Router();

// ---------- Esquemas Joi ----------
const cliente = Joi.string().trim().min(2).max(100).label("El cliente");
const asunto = Joi.string().trim().min(5).max(200).label("El asunto");
const prioridad = Joi.string().valid("baja", "media", "alta").label("La prioridad");

// El campo `estado` no se acepta al crear: se descarta (stripUnknown) y el
// ticket siempre nace "abierto" por el default del esquema.
const crearSchema = Joi.object({
  cliente: cliente.required(),
  asunto: asunto.required(),
  prioridad: prioridad.required(),
});

const actualizarSchema = Joi.object({
  cliente,
  asunto,
  prioridad,
  estado: Joi.string().valid("abierto", "resuelto").label("El estado"),
}).min(1);

const comentarioSchema = Joi.object({
  autor: Joi.string().trim().min(2).required().label("El autor"),
  texto: Joi.string().trim().min(3).required().label("El texto"),
});

const asignarSchema = Joi.object({
  agenteId: Joi.string()
    .pattern(OBJECT_ID_REGEX)
    .required()
    .label("El agenteId")
    .messages({ "string.pattern.base": "El agenteId no tiene un formato de ObjectId válido" }),
});

const filtrosSchema = Joi.object({
  estado: Joi.string().valid("abierto", "resuelto").label("El filtro estado"),
  prioridad: Joi.string().valid("baja", "media", "alta").label("El filtro prioridad"),
  q: Joi.string().trim().max(100).label("La búsqueda"),
});

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ---------- Rutas ----------

// GET /api/tickets?estado=&prioridad=&q=
router.get(
  "/",
  validar(filtrosSchema, "query"),
  asyncHandler(async (req, res) => {
    const { estado, prioridad, q } = req.validatedQuery;
    const filtro = {};
    if (estado) filtro.estado = estado;
    if (prioridad) filtro.prioridad = prioridad;
    if (q) {
      const rx = new RegExp(escapeRegex(q), "i"); // Bonus 22
      filtro.$or = [{ asunto: rx }, { cliente: rx }];
    }
    const tickets = await Ticket.find(filtro).sort({ createdAt: -1 }).populate(populateAgente);
    res.json(tickets.map(serializarTicket));
  })
);

// GET /api/tickets/:id
router.get(
  "/:id",
  validarId(),
  asyncHandler(async (req, res) => {
    const ticket = await Ticket.findById(req.params.id).populate(populateAgente);
    if (!ticket) throw new HttpError(404, "Ticket no encontrado");
    res.json(serializarTicket(ticket));
  })
);

// POST /api/tickets
router.post(
  "/",
  validar(crearSchema),
  asyncHandler(async (req, res) => {
    const creado = await Ticket.create(req.body);
    const ticket = await Ticket.findById(creado._id).populate(populateAgente);
    res.status(201).json(serializarTicket(ticket));
  })
);

// PUT /api/tickets/:id
router.put(
  "/:id",
  validarId(),
  validar(actualizarSchema),
  asyncHandler(async (req, res) => {
    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).populate(populateAgente);
    if (!ticket) throw new HttpError(404, "Ticket no encontrado");
    res.json(serializarTicket(ticket));
  })
);

// DELETE /api/tickets/:id
router.delete(
  "/:id",
  validarId(),
  asyncHandler(async (req, res) => {
    const ticket = await Ticket.findByIdAndDelete(req.params.id);
    if (!ticket) throw new HttpError(404, "Ticket no encontrado");
    res.status(204).end();
  })
);

// POST /api/tickets/:id/comentarios
router.post(
  "/:id/comentarios",
  validarId(),
  validar(comentarioSchema),
  asyncHandler(async (req, res) => {
    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      { $push: { comentarios: req.body } },
      { new: true, runValidators: true }
    ).populate(populateAgente);
    if (!ticket) throw new HttpError(404, "Ticket no encontrado");
    res.status(201).json(serializarTicket(ticket));
  })
);

// POST /api/tickets/:id/asignar   body: { "agenteId": "<id>" }
router.post(
  "/:id/asignar",
  validarId(),
  validar(asignarSchema),
  asyncHandler(async (req, res) => {
    const { agenteId } = req.body;

    const ticketExiste = await Ticket.exists({ _id: req.params.id });
    if (!ticketExiste) throw new HttpError(404, "Ticket no encontrado");

    const agente = await Agente.findById(agenteId);
    if (!agente) throw new HttpError(404, "Agente no encontrado");
    if (!agente.activo) {
      throw new HttpError(400, `El agente ${agente.nombre} está inactivo y no puede recibir tickets`);
    }

    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      { $set: { agenteId: agente._id } },
      { new: true, runValidators: true }
    ).populate(populateAgente);
    if (!ticket) throw new HttpError(404, "Ticket no encontrado"); // eliminado entre las dos consultas

    res.status(200).json(serializarTicket(ticket));
  })
);

export default router;
