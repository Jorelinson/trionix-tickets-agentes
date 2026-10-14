import { Router } from "express";
import Agente from "../models/Agente.js";
import Ticket from "../models/Ticket.js";
import { serializarTicket, populateAgente } from "../utils/serializar.js";
import { Joi, validar, validarId, asyncHandler, HttpError } from "../middleware/validar.js";

const router = Router();

// ---------- Esquemas Joi ----------
const nombre = Joi.string().trim().min(3).max(100).label("El nombre");
const email = Joi.string()
  .trim()
  .lowercase()
  .email({ tlds: { allow: false } })
  .label("El correo");
const especialidad = Joi.string()
  .valid("redes", "software", "hardware", "general")
  .label("La especialidad");
const activo = Joi.boolean().label("El campo activo");

const crearSchema = Joi.object({
  nombre: nombre.required(),
  email: email.required(),
  especialidad: especialidad.required(),
  activo,
});

const actualizarSchema = Joi.object({ nombre, email, especialidad, activo }).min(1);

const filtrosSchema = Joi.object({
  especialidad: especialidad,
  activo: activo,
});

// ---------- Rutas ----------

// GET /api/agentes?especialidad=&activo=
router.get(
  "/",
  validar(filtrosSchema, "query"),
  asyncHandler(async (req, res) => {
    const filtro = {};
    const { especialidad, activo } = req.validatedQuery;
    if (especialidad) filtro.especialidad = especialidad;
    if (activo !== undefined) filtro.activo = activo;
    const agentes = await Agente.find(filtro).sort({ nombre: 1 });
    res.json(agentes);
  })
);

// Bonus 21 — GET /api/agentes/stats
// IMPORTANTE: va antes de "/:id" para que "stats" no se interprete como un id.
router.get(
  "/stats",
  asyncHandler(async (req, res) => {
    const stats = await Agente.aggregate([
      {
        $lookup: {
          from: Ticket.collection.name,
          localField: "_id",
          foreignField: "agenteId",
          as: "tickets",
        },
      },
      {
        $project: {
          nombre: 1,
          especialidad: 1,
          activo: 1,
          abiertos: {
            $size: {
              $filter: { input: "$tickets", as: "t", cond: { $eq: ["$$t.estado", "abierto"] } },
            },
          },
          resueltos: {
            $size: {
              $filter: { input: "$tickets", as: "t", cond: { $eq: ["$$t.estado", "resuelto"] } },
            },
          },
        },
      },
      { $sort: { nombre: 1 } },
    ]);
    res.json(stats);
  })
);

// GET /api/agentes/:id
router.get(
  "/:id",
  validarId(),
  asyncHandler(async (req, res) => {
    const agente = await Agente.findById(req.params.id);
    if (!agente) throw new HttpError(404, "Agente no encontrado");
    res.json(agente);
  })
);

// GET /api/agentes/:id/tickets
router.get(
  "/:id/tickets",
  validarId(),
  asyncHandler(async (req, res) => {
    const existe = await Agente.exists({ _id: req.params.id });
    if (!existe) throw new HttpError(404, "Agente no encontrado");
    const tickets = await Ticket.find({ agenteId: req.params.id })
      .sort({ createdAt: -1 })
      .populate(populateAgente);
    res.json(tickets.map(serializarTicket));
  })
);

// POST /api/agentes
// Un correo duplicado lanza un error 11000 del driver; el middleware de errores
// lo traduce a un 400 con mensaje legible.
router.post(
  "/",
  validar(crearSchema),
  asyncHandler(async (req, res) => {
    const agente = await Agente.create(req.body);
    res.status(201).json(agente);
  })
);

// PUT /api/agentes/:id
router.put(
  "/:id",
  validarId(),
  validar(actualizarSchema),
  asyncHandler(async (req, res) => {
    const agente = await Agente.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!agente) throw new HttpError(404, "Agente no encontrado");
    res.json(agente);
  })
);

// DELETE /api/agentes/:id — 409 si tiene tickets abiertos asignados
router.delete(
  "/:id",
  validarId(),
  asyncHandler(async (req, res) => {
    const agente = await Agente.findById(req.params.id);
    if (!agente) throw new HttpError(404, "Agente no encontrado");

    const abiertos = await Ticket.countDocuments({ agenteId: agente._id, estado: "abierto" });
    if (abiertos > 0) {
      throw new HttpError(
        409,
        `No se puede eliminar a ${agente.nombre}: tiene ${abiertos} ticket(s) abierto(s) asignado(s). Resuélvelos o reasígnalos primero.`
      );
    }

    await agente.deleteOne();
    res.status(204).end();
  })
);

export default router;
