import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/**
 * Guard: API Key
 *
 * Valida que las solicitudes incluyan una API Key válida.
 * La API Key puede enviarse en:
 * - Header: x-api-key
 * - Query param: apiKey
 *
 * En modo local, se puede deshabilitar la validación.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly validApiKeys: Set<string>;
  private readonly isLocalMode: boolean;

  constructor(private readonly configService: ConfigService) {
    // Cargar API Keys válidas desde configuración
    const apiKeys = this.configService.get<string>('API_KEYS') || 'test-api-key';
    this.validApiKeys = new Set(apiKeys.split(',').map(key => key.trim()));

    this.isLocalMode = this.configService.get<string>('app.stage') === 'local';
  }

  canActivate(context: ExecutionContext): boolean {
    // En modo local, permitir todas las solicitudes si no hay API Key
    if (this.isLocalMode) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      throw new UnauthorizedException('API Key no proporcionada');
    }

    if (!this.validApiKeys.has(apiKey)) {
      throw new UnauthorizedException('API Key inválida');
    }

    return true;
  }

  /**
   * Extrae la API Key de la solicitud
   */
  private extractApiKey(request: Request): string | undefined {
    // Primero intentar desde el header
    const headerKey = request.headers['x-api-key'] as string;
    if (headerKey) {
      return headerKey;
    }

    // Luego intentar desde query params
    const queryKey = request.query['apiKey'] as string;
    if (queryKey) {
      return queryKey;
    }

    return undefined;
  }
}
