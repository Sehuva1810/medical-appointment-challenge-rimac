import { IValueObject } from '@shared/interfaces/base.interface';
import { ValidationException } from '@domain/exceptions/domain.exception';

/**
 * Enum de países soportados
 * Define los códigos ISO 3166-1 alpha-2 válidos para el sistema
 */
export enum CountryCode {
  PERU = 'PE',
  CHILE = 'CL',
}

/**
 * Configuración específica por país
 * Implementa el patrón Strategy para comportamiento específico por región
 */
export interface CountryConfig {
  readonly code: CountryCode;
  readonly name: string;
  readonly timezone: string;
  readonly currency: string;
  readonly queueName: string;
}

/**
 * Registro de configuraciones por país
 */
const COUNTRY_CONFIGS: Record<CountryCode, CountryConfig> = {
  [CountryCode.PERU]: {
    code: CountryCode.PERU,
    name: 'Perú',
    timezone: 'America/Lima',
    currency: 'PEN',
    queueName: 'appointments-pe-queue',
  },
  [CountryCode.CHILE]: {
    code: CountryCode.CHILE,
    name: 'Chile',
    timezone: 'America/Santiago',
    currency: 'CLP',
    queueName: 'appointments-cl-queue',
  },
};

/**
 * Value Object: CountryISO
 *
 * Representa el código de país en formato ISO 3166-1 alpha-2.
 * Encapsula la validación y provee acceso a la configuración del país.
 *
 * Reglas de negocio:
 * - Solo se permiten los países: PE (Perú), CL (Chile)
 * - El código es case-insensitive en la entrada pero se normaliza a mayúsculas
 *
 * Patrones aplicados:
 * - Value Object (DDD)
 * - Strategy Pattern (configuración por país)
 *
 * @example
 * const country = CountryISO.create('PE');
 * console.log(country.config.timezone); // "America/Lima"
 */
export class CountryISO implements IValueObject<CountryCode> {
  private readonly _value: CountryCode;
  private readonly _config: CountryConfig;

  /**
   * Constructor privado para forzar uso del factory method
   */
  private constructor(value: CountryCode) {
    this._value = value;
    this._config = COUNTRY_CONFIGS[value];
    Object.freeze(this);
  }

  /**
   * Factory method para crear instancias validadas
   *
   * @param value - Código ISO del país (case-insensitive)
   * @throws ValidationException si el país no está soportado
   */
  public static create(value: string): CountryISO {
    const normalizedValue = this.normalize(value);
    this.validate(normalizedValue);
    return new CountryISO(normalizedValue as CountryCode);
  }

  /**
   * Reconstruye desde persistencia sin validación
   */
  public static fromPersistence(value: string): CountryISO {
    return new CountryISO(value as CountryCode);
  }

  /**
   * Verifica si un código de país está soportado
   */
  public static isSupported(value: string): boolean {
    const normalized = value?.toUpperCase().trim();
    return Object.values(CountryCode).includes(normalized as CountryCode);
  }

  /**
   * Obtiene todos los países soportados
   */
  public static getSupportedCountries(): CountryConfig[] {
    return Object.values(COUNTRY_CONFIGS);
  }

  /**
   * Normaliza el valor de entrada a mayúsculas
   */
  private static normalize(value: string): string {
    if (!value) return '';
    return value.toUpperCase().trim();
  }

  /**
   * Valida que el país esté soportado
   */
  private static validate(value: string): void {
    if (!value) {
      throw new ValidationException(
        'El código de país es requerido',
        'countryISO',
        ['required'],
      );
    }

    if (!Object.values(CountryCode).includes(value as CountryCode)) {
      const supportedCountries = Object.values(CountryCode).join(', ');
      throw new ValidationException(
        `País '${value}' no soportado. Países válidos: ${supportedCountries}`,
        'countryISO',
        ['unsupported_country'],
      );
    }
  }

  /**
   * Getter para el valor del código
   */
  get value(): CountryCode {
    return this._value;
  }

  /**
   * Getter para la configuración del país
   */
  get config(): CountryConfig {
    return this._config;
  }

  /**
   * Verifica si es Perú
   */
  isPeru(): boolean {
    return this._value === CountryCode.PERU;
  }

  /**
   * Verifica si es Chile
   */
  isChile(): boolean {
    return this._value === CountryCode.CHILE;
  }

  /**
   * Compara igualdad por valor
   */
  equals(other: IValueObject<CountryCode>): boolean {
    if (!other) return false;
    return this._value === other.value;
  }

  /**
   * Representación string
   */
  toString(): string {
    return this._value;
  }

  /**
   * Serialización JSON
   */
  toJSON(): string {
    return this._value;
  }
}
