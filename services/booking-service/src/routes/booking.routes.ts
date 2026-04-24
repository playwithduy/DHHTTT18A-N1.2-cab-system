import { Router } from 'express';
import * as bookingController from '../controllers/booking.controller';
import { validate, createBookingSchema } from '../middleware/validate.middleware';
import { idempotency } from '../middleware/idempotency.middleware';

const router = Router();

router.get('/health-check', (_req, res) => res.json({ 
  status: 'ok', 
  service: 'booking-service',
  routed_via: 'api-gateway'
}));
router.get('/outbox', bookingController.getOutbox); // For TC25
router.get('/outbox/:bookingId', bookingController.getOutboxByBookingId); // For Audit
router.post('/', idempotency, validate(createBookingSchema), bookingController.createBooking);
router.get('/', bookingController.getBookings);
router.get('/:id', bookingController.getBooking);
router.patch('/:id/status', bookingController.updateBookingStatus);
router.post('/:id/status', bookingController.updateBookingStatus);
router.post('/status', bookingController.updateBookingStatus);

export { router as bookingRouter };
