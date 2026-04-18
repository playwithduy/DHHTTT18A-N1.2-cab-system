import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// Schema definitions
export const registerSchema = z.object({
  email:    z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name:     z.string().min(2, 'Name is too short'),
  phone:    z.string().optional(),
});

export const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string(),
});

// Middleware factory
export const validate = (schema: z.ZodObject<any, any>) => 
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync(req.body);
      return next();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(422).json({
          success: false,
          message: 'Validation failed',
          errors: error.issues.map((e: any) => ({
            field: e.path[0],
            message: e.message
          }))
        });
      }
      return res.status(500).json({ success: false, message: error.message });
    }
  };
