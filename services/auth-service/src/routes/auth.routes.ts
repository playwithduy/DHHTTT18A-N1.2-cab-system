import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { validate, registerSchema, loginSchema } from '../middleware/validate.middleware';

const router = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/logout', authController.logout);

export { router as authRouter };
