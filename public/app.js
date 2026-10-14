// Frontend de Trionix Tickets: consume la API con fetch, sin recargar la página.
const API = "/api";

const estado = { tickets: [], agentes: [], stats: {} };

// ---------- Utilidades ----------

// Crea elementos del DOM sin usar innerHTML (evita inyección de HTML).
function el(tag, props = {}, ...hijos) {
  const nodo = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") nodo.className = v;
    else if (k === "onclick" || k === "onsubmit") nodo[k] = v;
    else if (v !== undefined && v !== null && v !== false) nodo.setAttribute(k, v === true ? "" : v);
  }
  for (const h of hijos.flat()) {
    if (h === null || h === undefined || h === false) continue;
    nodo.append(h.nodeType ? h : document.createTextNode(h));
  }
  return nodo;
}

function mostrarMensaje(texto, tipo = "error") {
  const cont = document.getElementById("mensajes");
  const m = el("div", { class: `mensaje ${tipo}`, onclick: () => m.remove() }, texto);
  cont.append(m);
  setTimeout(() => m.remove(), tipo === "error" ? 7000 : 3500);
}

// Llama a la API y lanza un Error con el mensaje legible del servidor si falla.
async function api(ruta, { method = "GET", body } = {}) {
  const opciones = { method, headers: {} };
  if (body !== undefined) {
    opciones.headers["Content-Type"] = "application/json";
    opciones.body = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(API + ruta, opciones);
  } catch {
    throw new Error("No se pudo conectar con el servidor");
  }
  if (res.status === 204) return null;
  let datos = null;
  try { datos = await res.json(); } catch { /* sin cuerpo JSON */ }
  if (!res.ok) throw new Error(datos?.error || `Error ${res.status}`);
  return datos;
}

// Ejecuta una acción, muestra errores de forma legible y refresca la vista.
async function ejecutar(accion, mensajeExito) {
  try {
    await accion();
    if (mensajeExito) mostrarMensaje(mensajeExito, "exito");
    await cargarTodo();
    return true;
  } catch (err) {
    mostrarMensaje(err.message);
    return false;
  }
}

const formatearFecha = (iso) =>
  new Date(iso).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });

// ---------- Carga de datos ----------

async function cargarTodo() {
  const filtroEstado = document.getElementById("filtro-estado").value;
  const filtroPrioridad = document.getElementById("filtro-prioridad").value;
  const params = new URLSearchParams();
  if (filtroEstado) params.set("estado", filtroEstado);
  if (filtroPrioridad) params.set("prioridad", filtroPrioridad);
  const qs = params.toString() ? `?${params}` : "";

  try {
    const [tickets, agentes, stats] = await Promise.all([
      api(`/tickets${qs}`),
      api("/agentes"),
      api("/agentes/stats").catch(() => []),
    ]);
    estado.tickets = tickets;
    estado.agentes = agentes;
    estado.stats = Object.fromEntries(stats.map((s) => [s._id, s]));
    renderTickets();
    renderAgentes();
  } catch (err) {
    mostrarMensaje(err.message);
  }
}

// ---------- Render: tickets ----------

function renderTickets() {
  const cont = document.getElementById("lista-tickets");
  cont.replaceChildren();
  if (estado.tickets.length === 0) {
    cont.append(el("p", { class: "vacio" }, "No hay tickets para mostrar."));
    return;
  }
  estado.tickets.forEach((t) => cont.append(tarjetaTicket(t)));
}

function tarjetaTicket(t) {
  const activos = estado.agentes.filter((a) => a.activo);
  const select = el(
    "select",
    { "aria-label": "Agente a asignar" },
    el("option", { value: "" }, "Selecciona un agente…"),
    activos.map((a) =>
      el("option", { value: a._id, selected: t.agente?._id === a._id }, `${a.nombre} (${a.especialidad})`)
    )
  );

  const asignar = async () => {
    if (!select.value) return mostrarMensaje("Selecciona un agente para asignar");
    await ejecutar(
      () => api(`/tickets/${t._id}/asignar`, { method: "POST", body: { agenteId: select.value } }),
      "Agente asignado"
    );
  };

  const formComentario = el(
    "form",
    {
      class: "form-comentario",
      onsubmit: async (e) => {
        e.preventDefault();
        const datos = Object.fromEntries(new FormData(e.target));
        await ejecutar(
          () => api(`/tickets/${t._id}/comentarios`, { method: "POST", body: datos }),
          "Comentario agregado"
        );
      },
    },
    el("input", { name: "autor", placeholder: "Autor", "aria-label": "Autor", required: true }),
    el("input", { name: "texto", placeholder: "Escribe un comentario…", "aria-label": "Comentario", required: true }),
    el("button", { type: "submit", class: "btn chico" }, "Comentar")
  );

  const esAbierto = t.estado === "abierto";

  return el(
    "article",
    { class: `ticket ${t.prioridad} ${t.estado}` },
    el(
      "div",
      { class: "ticket-cab" },
      el("span", { class: "ticket-cliente" }, t.cliente),
      el(
        "div",
        { class: "badges" },
        el("span", { class: `badge ${t.prioridad}` }, `Prioridad ${t.prioridad}`),
        el("span", { class: `badge ${t.estado}` }, t.estado)
      )
    ),
    el("p", { class: "ticket-asunto" }, t.asunto),
    el(
      "div",
      { class: "asignado" },
      "Agente: ",
      t.agente
        ? el("strong", {}, `${t.agente.nombre} · ${t.agente.especialidad}`)
        : el("span", { class: "sin" }, "Sin asignar")
    ),
    el(
      "div",
      { class: "fila-asignar" },
      select,
      el("button", { class: "btn chico", onclick: asignar }, t.agente ? "Reasignar" : "Asignar")
    ),
    el(
      "div",
      { class: "comentarios" },
      el("h4", {}, `Comentarios (${t.comentarios.length})`),
      t.comentarios.map((c) =>
        el("div", { class: "comentario" }, el("strong", {}, `${c.autor}: `), c.texto, " ", el("small", {}, formatearFecha(c.fecha)))
      ),
      formComentario
    ),
    el(
      "div",
      { class: "acciones" },
      el(
        "button",
        {
          class: `btn chico ${esAbierto ? "ok" : ""}`,
          onclick: () =>
            ejecutar(
              () => api(`/tickets/${t._id}`, { method: "PUT", body: { estado: esAbierto ? "resuelto" : "abierto" } }),
              esAbierto ? "Ticket marcado como resuelto" : "Ticket reabierto"
            ),
        },
        esAbierto ? "Marcar como resuelto" : "Reabrir"
      ),
      el(
        "button",
        {
          class: "btn chico peligro",
          onclick: () => {
            if (!confirm(`¿Eliminar el ticket de ${t.cliente}?`)) return;
            ejecutar(() => api(`/tickets/${t._id}`, { method: "DELETE" }), "Ticket eliminado");
          },
        },
        "Eliminar"
      )
    )
  );
}

// ---------- Render: agentes ----------

function renderAgentes() {
  const cont = document.getElementById("lista-agentes");
  cont.replaceChildren();
  if (estado.agentes.length === 0) {
    cont.append(el("p", { class: "vacio" }, "Aún no hay agentes."));
    return;
  }
  estado.agentes.forEach((a) => {
    const s = estado.stats[a._id];
    cont.append(
      el(
        "div",
        { class: "agente" },
        el(
          "div",
          { class: "agente-cab" },
          el("span", { class: "agente-nombre" }, a.nombre),
          el("span", { class: `badge ${a.activo ? "abierto" : "inactivo"}` }, a.activo ? "activo" : "inactivo")
        ),
        el("small", {}, `${a.especialidad} · ${a.email}`),
        s ? el("small", {}, `Tickets: ${s.abiertos} abierto(s), ${s.resueltos} resuelto(s)`) : null,
        el(
          "div",
          { class: "acciones" },
          el(
            "button",
            {
              class: "btn chico peligro",
              onclick: () => {
                if (!confirm(`¿Eliminar al agente ${a.nombre}?`)) return;
                ejecutar(() => api(`/agentes/${a._id}`, { method: "DELETE" }), "Agente eliminado");
              },
            },
            "Eliminar"
          )
        )
      )
    );
  });
}

// ---------- Formularios ----------

document.getElementById("form-ticket").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const datos = Object.fromEntries(new FormData(form));
  const ok = await ejecutar(() => api("/tickets", { method: "POST", body: datos }), "Ticket creado");
  if (ok) form.reset();
});

document.getElementById("form-agente").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const datos = Object.fromEntries(new FormData(form));
  datos.activo = form.elements.activo.checked;
  const ok = await ejecutar(() => api("/agentes", { method: "POST", body: datos }), "Agente creado");
  if (ok) form.reset();
});

document.getElementById("filtro-estado").addEventListener("change", cargarTodo);
document.getElementById("filtro-prioridad").addEventListener("change", cargarTodo);

cargarTodo();
