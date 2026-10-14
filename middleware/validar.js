import Joi from "joi";

export const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Mensajes de Joi en español
const mensajes = {
  "any.required": "{{#label}} es un campo obligatorio",
  "any.only": "{{#label}} debe ser uno de: {{#valids}}",
  "string.base": "{{#label}} debe ser texto",
  "string.empty": "{{#label}} no puede estar vacío",
  "string.min": "{{#label}} debe tener al menos {{#limit}} caracteres",
  "string.max": "{{#label}} no puede superar {{#limit}} caracteres",
  "string.email": "{{#label}} debe ser un correo válido",
  "string.pattern.base": "{{#label}} no tiene un formato válido",
  "boolean.base": "{{#label}} debe ser verdadero o falso",
  "object.min": "Debes enviar al menos un campo para actualizar",
  "object.base": "El cuerpo de la petición debe ser un objeto JSON",
};

const opciones = { abortEarly: false, stripUnknown: true, convert: true, messages: mensajes };

// Valida req[origen] con un esquema Joi. Si es válido, reemplaza el contenido
// por el valor ya limpio (trim, lowercase, sin campos desconocidos).
export function validar(schema, origen = "body") {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[origen] ?? {}, opciones);
    if (error) {
      const detalles = error.details.map((d) => d.message.replace(/"/g, ""));
      return res.status(400).json({ error: detalles.join("; "), detalles });
    }
    if (origen === "query") {
      // En Express 5 req.query es de solo lectura: guardamos el valor validado aparte.
      req.validatedQuery = value;
    } else {
      req[origen] = value;
    }
    next();
  };
}

// Comprueba que el parámetro de ruta tenga formato de ObjectId (400 si no).
export function validarId(nombre = "id") {
  return (req, res, next) => {
    if (!OBJECT_ID_REGEX.test(req.params[nombre])) {
      return res.status(400).json({ error: `El ${nombre} no tiene un formato de ObjectId válido` });
    }
    next();
  };
}

// Permite usar funciones async en las rutas sin try/catch repetidos.
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export { Joi };
