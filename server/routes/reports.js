const router = require('express').Router();
const ctrl = require('../controllers/reports');
const comments = require('../controllers/comments');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { validate, validateId, rules } = require('../middleware/validate');

/**
 * @openapi
 * tags:
 *   - name: Reports
 *     description: Scouting reports (depend on Players and Users)
 *   - name: Comments
 *     description: Comments on reports (depend on Reports and Users)
 */

/**
 * @openapi
 * /reports:
 *   get:
 *     tags: [Reports]
 *     summary: List reports
 *     parameters:
 *       - { in: query, name: player, schema: { type: string } }
 *       - { in: query, name: scout, schema: { type: string } }
 *       - { in: query, name: mine, schema: { type: boolean }, description: Only reports of the logged-in user }
 *       - { in: query, name: recommendation, schema: { type: string, enum: [sign, monitor, reject] } }
 *       - { in: query, name: minOverall, schema: { type: number } }
 *       - { in: query, name: sort, schema: { type: string, enum: [newest, rating] } }
 *       - { $ref: '#/components/parameters/page' }
 *       - { $ref: '#/components/parameters/limit' }
 *     responses:
 *       200:
 *         description: Paginated reports
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Page'
 *                 - type: object
 *                   properties:
 *                     items: { type: array, items: { $ref: '#/components/schemas/Report' } }
 *   post:
 *     tags: [Reports]
 *     summary: Create a scouting report (logged-in user)
 *     description: overall is computed automatically. A `sign` recommendation moves a monitored player to the shortlist and e-mails the admins.
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { $ref: '#/components/schemas/ReportInput' } } }
 *     responses:
 *       201: { description: Created, content: { application/json: { schema: { $ref: '#/components/schemas/Report' } } } }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.get('/', optionalAuth, ctrl.list);
router.post('/', authenticate, validate(rules.report), ctrl.create);

/**
 * @openapi
 * /reports/export.csv:
 *   get:
 *     tags: [Reports]
 *     summary: Generate a CSV report of scouting reports (logged-in user)
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - { in: query, name: recommendation, schema: { type: string, enum: [sign, monitor, reject] } }
 *       - { in: query, name: mine, schema: { type: boolean } }
 *     responses:
 *       200: { description: CSV file, content: { text/csv: { schema: { type: string } } } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.get('/export.csv', authenticate, ctrl.exportCsv);

/**
 * @openapi
 * /reports/{id}:
 *   get:
 *     tags: [Reports]
 *     summary: Report details
 *     parameters: [ { $ref: '#/components/parameters/id' } ]
 *     responses:
 *       200: { description: Report, content: { application/json: { schema: { $ref: '#/components/schemas/Report' } } } }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   put:
 *     tags: [Reports]
 *     summary: Update a report (author or admin)
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { $ref: '#/components/parameters/id' } ]
 *     requestBody:
 *       content: { application/json: { schema: { $ref: '#/components/schemas/ReportInput' } } }
 *     responses:
 *       200: { description: Updated }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   delete:
 *     tags: [Reports]
 *     summary: Delete a report and its comments (author or admin)
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { $ref: '#/components/parameters/id' } ]
 *     responses:
 *       204: { description: Deleted }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.get('/:id', validateId(), ctrl.getOne);
router.put('/:id', authenticate, validateId(), validate(rules.report, { partial: true }), ctrl.update);
router.delete('/:id', authenticate, validateId(), ctrl.remove);

/**
 * @openapi
 * /reports/{reportId}/comments:
 *   get:
 *     tags: [Comments]
 *     summary: Comments of a report
 *     parameters: [ { in: path, name: reportId, required: true, schema: { type: string } } ]
 *     responses:
 *       200: { description: Comments, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/Comment' } } } } }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   post:
 *     tags: [Comments]
 *     summary: Add a comment (logged-in user). The report author is notified by e-mail.
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: reportId, required: true, schema: { type: string } } ]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { type: object, required: [text], properties: { text: { type: string, example: Great report! } } } } }
 *     responses:
 *       201: { description: Created, content: { application/json: { schema: { $ref: '#/components/schemas/Comment' } } } }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.get('/:reportId/comments', validateId('reportId'), comments.listForReport);
router.post('/:reportId/comments', authenticate, validateId('reportId'), validate(rules.comment), comments.create);

module.exports = router;
