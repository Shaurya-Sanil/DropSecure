import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { query } from '../db/pool.js';
import { authenticate } from '../middleware/auth.js';
import { roleGuard } from '../middleware/roleGuard.js';

export const usersRouter = Router();

// GET /api/users/recipients (List recipients for courier dropoff selection or admin view - supports ?campusId=)
usersRouter.get('/recipients', async (req: Request, res: Response): Promise<void> => {
  const campusFilter = req.query.campusId as string | undefined;
  let sql = `
    SELECT id, name, email, phone, room_number, email_confirmed, campus_id, created_at 
    FROM users 
    WHERE role = 'RECIPIENT'
  `;
  const params: any[] = [];
  if (campusFilter && campusFilter !== 'ALL') {
    sql += ` AND campus_id = $1`;
    params.push(campusFilter);
  }
  sql += ` ORDER BY name ASC`;

  const result = await query(sql, params);
  res.json({ recipients: result.rows });
});

// POST /api/users/students (Admin registers a new student for a specific campus)
usersRouter.post(
  '/students',
  authenticate,
  roleGuard(['ADMIN', 'GUARD']),
  async (req: Request, res: Response): Promise<void> => {
    const { name, email, phone, roomNumber, campusId } = req.body;
    if (!name || !email) {
      res.status(400).json({ error: 'Student name and email are required' });
      return;
    }

    const targetCampus = campusId || 'CAMPUS-BANDRA';
    const saltRounds = 10;
    const defaultHash = await bcrypt.hash('Student@123', saltRounds);

    try {
      const insertRes = await query(
        `INSERT INTO users (email, password_hash, name, role, phone, room_number, campus_id, email_confirmed)
         VALUES ($1, $2, $3, 'RECIPIENT', $4, $5, $6, TRUE)
         RETURNING id, name, email, phone, room_number, campus_id, email_confirmed, created_at`,
        [
          email.toLowerCase().trim(),
          defaultHash,
          name.trim(),
          phone?.trim() || '+91-9876500000',
          roomNumber?.trim() || 'Hostel Room',
          targetCampus,
        ]
      );

      res.status(201).json({
        message: 'Student enrolled successfully!',
        student: insertRes.rows[0],
      });
    } catch (err: any) {
      if (err.code === '23505') {
        res.status(409).json({ error: `A student with email ${email} is already registered.` });
        return;
      }
      res.status(500).json({ error: err.message || 'Failed to create student' });
    }
  }
);

// DELETE /api/users/students/:id (Admin removes a student)
usersRouter.delete(
  '/students/:id',
  authenticate,
  roleGuard(['ADMIN']),
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    try {
      await query(`DELETE FROM users WHERE id = $1 AND role = 'RECIPIENT'`, [id]);
      res.json({ message: 'Student removed successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete student' });
    }
  }
);
