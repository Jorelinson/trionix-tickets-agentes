import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "./db.js";
import Agente from "./models/Agente.js";
import Ticket from "./models/Ticket.js";

await connectDB();

// ATENCIÓN: borra y vuelve a crear los datos de prueba.
await Ticket.deleteMany({});
await Agente.deleteMany({});

const agentes = await Agente.insertMany([
  { nombre: "Laura Gómez", email: "laura.gomez@trionix.com", especialidad: "redes" },
  { nombre: "Carlos Pérez", email: "carlos.perez@trionix.com", especialidad: "software" },
  { nombre: "Marta Rojas", email: "marta.rojas@trionix.com", especialidad: "hardware" },
  { nombre: "Andrés Silva", email: "andres.silva@trionix.com", especialidad: "general", activo: false },
]);
const [laura, carlos, marta] = agentes;

await Ticket.insertMany([
  {
    cliente: "Panadería El Trigal",
    asunto: "No hay conexión a internet en caja",
    prioridad: "alta",
    agenteId: laura._id,
    comentarios: [{ autor: "Laura Gómez", texto: "Revisando el router principal" }],
  },
  {
    cliente: "Colegio San José",
    asunto: "El sistema de notas no carga",
    prioridad: "media",
    agenteId: carlos._id,
  },
  {
    cliente: "Clínica Dental Sonríe",
    asunto: "Impresora de recepción no imprime",
    prioridad: "baja",
    estado: "resuelto",
    agenteId: marta._id,
    comentarios: [{ autor: "Marta Rojas", texto: "Se reemplazó el cartucho de tóner" }],
  },
  {
    cliente: "Ferretería La Esquina",
    asunto: "Correo corporativo rebota mensajes",
    prioridad: "media",
  },
]);

console.log("Seed completado: 4 agentes y 4 tickets");
await mongoose.disconnect();
