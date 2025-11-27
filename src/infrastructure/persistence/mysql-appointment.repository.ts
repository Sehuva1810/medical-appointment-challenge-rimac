import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mysql from 'mysql2/promise';
import { IMySQLAppointmentRepository } from '@domain/repositories/mysql-appointment.repository.interface';
import { Appointment } from '@domain/entities/appointment.entity';
import { InfrastructureException } from '@domain/exceptions/domain.exception';
import { CountryCode } from '@domain/value-objects/country-iso.vo';

/**
 * Implementación del repositorio MySQL para citas
 *
 * Cada instancia se conecta a la base de datos de un país específico.
 * Usa connection pooling para mejor rendimiento.
 *
 * Tabla: appointments
 * - id: VARCHAR(36) PRIMARY KEY
 * - insured_id: VARCHAR(5)
 * - schedule_id: INT
 * - country_iso: VARCHAR(2)
 * - status: VARCHAR(20)
 * - created_at: DATETIME
 * - updated_at: DATETIME
 */
@Injectable()
export class MySQLAppointmentRepository implements IMySQLAppointmentRepository, OnModuleDestroy {
  private readonly logger = new Logger(MySQLAppointmentRepository.name);
  private pool: mysql.Pool | null = null;
  private readonly countryCode: CountryCode;

  constructor(
    private readonly configService: ConfigService,
    countryCode: CountryCode,
  ) {
    this.countryCode = countryCode;
    this.initializePool();
  }

  /**
   * Inicializa el pool de conexiones
   */
  private initializePool(): void {
    const configKey = this.countryCode === CountryCode.PERU ? 'rds.pe' : 'rds.cl';

    const config = {
      host: this.configService.get<string>(`${configKey}.host`),
      port: this.configService.get<number>(`${configKey}.port`),
      database: this.configService.get<string>(`${configKey}.database`),
      user: this.configService.get<string>(`${configKey}.username`),
      password: this.configService.get<string>(`${configKey}.password`),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    };

    this.pool = mysql.createPool(config);
    this.logger.log(
      `MySQL Pool inicializado para ${this.countryCode} - Host: ${config.host}:${config.port}`,
    );
  }

  /**
   * Obtiene una conexión del pool
   */
  private async getConnection(): Promise<mysql.PoolConnection> {
    if (!this.pool) {
      throw new InfrastructureException('MySQL', 'Pool no inicializado');
    }
    return this.pool.getConnection();
  }

  /**
   * Guarda una cita en MySQL
   */
  async save(appointment: Appointment): Promise<void> {
    const connection = await this.getConnection();

    try {
      const query = `
        INSERT INTO appointments (id, insured_id, schedule_id, country_iso, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          status = VALUES(status),
          updated_at = VALUES(updated_at)
      `;

      const values = [
        appointment.id,
        appointment.insuredId.value,
        appointment.scheduleId,
        appointment.countryISO.value,
        appointment.status.value,
        appointment.createdAt,
        appointment.updatedAt,
      ];

      await connection.execute(query, values);
      this.logger.debug(`Cita ${appointment.id} guardada en MySQL (${this.countryCode})`);
    } catch (error) {
      this.logger.error(`Error guardando cita en MySQL: ${error}`);
      throw new InfrastructureException(
        'MySQL',
        `Error al guardar cita: ${(error as Error).message}`,
        error as Error,
      );
    } finally {
      connection.release();
    }
  }

  /**
   * Busca una cita por ID
   */
  async findById(id: string): Promise<Appointment | null> {
    const connection = await this.getConnection();

    try {
      const [rows] = await connection.execute<mysql.RowDataPacket[]>(
        'SELECT * FROM appointments WHERE id = ?',
        [id],
      );

      if (rows.length === 0) {
        return null;
      }

      return this.mapRowToAppointment(rows[0]);
    } catch (error) {
      this.logger.error(`Error buscando cita ${id}: ${error}`);
      throw new InfrastructureException(
        'MySQL',
        `Error al buscar cita: ${(error as Error).message}`,
        error as Error,
      );
    } finally {
      connection.release();
    }
  }

  /**
   * Busca citas por ID de asegurado
   */
  async findByInsuredId(insuredId: string): Promise<Appointment[]> {
    const connection = await this.getConnection();

    try {
      const [rows] = await connection.execute<mysql.RowDataPacket[]>(
        'SELECT * FROM appointments WHERE insured_id = ? ORDER BY created_at DESC',
        [insuredId],
      );

      return rows.map(row => this.mapRowToAppointment(row));
    } catch (error) {
      this.logger.error(`Error buscando citas del asegurado ${insuredId}: ${error}`);
      throw new InfrastructureException(
        'MySQL',
        `Error al buscar citas: ${(error as Error).message}`,
        error as Error,
      );
    } finally {
      connection.release();
    }
  }

  /**
   * Verifica conectividad
   */
  async healthCheck(): Promise<boolean> {
    try {
      const connection = await this.getConnection();
      await connection.ping();
      connection.release();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Cierra el pool de conexiones
   */
  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.logger.log(`MySQL Pool cerrado para ${this.countryCode}`);
    }
  }

  /**
   * Hook de NestJS para cleanup
   */
  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
  }

  /**
   * Mapea una fila de MySQL a la entidad Appointment
   */
  private mapRowToAppointment(row: mysql.RowDataPacket): Appointment {
    return Appointment.fromPersistence({
      id: row.id,
      insuredId: row.insured_id,
      scheduleId: row.schedule_id,
      countryISO: row.country_iso,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
}

/**
 * Factory para crear repositorios MySQL por país
 */
@Injectable()
export class MySQLRepositoryFactory {
  private repositories: Map<CountryCode, MySQLAppointmentRepository> = new Map();

  constructor(private readonly configService: ConfigService) {}

  /**
   * Obtiene o crea un repositorio para el país especificado
   */
  getRepository(countryCode: CountryCode): MySQLAppointmentRepository {
    if (!this.repositories.has(countryCode)) {
      const repository = new MySQLAppointmentRepository(this.configService, countryCode);
      this.repositories.set(countryCode, repository);
    }
    return this.repositories.get(countryCode)!;
  }

  /**
   * Cierra todos los repositorios
   */
  async closeAll(): Promise<void> {
    for (const repository of this.repositories.values()) {
      await repository.disconnect();
    }
    this.repositories.clear();
  }
}
