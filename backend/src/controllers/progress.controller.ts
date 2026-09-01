import type { Request, Response } from 'express'
import { getProgressOverview } from '../services/dal/progress.dal'

export const getProgress = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id
        const data = await getProgressOverview(userId)
        return res.status(200).json(data)
    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: 'Failed to fetch progress analytics' })
    }
}
