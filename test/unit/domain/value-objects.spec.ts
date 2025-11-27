import { InsuredId } from '@domain/value-objects/insured-id.vo';
import { CountryISO, CountryCode } from '@domain/value-objects/country-iso.vo';
import {
  AppointmentStatus,
  AppointmentStatusEnum,
} from '@domain/value-objects/appointment-status.vo';
import { ValidationException, BusinessRuleViolationException } from '@domain/exceptions/domain.exception';

describe('Value Objects', () => {
  describe('InsuredId', () => {
    describe('create', () => {
      it('debe crear un InsuredId válido con 5 dígitos', () => {
        const insuredId = InsuredId.create('00001');
        expect(insuredId.value).toBe('00001');
      });

      it('debe crear un InsuredId con ceros a la izquierda', () => {
        const insuredId = InsuredId.create('00123');
        expect(insuredId.value).toBe('00123');
      });

      it('debe limpiar espacios en blanco', () => {
        const insuredId = InsuredId.create('  12345  ');
        expect(insuredId.value).toBe('12345');
      });

      it('debe lanzar error si el valor es vacío', () => {
        expect(() => InsuredId.create('')).toThrow(ValidationException);
        expect(() => InsuredId.create('')).toThrow('El ID del asegurado es requerido');
      });

      it('debe lanzar error si tiene menos de 5 dígitos', () => {
        expect(() => InsuredId.create('1234')).toThrow(ValidationException);
        expect(() => InsuredId.create('1234')).toThrow('exactamente 5 dígitos');
      });

      it('debe lanzar error si tiene más de 5 dígitos', () => {
        expect(() => InsuredId.create('123456')).toThrow(ValidationException);
      });

      it('debe lanzar error si contiene letras', () => {
        expect(() => InsuredId.create('1234a')).toThrow(ValidationException);
        expect(() => InsuredId.create('1234a')).toThrow('solo dígitos numéricos');
      });

      it('debe lanzar error si contiene caracteres especiales', () => {
        expect(() => InsuredId.create('1234-')).toThrow(ValidationException);
      });
    });

    describe('equals', () => {
      it('debe ser igual a otro InsuredId con el mismo valor', () => {
        const id1 = InsuredId.create('00001');
        const id2 = InsuredId.create('00001');
        expect(id1.equals(id2)).toBe(true);
      });

      it('debe ser diferente a otro InsuredId con valor distinto', () => {
        const id1 = InsuredId.create('00001');
        const id2 = InsuredId.create('00002');
        expect(id1.equals(id2)).toBe(false);
      });
    });

    describe('toString', () => {
      it('debe retornar el valor como string', () => {
        const insuredId = InsuredId.create('12345');
        expect(insuredId.toString()).toBe('12345');
      });
    });
  });

  describe('CountryISO', () => {
    describe('create', () => {
      it('debe crear CountryISO para Perú', () => {
        const country = CountryISO.create('PE');
        expect(country.value).toBe(CountryCode.PERU);
      });

      it('debe crear CountryISO para Chile', () => {
        const country = CountryISO.create('CL');
        expect(country.value).toBe(CountryCode.CHILE);
      });

      it('debe aceptar minúsculas', () => {
        const country = CountryISO.create('pe');
        expect(country.value).toBe(CountryCode.PERU);
      });

      it('debe limpiar espacios', () => {
        const country = CountryISO.create('  CL  ');
        expect(country.value).toBe(CountryCode.CHILE);
      });

      it('debe lanzar error para país no soportado', () => {
        expect(() => CountryISO.create('US')).toThrow(ValidationException);
        expect(() => CountryISO.create('US')).toThrow('no soportado');
      });

      it('debe lanzar error si el valor es vacío', () => {
        expect(() => CountryISO.create('')).toThrow(ValidationException);
        expect(() => CountryISO.create('')).toThrow('requerido');
      });
    });

    describe('helpers', () => {
      it('isPeru debe retornar true para PE', () => {
        const country = CountryISO.create('PE');
        expect(country.isPeru()).toBe(true);
        expect(country.isChile()).toBe(false);
      });

      it('isChile debe retornar true para CL', () => {
        const country = CountryISO.create('CL');
        expect(country.isChile()).toBe(true);
        expect(country.isPeru()).toBe(false);
      });
    });

    describe('config', () => {
      it('debe proveer configuración para Perú', () => {
        const country = CountryISO.create('PE');
        expect(country.config.name).toBe('Perú');
        expect(country.config.timezone).toBe('America/Lima');
        expect(country.config.currency).toBe('PEN');
      });

      it('debe proveer configuración para Chile', () => {
        const country = CountryISO.create('CL');
        expect(country.config.name).toBe('Chile');
        expect(country.config.timezone).toBe('America/Santiago');
        expect(country.config.currency).toBe('CLP');
      });
    });

    describe('isSupported', () => {
      it('debe retornar true para países soportados', () => {
        expect(CountryISO.isSupported('PE')).toBe(true);
        expect(CountryISO.isSupported('CL')).toBe(true);
      });

      it('debe retornar false para países no soportados', () => {
        expect(CountryISO.isSupported('US')).toBe(false);
        expect(CountryISO.isSupported('MX')).toBe(false);
      });
    });
  });

  describe('AppointmentStatus', () => {
    describe('factory methods', () => {
      it('debe crear status pending', () => {
        const status = AppointmentStatus.pending();
        expect(status.value).toBe(AppointmentStatusEnum.PENDING);
        expect(status.isPending()).toBe(true);
      });

      it('debe crear status processing', () => {
        const status = AppointmentStatus.processing();
        expect(status.value).toBe(AppointmentStatusEnum.PROCESSING);
        expect(status.isProcessing()).toBe(true);
      });

      it('debe crear status completed', () => {
        const status = AppointmentStatus.completed();
        expect(status.value).toBe(AppointmentStatusEnum.COMPLETED);
        expect(status.isCompleted()).toBe(true);
      });

      it('debe crear status failed', () => {
        const status = AppointmentStatus.failed();
        expect(status.value).toBe(AppointmentStatusEnum.FAILED);
        expect(status.isFailed()).toBe(true);
      });

      it('debe crear status cancelled', () => {
        const status = AppointmentStatus.cancelled();
        expect(status.value).toBe(AppointmentStatusEnum.CANCELLED);
        expect(status.isCancelled()).toBe(true);
      });
    });

    describe('transiciones de estado', () => {
      it('debe permitir pending -> processing', () => {
        const status = AppointmentStatus.pending();
        expect(status.canTransitionTo(AppointmentStatusEnum.PROCESSING)).toBe(true);

        const newStatus = status.transitionTo(AppointmentStatusEnum.PROCESSING);
        expect(newStatus.isProcessing()).toBe(true);
      });

      it('debe permitir pending -> cancelled', () => {
        const status = AppointmentStatus.pending();
        expect(status.canTransitionTo(AppointmentStatusEnum.CANCELLED)).toBe(true);
      });

      it('debe permitir processing -> completed', () => {
        const status = AppointmentStatus.processing();
        expect(status.canTransitionTo(AppointmentStatusEnum.COMPLETED)).toBe(true);
      });

      it('debe permitir processing -> failed', () => {
        const status = AppointmentStatus.processing();
        expect(status.canTransitionTo(AppointmentStatusEnum.FAILED)).toBe(true);
      });

      it('debe permitir failed -> pending (retry)', () => {
        const status = AppointmentStatus.failed();
        expect(status.canTransitionTo(AppointmentStatusEnum.PENDING)).toBe(true);
      });

      it('NO debe permitir pending -> completed directamente', () => {
        const status = AppointmentStatus.pending();
        expect(status.canTransitionTo(AppointmentStatusEnum.COMPLETED)).toBe(false);

        expect(() =>
          status.transitionTo(AppointmentStatusEnum.COMPLETED),
        ).toThrow(BusinessRuleViolationException);
      });

      it('NO debe permitir transiciones desde completed', () => {
        const status = AppointmentStatus.completed();
        expect(status.isFinal()).toBe(true);
        expect(status.canTransitionTo(AppointmentStatusEnum.PENDING)).toBe(false);
      });

      it('NO debe permitir transiciones desde cancelled', () => {
        const status = AppointmentStatus.cancelled();
        expect(status.isFinal()).toBe(true);
      });
    });

    describe('fromString', () => {
      it('debe crear status desde string válido', () => {
        const status = AppointmentStatus.fromString('pending');
        expect(status.isPending()).toBe(true);
      });

      it('debe lanzar error para string inválido', () => {
        expect(() => AppointmentStatus.fromString('invalid')).toThrow(
          BusinessRuleViolationException,
        );
      });
    });
  });
});
