import express from 'express'
import { verifyToken } from '../middleware/verifyToken.middleware'
import { getProgress } from '../controllers/progress.controller'

const router = express.Router()
router.use(verifyToken)

router.get('/', getProgress)

export default router