const router = require('express').Router();
const ctrl = require('../controllers/players');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, validateId, rules } = require('../middleware/validate');

/**
 * @openapi
 * tags:
 *   - name: Players
 *     description: Scouted football players
 */

/**
 * @openapi
 * /players:
 *   get:
 *     tags: [Players]
 *     summary: List / search players
 *     description: Filtering, sorting and pagination. `avgRating` and `reportCount` are computed from the Reports collection.
 *     parameters:
 *       - { in: query, name: q, schema: { type: string }, description: Name / nationality keyword }
 *       - { in: query, name: position, schema: { type: string }, description: "Comma separated, e.g. ST,LW" }
 *       - { in: query, name: status, schema: { type: string, enum: [monitoring, shortlisted, recommended, rejected] } }
 *       - { in: query, name: nationality, schema: { type: string } }
 *       - { in: query, name: club, schema: { type: string } }
 *       - { in: query, name: minAge, schema: { type: integer } }
 *       - { in: query, name: maxAge, schema: { type: integer } }
 *       - { in: query, name: minRating, schema: { type: number } }
 *       - { in: query, name: maxValue, schema: { type: number } }
 *       - { in: query, name: sort, schema: { type: string, enum: [name, rating, age, value, newest] } }
 *       - { $ref: '#/components/parameters/page' }
 *       - { $ref: '#/components/parameters/limit' }
 *     responses:
 *       200:
 *         description: Paginated players
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Page'
 *                 - type: object
 *                   properties:
 *                     items: { type: array, items: { $ref: '#/components/schemas/Player' } }
 *   post:
 *     tags: [Players]
 *     summary: Add a player (logged-in user)
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { $ref: '#/components/schemas/PlayerInput' } } }
 *     responses:
 *       201: { description: Created, content: { application/json: { schema: { $ref: '#/components/schemas/Player' } } } }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.get('/', ctrl.list);
router.post('/', authenticate, validate(rules.player), ctrl.create);

/**
 * @openapi
 * /players/{id}:
 *   get:
 *     tags: [Players]
 *     summary: Player details with reports and average ratings
 *     parameters: [ { $ref: '#/components/parameters/id' } ]
 *     responses:
 *       200: { description: Player, content: { application/json: { schema: { $ref: '#/components/schemas/Player' } } } }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   put:
 *     tags: [Players]
 *     summary: Update a player (admin or the scout who added it)
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { $ref: '#/components/parameters/id' } ]
 *     requestBody:
 *       content: { application/json: { schema: { $ref: '#/components/schemas/PlayerInput' } } }
 *     responses:
 *       200: { description: Updated, content: { application/json: { schema: { $ref: '#/components/schemas/Player' } } } }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   delete:
 *     tags: [Players]
 *     summary: Delete a player with its reports and comments (admin)
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { $ref: '#/components/parameters/id' } ]
 *     responses:
 *       204: { description: Deleted }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.get('/:id', validateId(), ctrl.getOne);
router.put('/:id', authenticate, validateId(), validate(rules.player, { partial: true }), ctrl.update);
router.delete('/:id', authenticate, authorize('admin'), validateId(), ctrl.remove);

/**
 * @openapi
 * /players/{id}/stats:
 *   get:
 *     tags: [Players]
 *     summary: Aggregated match statistics of a player
 *     parameters: [ { $ref: '#/components/parameters/id' } ]
 *     responses:
 *       200:
 *         description: Stats
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 appearances: { type: integer }
 *                 minutes: { type: integer }
 *                 goals: { type: integer }
 *                 assists: { type: integer }
 *                 avgMatchRating: { type: number }
 *                 timeline: { type: array, items: { type: object } }
 * /players/{id}/dependencies:
 *   get:
 *     tags: [Players]
 *     summary: Number of dependent documents (reports, comments) removed by a delete
 *     parameters: [ { $ref: '#/components/parameters/id' } ]
 *     responses:
 *       200: { description: Counts }
 */
router.get('/:id/stats', validateId(), ctrl.stats);
router.get('/:id/dependencies', validateId(), ctrl.dependencies);

module.exports = router;
