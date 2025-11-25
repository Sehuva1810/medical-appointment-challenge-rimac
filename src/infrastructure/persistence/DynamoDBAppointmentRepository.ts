import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  QueryCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Appointment } from '../../domain/entities/Appointment';
import { IAppointmentRepository } from '../../domain/repositories/IAppointmentRepository';
import { AppointmentStatus } from '../../domain/value-objects/AppointmentStatus';
import { InsuredId } from '../../domain/value-objects/InsuredId';
import { CountryISO } from '../../domain/value-objects/CountryISO';

export class DynamoDBAppointmentRepository implements IAppointmentRepository {
  private readonly client: DynamoDBClient;
  private readonly tableName: string;

  constructor(client?: DynamoDBClient) {
    // Usar endpoint de LocalStack cuando se ejecuta localmente
    const endpoint = process.env.DYNAMODB_ENDPOINT;
    const clientConfig = endpoint
      ? {
          endpoint,
          region: process.env.AWS_REGION || 'us-east-1',
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
          },
        }
      : {};

    this.client = client || new DynamoDBClient(clientConfig);
    this.tableName = process.env.DYNAMODB_TABLE || 'appointments';
  }

  async save(appointment: Appointment): Promise<void> {
    const item = {
      appointmentId: appointment.appointmentId,
      insuredId: appointment.insuredId.value,
      scheduleId: appointment.scheduleId,
      countryISO: appointment.countryISO.value,
      status: appointment.status,
      createdAt: appointment.createdAt.toISOString(),
      updatedAt: appointment.updatedAt.toISOString(),
    };

    const command = new PutItemCommand({
      TableName: this.tableName,
      Item: marshall(item),
    });

    await this.client.send(command);
  }

  async findById(appointmentId: string): Promise<Appointment | null> {
    const command = new GetItemCommand({
      TableName: this.tableName,
      Key: marshall({ appointmentId }),
    });

    const result = await this.client.send(command);

    if (!result.Item) {
      return null;
    }

    const item = unmarshall(result.Item);
    return this.mapToEntity(item);
  }

  async findByInsuredId(insuredId: string): Promise<Appointment[]> {
    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: 'insuredId-createdAt-index',
      KeyConditionExpression: 'insuredId = :insuredId',
      ExpressionAttributeValues: marshall({
        ':insuredId': insuredId,
      }),
      ScanIndexForward: false, // Más recientes primero
    });

    const result = await this.client.send(command);

    if (!result.Items || result.Items.length === 0) {
      return [];
    }

    return result.Items.map((item) => this.mapToEntity(unmarshall(item)));
  }

  async updateStatus(appointmentId: string, status: string): Promise<void> {
    const command = new UpdateItemCommand({
      TableName: this.tableName,
      Key: marshall({ appointmentId }),
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
  }

  private mapToEntity(item: Record<string, unknown>): Appointment {
    return Appointment.reconstitute({
      appointmentId: item.appointmentId as string,
      insuredId: InsuredId.create(item.insuredId as string),
      scheduleId: item.scheduleId as number,
      countryISO: CountryISO.create(item.countryISO as string),
      status: item.status as AppointmentStatus,
      createdAt: new Date(item.createdAt as string),
      updatedAt: new Date(item.updatedAt as string),
    });
  }
}
