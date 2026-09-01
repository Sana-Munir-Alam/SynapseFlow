import { Router } from 'express';
import {
    createGroup,
    deleteGroup,
    getGroupMembers,
    getMyGroups,
    joinGroup,
    leaveGroup,
    searchGroups,
} from '../controllers/group.controller';
import { verifyToken } from '../middleware/verifyToken.middleware';
import { requireGroupAdmin } from '../middleware/requireGroupAdmin.middleware';
import { validateBody, validateParams, validateQuery } from '../middleware/validation.middleware';
import { createGroupBodySchema, groupParamsSchema, searchGroupQuerySchema } from '../db/schema/group.schema';
import messagesRoutes from './messages.routes'

const router = Router();

// All group routes require authentication
router.use(verifyToken);

router.post('/', validateBody(createGroupBodySchema), createGroup);
router.get('/my-groups', getMyGroups);
router.get('/search', validateQuery(searchGroupQuerySchema), searchGroups);
router.post('/:groupId/join', validateParams(groupParamsSchema), joinGroup);
router.get('/:groupId/members', validateParams(groupParamsSchema), requireGroupAdmin, getGroupMembers);
router.delete('/:groupId/leave', validateParams(groupParamsSchema), leaveGroup);
router.delete('/:groupId', validateParams(groupParamsSchema), requireGroupAdmin, deleteGroup);

router.use('/:groupId/messages', messagesRoutes);

export default router;