const router = require('express').Router();
const ctrl = require('../controllers/matches');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, validateId, rules } = require('../middleware/validate');

/**
 * @openapi
 * tags:
 *   - name: Matches
 *     description: Matches and per-player statistics
 */

/**
 * @openapi
 * /matches:
 *   get:
 *     tags: [Matches]
 *     summary: List matches (newest first)
 *     parameters:
 *       - { in: query, name: club, schema: { type: string }, description: Only matches of this club }
 *       - { $ref: '#/components/parameters/page' }
 *       - { $ref: '#/components/parameters/limit' }
 *     responses:
 *       200: { description: Paginated matches }
 *   post:
 *     tags: [Matches]
 *     summary: Create a match with player statistics (admin)
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { $ref: '#/components/schemas/Match' } } }
 *     responses:
 *       201: { description: Created }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get('/', ctrl.list);
router.post('/', authenticate, authorize('admin'), validate(rules.match), ctrl.create);

/**
 * @openapi
 * /matches/{id}:
 *   get:
 *     tags: [Matches]
 *     summary: Match details
 *     parameters: [ { $ref: '#/components/parameters/id' } ]
 *     responses:
 *       200: { description: Match, content: { application/json: { schema: { $ref: '#/components/schemas/Match' } } } }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   put:
 *     tags: [Matches]
 *     summary: Update a match (admin)
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { $ref: '#/components/parameters/id' } ]
 *     requestBody:
 *       content: { application/json: { schema: { $ref: '#/components/schemas/Match' } } }
 *     responses:
 *       200: { description: Updated }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   delete:
 *     tags: [Matches]
 *     summary: Delete a match (admin)
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { $ref: '#/components/parameters/id' } ]
 *     responses:
 *       204: { description: Deleted }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.get('/:id', validateId(), ctrl.getOne);
router.put('/:id', authenticate, authorize('admin'), validateId(), validate(rules.match, { partial: true }), ctrl.update);
router.delete('/:id', authenticate, authorize('admin'), validateId(), ctrl.remove);

module.exports = router;
