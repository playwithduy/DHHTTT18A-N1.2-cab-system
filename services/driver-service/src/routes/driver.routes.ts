import { Router } from 'express';
import * as driverController from '../controllers/driver.controller';

const router = Router();

router.post('/status', driverController.updateStatus);
router.get('/online', driverController.getOnlineDrivers);
router.get('/available', driverController.getOnlineDrivers); // Map available to online for Level 2

export { router as driverRouter };
