import { Router } from 'express';
// import { verifyToken } from '../middleware/verifyToken.middleware';
// import { getWhiteboard, updateWhiteboard } from '../controllers/board.controller';
// import { validateBody, validateParams } from '../middleware/validation.middleware';
// import { z } from 'zod';

const router = Router();

// router.use(verifyToken)


// router.get("/:groupId", validateParams(z.object({ groupId: z.string() })), getWhiteboard);
// router.put("/:groupId", validateParams(z.object({ groupId: z.string() })), validateBody(z.object({ document: z.any() })), updateWhiteboard);


export default router
