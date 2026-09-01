import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import env from './config/env';
import './jobs/notificationJob';
import authRoutes from "./routes/auth.routes";
import notesRoutes from "./routes/notes.routes";
import schedulerRoutes from "./routes/scheduler.routes";
import groupRoutes from "./routes/group.routes";
import chatbotRoutes from "./routes/chatbot.routes";
import progressRoutes from './routes/progress.routes'
import boardRoutes from "./routes/board.routes"


const app = express();

app.use(cookieParser());
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}))
app.use(
    cors({
        origin: env.CORS_ORIGIN,
        credentials: true
    }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }))

app.get('/health', (req, res) => {
    return res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    })
})

app.use('/api/auth', authRoutes);
app.use('/api/scheduler', schedulerRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/chat/groups', groupRoutes)
app.use('/api/ai/chatbot', chatbotRoutes)
app.use('/api/progress', progressRoutes)
app.use('/api/board', boardRoutes)

export default app;