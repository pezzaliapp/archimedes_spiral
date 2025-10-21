🌀 Archimedes Spiral — QB64-PE Edition

Archimedes Spiral è un piccolo esperimento visuale scritto in QB64-PE, che riproduce la celebre spirale di Archimede
definita dall’equazione polare:

r = a + b·θ

L’obiettivo è dimostrare come, con poche righe di codice BASIC moderno, sia possibile ottenere una visualizzazione dinamica e precisa di un concetto matematico classico.

⸻

💻 Requisiti
	•	QB64-PE v3.10 o superiore
(compatibile con Windows, macOS e Linux)
	•	Monitor con risoluzione minima 1024×768

⸻

⚙️ Parametri principali

Variabile	Significato	Valore predefinito
a	Raggio iniziale della spirale	0
b	Passo della spirale (espansione per giro)	6
tMax	Intervallo angolare totale (in radianti)	20·π ≈ 10 giri
tStep	Incremento angolare per ogni punto	0.01
colFG	Colore della spirale (verde)	_RGB32(0,255,0)
colBar	Colore delle barre verticali opzionali	_RGB32(0,0,0)


⸻

🧩 Struttura del programma

' Archimedes Spiral — QB64-PE
' r = a + b * theta
' Disegno a punti verdi + (opzionale) “barre” verticali

Il codice si compone di quattro sezioni principali:
	1.	Setup schermo – imposta la finestra grafica 1024×768 e i colori base.
	2.	Parametri matematici – definisce il centro, i coefficienti a e b, e la scala.
	3.	Loop di disegno – calcola le coordinate polari (r, θ) e traccia i punti o le linee.
	4.	Chiusura elegante – stampa un messaggio “Done!” e attende un tasto.

⸻

🖼️ Risultato visivo

Il programma disegna una spirale verde che si espande dal centro dello schermo verso l’esterno, seguendo la legge lineare tra raggio e angolo.

L’opzione di disegno delle “barre verticali” produce un effetto retro-scanline, simile a un oscilloscopio o a una grafica vettoriale anni ’80.

⸻

🧠 Note matematiche

La spirale di Archimede è una curva piana generata da un punto che si muove con velocità costante lungo una semiretta rotante intorno all’origine.
A differenza della spirale logaritmica, la distanza tra due spire successive è costante.

r(\theta) = a + b\theta

dove:
	•	r è il raggio in funzione dell’angolo θ,
	•	a è il raggio iniziale,
	•	b controlla la distanza tra le spire.

⸻

🚀 Esecuzione
	1.	Copia il codice in un nuovo file, ad esempio archimedes_spiral.bas
	2.	Apri QB64-PE e compila:

qb64pe archimedes_spiral.bas


	3.	Esegui l’applicazione risultante:

./archimedes_spiral


	4.	Alla fine del disegno apparirà il messaggio:

Done!  Premere un tasto per uscire.



⸻

🧮 Suggerimenti
	•	Prova a variare b tra 4 e 10 per osservare l’effetto sull’apertura della spirale.
	•	Aumenta tMax per disegnare più giri.
	•	Riduci tStep per migliorare la fluidità, a scapito della velocità di rendering.
	•	Cambia colFG per ottenere diverse colorazioni tematiche (es. blu o arancio).

⸻

📦 Versione estesa (Web/PWA)

È disponibile anche una versione PWA interattiva con parametri regolabili, animazione, ed esportazione in PNG/SVG:

👉 Archimedes Spiral PWA (2025)

⸻

🧾 Licenza

MIT License — Copyright ©
Sviluppo originale e adattamento in QB64-PE a cura di [Alessandro Pezzali / pezzaliAPP]
