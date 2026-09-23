const router = require('express').Router();
const ctrl = require('../controllers/clubs');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, validateId, rules } = require('../middleware/validate');

/**
 * @openapi
 * tags:
 *   - name: Clubs
 *     description: Football clubs
 */

/**
 * @openapi
 * /clubs:
 *   get:
 *     tags: [Clubs]
 *     summary: List clubs
 *     parameters:
 *       - { in: query, name: q, schema: { type: string }, description: Filter by name }
 *     responses:
 *       200: { description: Clubs, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/Club' } } } } }
 *   post:
 *     tags: [Clubs]
 *     summary: Create a club (admin)
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { $ref: '#/components/schemas/Club' } } }
 *     responses:
 *       201: { description: Created, content: { application/json: { schema: { $ref: '#/components/schemas/Club' } } } }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       409: { description: Club already exists }
 */
router.get('/', ctrl.list);
router.post('/', authenticate, authorize('admin'), validate(rules.club), ctrl.create);

/**
 * @openapi
 * /clubs/{id}:
 *   get:
 *     tags: [Clubs]
 *     summary: Club with its players
 *     parameters: [ { $ref: '#/components/parameters/id' } ]
 *     responses:
 *       200: { description: Club, content: { application/json: { schema: { $ref: '#/components/schemas/Club' } } } }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   put:
 *     tags: [Clubs]
 *     summary: Update a club (admin)
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { $ref: '#/components/parameters/id' } ]
 *     requestBody:
 *       content: { application/json: { schema: { $ref: '#/components/schemas/Club' } } }
 *     responses:
 *       200: { description: Updated }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   delete:
 *     tags: [Clubs]
 *     summary: Delete a club (admin). Players become free agents; refused if the club has matches.
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { $ref: '#/components/parameters/id' } ]
 *     responses:
 *       204: { description: Deleted }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { description: Club still has matches }
 */
router.get('/:id', validateId(), ctrl.getOne);
router.put('/:id', authenticate, authorize('admin'), validateId(), validate(rules.club, { partial: true }), ctrl.update);
router.delete('/:id', authenticate, authorize('admin'), validateId(), ctrl.remove);

module.exports = router;
