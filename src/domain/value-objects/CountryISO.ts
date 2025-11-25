import { ValidationError } from '../../shared/errors/ValidationError';

export enum CountryCode {
  PERU = 'PE',
  CHILE = 'CL',
}

export class CountryISO {
  private readonly _value: CountryCode;

  private constructor(value: CountryCode) {
    this._value = value;
  }

  static create(value: string): CountryISO {
    if (!value) {
      throw new ValidationError('CountryISO is required');
    }

    const upperValue = value.toUpperCase().trim();

    if (!Object.values(CountryCode).includes(upperValue as CountryCode)) {
      throw new ValidationError(
        `CountryISO must be either 'PE' or 'CL'. Received: ${value}`
      );
    }

    return new CountryISO(upperValue as CountryCode);
  }

  get value(): CountryCode {
    return this._value;
  }

  isPeru(): boolean {
    return this._value === CountryCode.PERU;
  }

  isChile(): boolean {
    return this._value === CountryCode.CHILE;
  }

  equals(other: CountryISO): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
