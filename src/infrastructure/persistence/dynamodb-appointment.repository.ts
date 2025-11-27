import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  QueryCommand,
  UpdateItemCommand,
  DeleteItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { IAppointmentRepository } from '@domain/repositories/appointment.repository.interface';
import { Appointment } from '@domain/entities/appointment.entity';
import { InfrastructureException } from '@domain/exceptions/domain.exception';

/**
 * Implementación del repositorio de citas usando DynamoDB
 *
 * Utiliza el AWS SDK v3 para operaciones CRUD.
 * Soporta LocalStack para desarrollo local.
 *
 * Tabla: appointments
 * - PK: appointmentId (UUID)
 * - GSI: insuredId-index (para consultas por asegurado)
 */
@Injectable()
export class DynamoDBAppointmentRepository implements IAppointmentRepository {
  private readonly logger = new Logger(DynamoDBAppointmentRepository.name);
  private readonly client: DynamoDBClient;
  private readonly tableName: string;

  constructor(private readonly configService: ConfigService) {
    const isLocal = this.configService.get<string>('app.stage') === 'local';
    const endpoint = this.configService.get<string>('aws.dynamodb.endpoint');

    this.client = new DynamoDBClient({
      region: this.configService.get<string>('aws.region'),
      ...(isLocal && endpoint
        ? {
            endpoint,
            credentials: {
              accessKeyId: 'test',
              secretAccessKey: 'test',
            },
          }
        : {}),
    });

    this.tableName = this.configService.get<string>('aws.dynamodb.tableName') || 'appointments';
    this.logger.log(`DynamoDB Repository inicializado - Tabla: ${this.tableName}`);
  }

  /**
   * Guarda una cita en DynamoDB
   */
  async save(appointment: Appointment): Promise<void> {
    try {
      const item = appointment.toPersistence();

      const command = new PutItemCommand({
        TableName: this.tableName,
        Item: marshall(item, { removeUndefinedValues: true }),
      });

      await this.client.send(command);
      this.logger.debug(`Cita ${appointment.id} guardada en DynamoDB`);
    } catch (error) {
      this.logger.error(`Error guardando cita: ${error}`);
      throw new InfrastructureException(
        'DynamoDB',
        `Error al guardar cita: ${(error as Error).message}`,
        error as Error,
      );
    }
  }

  /**
   * Busca una cita por ID
   */
  async findById(id: string): Promise<Appointment | null> {
    try {
      const command = new GetItemCommand({
        TableName: this.tableName,
        Key: marshall({ id }),
      });

      const response = await this.client.send(command);

      if (!response.Item) {
        return null;
      }

      const item = unmarshall(response.Item);
      return Appointment.fromPersistence(item as {
        id: string;
        insuredId: string;
        scheduleId: number;
        countryISO: string;
        status: string;
        createdAt: string;
        updatedAt: string;
      });
    } catch (error) {
      this.logger.error(`Error buscando cita ${id}: ${error}`);
      throw new InfrastructureException(
        'DynamoDB',
        `Error al buscar cita: ${(error as Error).message}`,
        error as Error,
      );
    }
  }

  /**
   * Busca citas por ID de asegurado usando GSI
   */
  async findByInsuredId(insuredId: string): Promise<Appointment[]> {
    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: 'insuredId-index',
        KeyConditionExpression: 'insuredId = :insuredId',
        ExpressionAttributeValues: marshall({
          ':insuredId': insuredId,
        }),
      });

      const response = await this.client.send(command);

      if (!response.Items || response.Items.length === 0) {
        return [];
      }

      return response.Items.map(item => {
        const data = unmarshall(item);
        return Appointment.fromPersistence(data as {
          id: string;
          insuredId: string;
          scheduleId: number;
          countryISO: string;
          status: string;
          createdAt: string;
          updatedAt: string;
        });
      });
    } catch (error) {
      this.logger.error(`Error buscando citas del asegurado ${insuredId}: ${error}`);
      throw new InfrastructureException(
        'DynamoDB',
        `Error al buscar citas: ${(error as Error).message}`,
        error as Error,
      );
    }
  }

  /**
   * Actualiza el estado de una cita
   */
  async updateStatus(id: string, status: string): Promise<void> {
    try {
      const command = new UpdateItemCommand({
        TableName: this.tableName,
        Key: marshall({ id }),
        UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: marshall({
          ':status': status,
          ':updatedAt': new Date().toISOString(),
        }),
      });

      await this.client.send(command);
      this.logger.debug(`Estado de cita ${id} actualizado a ${status}`);
    } catch (error) {
      this.logger.error(`Error actualizando estado de cita ${id}: ${error}`);
      throw new InfrastructureException(
        'DynamoDB',
        `Error al actualizar estado: ${(error as Error).message}`,
        error as Error,
      );
    }
  }

  /**
   * Elimina una cita
   */
  async delete(id: string): Promise<void> {
    try {
      const command = new DeleteItemCommand({
        TableName: this.tableName,
        Key: marshall({ id }),
      });

      await this.client.send(command);
      this.logger.debug(`Cita ${id} eliminada`);
    } catch (error) {
      this.logger.error(`Error eliminando cita ${id}: ${error}`);
      throw new InfrastructureException(
        'DynamoDB',
        `Error al eliminar cita: ${(error as Error).message}`,
        error as Error,
      );
    }
  }
}
