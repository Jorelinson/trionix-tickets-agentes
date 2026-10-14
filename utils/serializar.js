// Convierte un ticket (con agenteId ya "populado") en la respuesta JSON de la API:
// el agente asignado aparece resuelto en el campo `agente` (o null si no hay).
export function serializarTicket(doc) {
  const t = typeof doc.toObject === "function" ? doc.toObject() : doc;
  const { agenteId, __v, ...resto } = t;

  const agente =
    agenteId && agenteId.nombre
      ? { _id: agenteId._id, nombre: agenteId.nombre, especialidad: agenteId.especialidad }
      : null;

  return { ...resto, agenteId: agente ? agente._id : null, agente };
}

export const populateAgente = { path: "agenteId", select: "nombre especialidad" };
