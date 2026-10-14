import { HttpError } from "./validar.js";

// Respuesta de error uniforme: { error: "mensaje legible" }

export function noEncontrada(req, res) {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
}

export function manejarErrores(err, req, res, next) {
  // Errores lanzados a propósito con un status (HttpError)
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }

  // Violación de índice único de MongoDB (p. ej. correo duplicado)
  if (err.code === 11000) {
    const campo = Object.keys(err.keyValue || err.keyPattern || {})[0] || "campo";
    const valor = err.keyValue ? err.keyValue[campo] : undefined;
    const mensaje =
      campo === "email"
        ? `Ya existe un agente registrado con el correo ${valor}`
        : `Ya existe un registro con ese valor de ${campo}${valor ? `: ${valor}` : ""}`;
    return res.status(400).json({ error: mensaje });
  }

  // Validaciones del esquema de Mongoose (runValidators)
  if (err.name === "ValidationError") {
    const detalles = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ error: detalles.join("; "), detalles });
  }

  // _id con formato inválido que se coló hasta Mongoose
  if (err.name === "CastError") {
    return res.status(400).json({ error: `Valor inválido para ${err.path}` });
  }

  // JSON mal formado en el body
  if (err.type === "entity.parse.failed" || err instanceof SyntaxError) {
    return res.status(400).json({ error: "El cuerpo de la petición no es un JSON válido" });
  }

  console.error(err);
  res.status(500).json({ error: "Error interno del servidor" });
}
