import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { connectDB } from "./db.js";
import ticketsRouter from "./routes/tickets.js";
import agentesRouter from "./routes/agentes.js";
import { noEncontrada, manejarErrores } from "./middleware/errores.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api/tickets", ticketsRouter);
app.use("/api/agentes", agentesRouter);
app.use("/api", noEncontrada);
app.use(manejarErrores);

async function start() {
  try {
    // Primero la base de datos, después el servidor.
    await connectDB();
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Servidor escuchando en el puerto ${PORT}`));
  } catch (err) {
    console.error("No se pudo iniciar la aplicación:", err.message);
    process.exit(1);
  }
}

start();
