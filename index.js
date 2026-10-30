const http = require('http');
const WebSocket = require('ws');
const net = require('net');

const PORT = process.env.PORT || 3000;
const TARGET_ADDR = process.env.TARGET_ADDR || '15.235.60.159:443';
const [TARGET_HOST, TARGET_PORT] = TARGET_ADDR.split(':');

// Création du serveur HTTP de base (exigé par Cloud Run)
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Optimized Proxy is running.\n');
});

// Attachement du serveur WebSocket au serveur HTTP
const wss = new WebSocket.Server({ 
    server,
    perMessageDeflate: {
        zlibDeflateOptions: { chunkSize: 1024, memLevel: 7, level: 3 },
        zlibInflateOptions: { chunkSize: 10 * 1024 },
        clientNoContextTakeover: true,
        serverNoContextTakeover: true,
        serverMaxWindowBits: 10,
        concurrencyLimit: 10,
        threshold: 1024
    }
});

wss.on('connection', (ws) => {
    // Connexion TCP vers ton VPS
    const tcpSocket = new net.Socket();
    
    // OPTIMISATION CRUCIALE : Désactive l'algorithme de Nagle pour une latence minimale
    tcpSocket.setNoDelay(true); 

    tcpSocket.connect(parseInt(TARGET_PORT), TARGET_HOST, () => {
        // VPS -> Client
        tcpSocket.on('data', (data) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(data);
            }
        });
    });

    // Client -> VPS
    ws.on('message', (data) => {
        if (!tcpSocket.destroyed) {
            tcpSocket.write(data);
        }
    });

    // Nettoyage des connexions
    tcpSocket.on('error', () => ws.close());
    tcpSocket.on('close', () => ws.close());
    ws.on('close', () => tcpSocket.destroy());
    ws.on('error', () => tcpSocket.destroy());
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Optimized proxy running on port ${PORT} -> targeting ${TARGET_ADDR}`);
});
