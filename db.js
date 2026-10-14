import mongoose from "mongoose";
import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "Falta la variable de entorno MONGODB_URI (revisa tu archivo .env o el panel de la plataforma)."
    );
  }

  await mongoose.connect(uri);
  console.log(`MongoDB conectado: ${mongoose.connection.name}`);

  // Garantiza que los índices declarados en los esquemas (incluido el unique
  // de email en agentes) existan también en la base de producción.
  await mongoose.syncIndexes();
  console.log("Índices sincronizados");
}
