import mysql, { Pool, PoolOptions, RowDataPacket } from 'mysql2/promise';
import {
  AppointmentRecord,
  IMySQLAppointmentRepository,
} from '../../domain/repositories/IMySQLAppointmentRepository';

export class MySQLAppointmentRepository implements IMySQLAppointmentRepository {
  private pool: Pool | null = null;
  private readonly config: PoolOptions;

  constructor(countryISO?: string, config?: PoolOptions) {
    // Si se proporciona config personalizada, usarla
    if (config) {
      this.config = config;
    } else {
      // Caso contrario, construir config basado en el país
      const country = countryISO?.toUpperCase() || 'PE';
      this.config = {
        host: process.env[`RDS_${country}_HOST`] || process.env.RDS_HOST || 'localhost',
        port: parseInt(process.env[`RDS_${country}_PORT`] || process.env.RDS_PORT || '3306'),
        user: process.env[`RDS_${country}_USERNAME`] || process.env.RDS_USERNAME || 'admin',
        password: process.env[`RDS_${country}_PASSWORD`] || process.env.RDS_PASSWORD || 'password',
        database: process.env[`RDS_${country}_DATABASE`] || process.env.RDS_DATABASE || `medical_appointments_${country.toLowerCase()}`,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      };
    }
  }

  private async getPool(): Promise<Pool> {
    if (!this.pool) {
      this.pool = mysql.createPool(this.config);
    }
    return this.pool;
  }

  async save(record: AppointmentRecord): Promise<void> {
    const pool = await this.getPool();

    const query = `
      INSERT INTO appointments (
        appointment_id,
        insured_id,
        schedule_id,
        country_iso,
        status,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        updated_at = VALUES(updated_at)
    `;

    await pool.execute(query, [
      record.appointmentId,
      record.insuredId,
      record.scheduleId,
      record.countryISO,
      record.status,
      record.createdAt,
      record.updatedAt,
    ]);
  }

  async findByAppointmentId(
    appointmentId: string
  ): Promise<AppointmentRecord | null> {
    const pool = await this.getPool();

    const query = `
      SELECT 
        id,
        appointment_id as appointmentId,
        insured_id as insuredId,
        schedule_id as scheduleId,
        country_iso as countryISO,
        status,
        created_at as createdAt,
        updated_at as updatedAt
      FROM appointments
      WHERE appointment_id = ?
    `;

    const [rows] = await pool.execute<RowDataPacket[]>(query, [appointmentId]);

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      id: row.id,
      appointmentId: row.appointmentId,
      insuredId: row.insuredId,
      scheduleId: row.scheduleId,
      countryISO: row.countryISO,
      status: row.status,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  async closePool(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}
