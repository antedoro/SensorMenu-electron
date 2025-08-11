# SensorMenu: Come sviluppare un App Desktop con l'Aiuto dell'AI

Ciao a tutti! Oggi voglio raccontarvi la storia di un piccolo progetto personale, **SensorMenu**, un'applicazione desktop che ho sviluppato per monitorare i dati di temperatura e umidità provenienti da un sensore. Ma più che dell'app in sé, voglio parlarvi del viaggio per realizzarla, un percorso fatto di tentativi, fallimenti e, alla fine, di un successo reso possibile da un co-pilota inaspettato: l'intelligenza artificiale.

## Cosa Fa SensorMenu?

Nella sua essenza, SensorMenu è un'utility semplice ma potente. Si posiziona nella menubar di macOS o nella tray di sistema di Windows e Linux, mostrando in tempo reale i dati di temperatura e umidità.

L'idea nasce da un'esigenza pratica: ho un sensore **ESP32 con un DHT22** in una stanza che pubblica costantemente i dati su un **broker Mosquitto** locale. Volevo un modo discreto e immediato per tenere d'occhio questi valori senza dover aprire un terminale o un'applicazione dedicata. La catena di funzionamento è proprio questa:

**Sensore ESP32/DHT22 → Broker Mosquitto → SensorMenu**

L'app si iscrive al topic MQTT e aggiorna l'interfaccia a ogni nuovo messaggio ricevuto, fornendo una visione costante e aggiornata dei dati.

## Il Ruolo Cruciale dell'Intelligenza Artificiale

Qui arriva il punto centrale del mio racconto. Programmo da anni, ma la vita è fatta di impegni e il tempo è una risorsa preziosa. Se avessi dovuto sviluppare questo progetto da zero, da solo, avrei impiegato così tanto tempo che, come si suol dire, **il gioco non sarebbe valso la candela**.

È qui che è entrato in gioco **Gemini CLI**. Ho utilizzato questo strumento non come un sostituto delle mie competenze, ma come un **facilitatore**, un acceleratore di sviluppo. Ha gestito il boilerplate, suggerito soluzioni, scritto porzioni di codice e mi ha permesso di concentrarmi sulla logica e sulla struttura dell'applicazione, invece di perdermi nei dettagli implementativi più noiosi.

## La Strada per Arrivare a Electron: Un Percorso a Ostacoli

La scelta di Electron non è stata la prima. Anzi, ho cercato di evitarla in tutti i modi, principalmente per il peso degli eseguibili finali.

### Tentativo #1: Tauri, il Sogno Infranto

La mia prima scelta era **Tauri**. Moderno, leggero, basato su Rust, sembrava la soluzione perfetta. Ho pensato: "Non conosco Rust, ma forse con l'aiuto dell'AI posso farcela!". Purtroppo, mi sono scontrato con una dura realtà.

Come ha sottolineato anche **Salvatore Sanfilippo**, l'ideatore di Redis, in un suo vlog, le AI sono in grande difficoltà con i linguaggi e i framework di nicchia. La ragione è semplice: sono state addestrate su una quantità di documentazione e codice molto inferiore rispetto a tecnologie più diffuse. E questo problema l'ho vissuto in pieno. L'AI continuava a fornirmi soluzioni che mescolavano la sintassi di Tauri 1 con quella di Tauri 2, generando errori da cui era impossibile uscire. La documentazione di Tauri, già di per sé non eccezionale e frammentata a causa dei recenti cambiamenti, non aiutava. Dopo giorni di frustrazione, ho gettato la spugna.

### Tentativo #2: Python, la Falsa Speranza

A quel punto, sono tornato su un terreno familiare: **Python**. L'idea era usare `pywebview` per la parte grafica (HTML/CSS/JS) e `rumps` per l'integrazione con la menubar di macOS. Sembrava un piano solido.

Il problema, però, si è presentato al momento di creare un'applicazione distribuibile. Sia con `pyinstaller` che con `py2app`, il risultato è stato un **macello totale**. Dipendenze mancate, eseguibili che non partivano, errori incomprensibili. Ho dovuto ammettere a malincuore che, per quanto io ami Python, non è la scelta ideale per creare applicazioni desktop con interfacce grafiche complesse e portabili (forse con le librerie Qt la storia sarebbe diversa, ma sarebbe stato un altro percorso da imparare).

## Le Funzioni Principali di SensorMenu

Alla fine, ho scelto **Electron**. Nonostante il peso, offre un'affidabilità e una maturità che gli altri strumenti, per questo specifico progetto, non potevano garantirmi. Con l'aiuto di Gemini, ho messo in piedi l'applicazione funzionante in tempi record.

Ecco le sue funzionalità principali (immaginando la versione completa e funzionante su tutte le piattaforme):

*   **Integrazione con la Menubar/System Tray**: Visualizzazione personalizzabile di temperatura e umidità.
*   **Finestra di Impostazioni**:
    *   Avvio automatico all'accensione del computer.
    *   Configurazione del broker MQTT (IP, porta) e del topic.
    *   Checkbox per scegliere se visualizzare la temperatura, l'umidità o entrambe.
    *   Pulsante per ripristinare le impostazioni di default.
*   **Pausa e Ripresa**: Un comodo menu permette di mettere in pausa lo stream dei dati MQTT e riprenderlo in qualsiasi momento.
*   **Cross-Platform**: L'applicazione è progettata per funzionare nativamente su macOS, Windows e Linux.

## Scarica l'App e Contribuisci al Codice

Questo progetto è un esempio di come la perseveranza e gli strumenti giusti possano trasformare un'idea in realtà.

*   **Per gli sviluppatori**: Il codice sorgente è interamente disponibile su GitHub. Sentitevi liberi di esplorarlo, fare un fork o proporre miglioramenti!
    *   **Repository GitHub**: [[SensorMenu REPOSITORY GITHUB](https://github.com/antedoro/SensorMenu-electron)]

*   **Per gli utenti**: Potete scaricare l'ultima versione dell'applicazione per macOS, Windows e Linux direttamente dalla pagina delle "Releases" del progetto.
    *   **Pagina di Download**: [[SensorMenu RELEASES](https://github.com/antedoro/SensorMenu-electron/releases/tag/v0.1.0)]

Spero che questa piccola avventura possa essere d'ispirazione. L'intelligenza artificiale sta cambiando il nostro modo di lavorare, e imparare a usarla come un partner di sviluppo può aprirci porte che prima ritenevamo troppo faticose da varcare.
