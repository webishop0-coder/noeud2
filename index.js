const http = require('http');
const WebSocket = require('ws');

const PORT = process.env.PORT || 3000;
const TARGET_ADDR = process.env.TARGET_ADDR || '15.235.60.159:443';
const TARGET_PATH = '/@abess237';

// Serveur HTTP simple pour le healthcheck de Google
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Optimized Fast WS-to-WS Proxy is running.\n');
});

// Options pour désactiver la compression (économise le CPU) et optimiser les buffers
const wsOptions = {
    perMessageDeflate: false, // CRUCIAL POUR LA VITESSE : ne pas recompresser le trafic chiffré
    maxPayload: 100 * 1024 * 1024, // Autorise des paquets jusqu'à 100 Mo (utile pour les gros téléchargements)
    skipUTF8Validation: true // Optimise la vitesse en ignorant la vérification de l'encodage (on transporte du binaire)
};

const wss = new WebSocket.Server({ server, ...wsOptions });

wss.on('connection', (clientWs) => {
    // Connexion au VPS
    const targetUrl = `ws://${TARGET_ADDR}${TARGET_PATH}`;
    const targetWs = new WebSocket(targetUrl, wsOptions);

    // VPS -> Client
    targetWs.on('message', (data) => {
        if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(data, { binary: true });
        }
    });

    // Client -> VPS
    clientWs.on('message', (data) => {
        if (targetWs.readyState === WebSocket.OPEN) {
            targetWs.send(data, { binary: true });
        }
    });

    // Nettoyage des connexions
    targetWs.on('error', () => clientWs.close());
    targetWs.on('close', () => clientWs.close());
    clientWs.on('close', () => targetWs.close());
    clientWs.on('error', () => targetWs.close());
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Ultra-Fast Proxy démarré sur le port ${PORT} -> ${TARGET_ADDR}`);
});
