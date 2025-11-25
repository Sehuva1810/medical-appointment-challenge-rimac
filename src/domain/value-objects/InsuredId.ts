import { ValidationError } from '../../shared/errors/ValidationError';

export class InsuredId {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  static create(value: string): InsuredId {
    if (!value) {
      throw new ValidationError('InsuredId is required');
    }

    // Remover espacios al inicio y final
    const trimmedValue = value.trim();

    // Validar que sean exactamente 5 dígitos (puede tener ceros a la izquierda)
    const regex = /^\d{5}$/;
    if (!regex.test(trimmedValue)) {
      throw new ValidationError(
        'InsuredId must be exactly 5 digits (can have leading zeros)'
      );
    }

    return new InsuredId(trimmedValue);
  }

  get value(): string {
    return this._value;
  }

  equals(other: InsuredId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
