import { InMemorySyncStorage, TLSocketRoom } from "@tldraw/sync-core";
import { getWhiteboardByGroupId } from "../../controllers/board.controller";
import db from "../../db/connection";
import { whiteboards, groupMembers } from "../../db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import { IncomingMessage } from "http";
import { WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import { parse } from "cookie";

const rooms = new Map<string, TLSocketRoom>();
const roomCloseTimers = new Map<string, NodeJS.Timeout>();
const wss = new WebSocketServer({ noServer: true });

export const getOrCreateRoom = async (groupId: string) => {
    let room = rooms.get(groupId);
    
    if (!room) {
        const { data: board } = await getWhiteboardByGroupId(groupId);
        
        const storage = new InMemorySyncStorage({ 
            snapshot: (board?.snapshot as any)?.documents 
                ? (board!.snapshot as any) 
                : { documents: [] } 
        });

        room = new TLSocketRoom({ 
            storage,
            log: {
                warn: (...args: any[]) => console.warn('[tldraw-sync]', ...args),
                error: (...args: any[]) => console.error('[tldraw-sync]', ...args),
            },
            onDataChange: async () => {
                const snapshot = storage.getSnapshot();
                const [existing] = await db.select().from(whiteboards).where(eq(whiteboards.groupId, groupId));
                
                if (!existing) {
                    await db.insert(whiteboards).values({
                        boardId: crypto.randomUUID(),
                        groupId,
                        snapshot,
                    });
                } else {
                    await db.update(whiteboards)
                        .set({ snapshot, updatedAt: new Date() })
                        .where(eq(whiteboards.groupId, groupId));
                }
            },
            onSessionRemoved: (_room, { numSessionsRemaining }) => {
                if (numSessionsRemaining === 0) {
                    // Delay cleanup to allow reconnects (e.g. page refresh)
                    const timer = setTimeout(() => {
                        const currentRoom = rooms.get(groupId);
                        if (currentRoom && currentRoom === room) {
                            currentRoom.close();
                            rooms.delete(groupId);
                            console.log(`Whiteboard room closed: ${groupId}`);
                        }
                        roomCloseTimers.delete(groupId);
                    }, 2000);
                    roomCloseTimers.set(groupId, timer);
                }
            }
        });

        rooms.set(groupId, room);
    }

    return room;
};

export const handleWhiteboardUpgrade = async (req: IncomingMessage, socket: any, head: Buffer) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const parts = url.pathname.split('/');
    const groupId = parts[parts.length - 1];

    if (!groupId) {
        console.warn('Whiteboard Upgrade Failed: No groupId');
        socket.destroy();
        return;
    }

    try {
        const cookies = parse(req.headers.cookie ?? '');
        const token = cookies['token'] || url.searchParams.get('token');
        if (!token) throw new Error('No token');

        const payload = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
        const userId = payload.id;

        const [membership] = await db.select()
            .from(groupMembers)
            .where(and(
                eq(groupMembers.groupId, groupId),
                eq(groupMembers.userId, userId)
            ));

        if (!membership) throw new Error('Not a member');

        // Cancel pending room close if user is reconnecting
        const pendingClose = roomCloseTimers.get(groupId);
        if (pendingClose) {
            clearTimeout(pendingClose);
            roomCloseTimers.delete(groupId);
        }

        wss.handleUpgrade(req, socket, head, async (ws) => {
            try {
                const room = await getOrCreateRoom(groupId);
                const sessionId = crypto.randomUUID();
                room.handleSocketConnect({
                    sessionId,
                    socket: ws as any,
                    isReadonly: false,
                });
            } catch (err) {
                console.error('Whiteboard Room Error:', err);
                ws.close();
            }
        });
    } catch (err) {
        console.error('Whiteboard Auth Failed:', err);
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
    }
};