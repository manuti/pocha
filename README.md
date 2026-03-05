# Contador de Pocha — README de cambios

Este documento resume **todos los cambios** introducidos sobre la versión original para que la app funcione con 5 jugadores, nueva puntuación, control de apuestas, y un plan de rondas finito.
El proyecto original es de https://javipas.com/2025/08/04/chatgpt-puede-ser-maravilloso/ y se ha hecho un fork desde este repositorio de código https://github.com/picajoso/pocha

---

## Resumen de cambios

* 👥 **5 jugadores** (antes 4).
* 🧮 **Nueva puntuación**: +10 por acertar la apuesta y +5 por cada baza acertada; penalización −5 por cada diferencia.
* 📦 **Indicador de apuestas** bajo el encabezado de ronda (verde) que pasa a rojo cuando **suma de apuestas = nº de cartas**.
* 🔁 **Plan de rondas finito** exactamente según el patrón solicitado (incluye 5 “Subastados” a 8 cartas) y **cierre de partida**.
* 🐞 **Arreglo** al resumen: se añade la tabla de la ronda al bloque antes de insertarlo.

---

## Archivos afectados

* `index.html` – se añade el 5º jugador y el indicador de apuestas. La versión original traía 4 tarjetas de jugador definidas de forma estática.
* `script.js` – múltiples cambios (jugadores, puntuación, indicador, plan de rondas, fix de resumen). La versión original tenía `numPlayers = 4` y la lógica de cartas “sube/baja” infinita.
* `style.css` – estilos nuevos para el indicador.
* `manifest.json` y `sw.js` – **sin cambios funcionales** (solo notas para despliegue). El `manifest.json` ya usa `start_url: "index.html"`; el `sw.js` cachea con rutas absolutas (`"/", "/index.html", ...`).

---

## Cambios por archivo

### 1) `index.html`

1. **Añadido 5º jugador**: se copió el último bloque `.player-card` y se ajustó `data-player="4"` y el nombre por defecto “Jugador 5”. En la versión original solo existían 4 bloques.
2. **Indicador de apuestas**: bajo `#current-round-header` se añadió:

   ```html
   <div id="bids-indicator" class="bids-box">Apuestas: 0 / 1</div>
   ```

### 2) `style.css`

Nuevas clases para el recuadro verde/rojo:

```css
.bids-box {
  background-color: #4e7c57;
  border: 2px solid #598c5c;
  color: #fff;
  border-radius: 8px;
  padding: 0.4rem 0.75rem;
  margin: -0.3rem auto 1rem;
  text-align: center;
  width: fit-content;
  font-weight: bold;
}
.bids-box.alert {
  background-color: #b93b3b;
  border-color: #d67a7a;
}
```

> Paleta consistente con el tema existente de la hoja de estilos original.

### 3) `script.js`

#### 3.1 Jugadores: de 4 → 5

* **Antes**: `const numPlayers = 4;`
* **Ahora**:

  ```js
  const numPlayers = 5;
  ```

#### 3.2 Puntuación

* **Antes**:

  ```js
  const points =
    player.bid === player.won
      ? 5 + player.won * 3
      : -3 * Math.abs(player.bid - player.won);
  ```



* **Ahora**:

  ```js
  const points =
    player.bid === player.won
      ? 10 + player.won * 5
      : -5 * Math.abs(player.bid - player.won);
  ```

#### 3.3 Indicador de apuestas

Nueva función y llamadas:

```js
function updateBidsIndicator() {
  const totalBids = players.reduce((s, p) => s + p.bid, 0);
  const el = document.getElementById("bids-indicator");
  if (!el) return;
  el.textContent = `Apuestas: ${totalBids} / ${cardsPerPlayer}`;
  el.classList.toggle("alert", totalBids === cardsPerPlayer);
}
```

Se invoca desde:

```js
function updateCurrentRoundHeader() {
  document.getElementById("current-round-header")
    .textContent = `${roundPlan[roundIndex].title}, Cartas: ${cardsPerPlayer}`;
  updateBidsIndicator();
}
function updateDisplay() {
  // ... (actualizaciones de UI existentes)
  updateBidsIndicator();
}
```

> El `changeValue()` ya llamaba a `updateDisplay()` en el original, por lo que el indicador se actualiza en cada +/−.

#### 3.4 Plan de rondas finito + cierre de partida

Se sustituyó la lógica de “subir hasta maxCards y bajar” (infinita) —que dependía de `maxCards` e `increasing`— por un **plan fijo** con índice:

```js
let roundIndex = 0;

function buildRoundPlan() {
  const plan = [];
  for (let i = 1; i <= 8; i++) plan.push({ title: `Ronda: ${i}`, cards: i });
  for (let i = 9; i <= 12; i++) plan.push({ title: `Ronda: ${i}`, cards: 8 });
  let c = 7;
  for (let i = 13; i <= 19; i++, c--) plan.push({ title: `Ronda: ${i}`, cards: c });
  for (let s = 1; s <= 5; s++) plan.push({ title: `Subastado: ${s}`, cards: 8 });
  return plan;
}

const roundPlan = buildRoundPlan();
let cardsPerPlayer = roundPlan[roundIndex].cards;
```

`saveRound()` ahora:

* Usa el **título** del plan para el encabezado de la ronda.
* Avanza `roundIndex` y **termina la partida** al final:

```js
function saveRound() {
  // ... cálculo de puntos y tabla ...

  // Ensamblado correcto (ver 3.5) y añadido al scoreboard:
  table.appendChild(thead);
  table.appendChild(tbody);
  roundBlock.appendChild(roundHeader);
  roundBlock.appendChild(table);
  scoreboard.insertBefore(roundBlock, scoreboard.firstChild);

  roundIndex++;
  if (roundIndex >= roundPlan.length) { endGame(); return; }

  cardsPerPlayer = roundPlan[roundIndex].cards;
  updateDisplay();
  updateCurrentRoundHeader();
}

function endGame() {
  updateCurrentRoundHeader(); // mostrará "Partida finalizada"
  const btn = document.getElementById("next-round");
  btn.textContent = "Partida finalizada";
  btn.disabled = true;
  document.querySelectorAll(".player-name, .bid-plus, .bid-minus, .won-plus, .won-minus")
    .forEach(el => el.disabled = true);
  updateBidsIndicator();
}
```

#### 3.5 Fix: resumen de rondas

Se corrigió que la tabla no apareciera en el resumen añadiendo la línea que faltaba antes de insertar el bloque en el `scoreboard`:

```js
roundBlock.appendChild(table); // (esta línea faltaba)
```

---

## Notas para despliegue (PWA)

* `manifest.json` usa `start_url: "index.html"` (ruta relativa), lo que ayuda al servir en subrutas.
* `sw.js` cachea rutas con **barra inicial** (`"/", "/index.html", ...`). Si sirves la app en una **subcarpeta** (p. ej. GitHub Pages de proyecto), conviene usar rutas **relativas** o calcular URLs en base a `self.registration.scope`.

---

## Cómo ejecutar en local

1. Sirve la carpeta con un servidor estático (por ejemplo, `npx serve` o la extensión “Live Server” de VS Code).
2. Abre `http://localhost:PORT/`.
3. Para probar el Service Worker, usa HTTPS o `localhost`.

---

## v2.1 — Tabla única horizontal de rondas

- Se reemplaza el resumen vertical por **una única tabla** (`<table class="score-table">`) dentro de `#scoreboard`.
- Cabecera: primera columna doble (“Ronda/Tipo”) y una columna por **jugador** (nombres dinámicos).
- Se crea siempre una **fila “Total”** al principio, que se actualiza cada ronda.
- Por cada ronda se agregan **3 filas**: `Bets`, `Wins`, `Pts`. La primera celda de la ronda (con `rowSpan=3`) muestra la **etiqueta de ronda** (ver v2.2).
- Nuevas utilidades en `script.js`:
  - `ensureScoreTable()` crea la tabla si no existe.
  - `renderHeader()` sincroniza los nombres de la cabecera con los inputs.
  - `updateTotalsRow()` actualiza la fila de totales.
  - `appendRoundRows(label, cards, betsArr, winsArr, ptsArr)` añade las filas de la ronda.
- `saveRound()` deja de crear bloques/tablitas por ronda; ahora **solo** añade filas a esta tabla única y actualiza los totales.

**CSS añadido** (al final de `style.css`):
```css
.score-table { width: 100%; border-collapse: collapse; background: #3c6b44; table-layout: fixed; }
.score-table th, .score-table td { border-bottom: 1px solid #598c5c; padding: 0.4rem 0.6rem; text-align: center; font-size: 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #fff; }
.score-table thead th { background: #4e7c57; font-weight: bold; }
.score-table .round-label { background: #2f5335; font-weight: bold; color: #f6e27a; }
.score-table .row-type { background: #4e7c57; font-weight: 600; }
.score-table .total-row th, .score-table .total-row td { background: #3f6f47; font-weight: 700; color: #f6e27a; }
````

---

## v2.2 — Etiquetas cortas en la tabla (1, 2, 3… y S1, S2…)

* El plan de rondas ahora define una propiedad `short` con la **etiqueta corta** para mostrar en la tabla:

```js
function buildRoundPlan() {
  const plan = [];
  for (let i = 1; i <= 8; i++) plan.push({ title: `Ronda: ${i}`, short: `${i}`, cards: i });
  for (let i = 9; i <= 12; i++) plan.push({ title: `Ronda: ${i}`, short: `${i}`, cards: 8 });
  let c = 7;
  for (let i = 13; i <= 19; i++, c--) plan.push({ title: `Ronda: ${i}`, short: `${i}`, cards: c });
  for (let s = 1; s <= 5; s++) plan.push({ title: `Subastado: ${s}`, short: `S${s}`, cards: 8 });
  return plan;
}
```

* La tabla muestra **solo** la etiqueta corta (p. ej. `1`, `2`, `S1`) en la primera celda de cada ronda:

```js
function appendRoundRows(roundLabel, cards, betsArr, winsArr, ptsArr) {
  // ...
  if (r === 0) {
    const tdRound = document.createElement("td");
    tdRound.className = "round-label";
    tdRound.rowSpan = 3;
    tdRound.textContent = roundLabel; // "1", "2", "S1", ...
    tr.appendChild(tdRound);
  }
  // ...
}
```

* `saveRound()` pasa `roundPlan[roundIndex].short` a `appendRoundRows(...)`.

---

## v2.3 — Validación de “Ganadas = Cartas de la ronda”

* **Nueva validación obligatoria**: la suma de `Ganadas` (todas las personas) debe ser **igual** al número de cartas de esa ronda.
* Si no se cumple, el botón **“Guardar ronda”** se desactiva y muestra el mensaje:
  **`Ajusta Ganadas (X/Y)`**.
* Implementación:

  * Nueva función `updateSaveButtonState()` llamada desde `updateDisplay()`, `updateCurrentRoundHeader()` y `setup()`:

```js
function updateSaveButtonState() {
  const btn = document.getElementById("next-round");
  if (!btn) return;
  if (roundIndex >= roundPlan.length) { btn.textContent = "Partida finalizada"; btn.disabled = true; return; }

  const totalWins = players.reduce((sum, p) => sum + (p.won || 0), 0);
  const ok = totalWins === cardsPerPlayer;
  btn.disabled = !ok;
  btn.textContent = ok ? "Guardar ronda" : `Ajusta Ganadas (${totalWins}/${cardsPerPlayer})`;
}
```

* **Doble chequeo** dentro de `saveRound()` por seguridad:

```js
function saveRound() {
  const totalWins = players.reduce((sum, p) => sum + (p.won || 0), 0);
  if (totalWins !== cardsPerPlayer) { updateSaveButtonState(); return; }
  // ... resto del guardado
}
```

**Notas**:

* El encabezado superior sigue mostrando `Ronda: X, Cartas: Y` para cada paso del plan.
* La validación solo afecta al botón de **guardar**; los controles +/− siguen funcionando para ajustar hasta cuadrar.


## v2.4 — Corrección de alineación de botones en móvil (PWA)

En dispositivos móviles (~390 px de ancho) las tarjetas de jugador ocupan el 50 % del ancho de pantalla.
El espacio interior resultaba demasiado ajustado y los botones `+` / `−` quedaban desalineados entre las filas “Apuesta” y “Ganadas”.

### Causa raíz

* Las etiquetas `Apuesta:` y `Ganadas:` tienen distinto ancho natural; con `justify-content: space-between` esto desplazaba horizontalmente los controles de cada fila.
* Los botones usaban `padding` variable en lugar de un tamaño fijo, lo que provocaba alturas inconsistentes.

### Cambios en `style.css`

**Estilos base (todas las pantallas)**

| Selector | Antes | Después |
|---|---|---|
| `.control-group label` | sin `min-width` | `min-width: 5rem` — iguala el ancho de ambas etiquetas |
| `.control-group button` | `padding: 0.4rem 0.6rem; min-width: 28px` | `width: 32px; height: 32px; padding: 0; display: flex; align-items/justify-content: center` — botón cuadrado con centrado flex |
| `.control-group .value` | `min-width: 1.5rem` | `min-width: 1.8rem` |

**Media query móvil (`max-width: 600px`)**

| Selector | Antes | Después |
|---|---|---|
| `.player-card` | `padding: 0.7rem` | `padding: 0.6rem` |
| `.control-group label` | sin override | `font-size: 0.85rem; min-width: 4.5rem` |
| `.control-group .controls` | `gap: 0.4rem` | `gap: 0.3rem` |
| `.control-group button` | `padding: 0.35rem 0.55rem; min-width: 26px` | `width: 28px; height: 28px` |
| `.control-group .value` | `min-width: 1.3rem` | `min-width: 1.4rem` |

---

## Historial de versiones

* **v2.4**: Corrección de alineación de botones +/− en móvil / PWA
* **v2.3**: Validación de “Ganadas = Cartas de la ronda”
* **v2.2**: Etiquetas cortas en la tabla (1, 2, 3… y S1, S2…)
* **v2.1**: Tabla única horizontal de rondas
* **v2.0**: 5ª tarjeta de jugador; nueva puntuación; indicador de apuestas; plan de rondas finito + cierre; fix de resumen.
* **v1.0 (original)**: 4 jugadores, puntuación 5 + 3*won / −3*|diff|, lógica de cartas infinita “sube/baja”, sin indicador de apuestas.

---
