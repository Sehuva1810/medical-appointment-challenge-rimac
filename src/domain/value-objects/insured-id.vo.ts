import { IValueObject } from '@shared/interfaces/base.interface';
import { ValidationException } from '@domain/exceptions/domain.exception';

/**
 * Value Object: InsuredId
 *
 * Representa el identificador único de un asegurado.
 * Encapsula la validación de formato y garantiza inmutabilidad.
 *
 * Reglas de negocio:
 * - Debe ser exactamente 5 dígitos numéricos
 * - Permite ceros a la izquierda (ej: "00001")
 * - No puede ser nulo o vacío
 *
 * @example
 * const insuredId = InsuredId.create('00001');
 * console.log(insuredId.value); // "00001"
 */
export class InsuredId implements IValueObject<string> {
  private static readonly PATTERN = /^\d{5}$/;
  private static readonly LENGTH = 5;

  private readonly _value: string;

  /**
   * Constructor privado para forzar uso del factory method
   */
  private constructor(value: string) {
    this._value = value;
    Object.freeze(this);
  }

  /**
   * Factory method para crear instancias validadas
   * Implementa el patrón Factory Method
   *
   * @param value - Valor del ID del asegurado
   * @throws ValidationException si el formato es inválido
   */
  public static create(value: string): InsuredId {
    const sanitizedValue = this.sanitize(value);
    this.validate(sanitizedValue);
    return new InsuredId(sanitizedValue);
  }

  /**
   * Reconstruye un InsuredId desde persistencia (sin validación)
   * Usar solo cuando los datos vienen de una fuente confiable
   */
  public static fromPersistence(value: string): InsuredId {
    return new InsuredId(value);
  }

  /**
   * Sanitiza el valor de entrada
   */
  private static sanitize(value: string): string {
    if (!value) {
      return '';
    }
    return value.trim();
  }

  /**
   * Valida que el valor cumpla con las reglas de negocio
   */
  private static validate(value: string): void {
    if (!value) {
      throw new ValidationException(
        'El ID del asegurado es requerido',
        'insuredId',
        ['required'],
      );
    }

    if (value.length !== this.LENGTH) {
      throw new ValidationException(
        `El ID del asegurado debe tener exactamente ${this.LENGTH} dígitos`,
        'insuredId',
        ['length'],
      );
    }

    if (!this.PATTERN.test(value)) {
      throw new ValidationException(
        'El ID del asegurado debe contener solo dígitos numéricos',
        'insuredId',
        ['pattern'],
      );
    }
  }

  /**
   * Getter para el valor encapsulado
   */
  get value(): string {
    return this._value;
  }

  /**
   * Compara igualdad por valor
   */
  equals(other: IValueObject<string>): boolean {
    if (!other) return false;
    return this._value === other.value;
  }

  /**
   * Representación string del Value Object
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
