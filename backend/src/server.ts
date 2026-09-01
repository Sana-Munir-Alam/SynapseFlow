import http from 'http';
import app from './app';
import { env } from './config/env';
import { initSocket } from './socket';
import { handleWhiteboardUpgrade } from './socket/socket-handlers/whiteboard.handler';

const PORT = env.BACKEND_PORT || 8000;
const server = http.createServer(app)

server.on('upgrade', (req, socket, head) => {
    const pathname = req.url?.split('?')[0];
    if (pathname?.startsWith('/whiteboard/')) {
        handleWhiteboardUpgrade(req, socket, head);
    }
});

initSocket(server)

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));