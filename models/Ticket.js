import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema(
  {
    cliente: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    asunto: { type: String, required: true, trim: true, minlength: 5, maxlength: 200 },
    prioridad: { type: String, enum: ["baja", "media", "alta"], required: true },
    estado: { type: String, enum: ["abierto", "resuelto"], default: "abierto" },
    comentarios: [
      {
        autor: String,
        texto: String,
        fecha: { type: Date, default: Date.now },
      },
    ],
    agenteId: { type: mongoose.Schema.Types.ObjectId, ref: "Agente", default: null },
  },
  { timestamps: true }
);

// Bonus 23: índice compuesto. Sirve para las consultas que filtran por agente
// (GET /api/agentes/:id/tickets), para contar tickets abiertos de un agente
// (DELETE /api/agentes/:id) y para el $lookup de /api/agentes/stats.
ticketSchema.index({ agenteId: 1, estado: 1 });

export default mongoose.model("Ticket", ticketSchema);
