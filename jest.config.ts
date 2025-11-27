import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.module.ts',
    '!src/main.ts',
    '!src/lambdas/**/*.ts',
    '!src/**/*.interface.ts',
    '!src/**/index.ts',
    // Infrastructure excluida de unit tests (se testea con E2E/integration)
    '!src/infrastructure/**/*.ts',
    '!src/presentation/controllers/**/*.ts',
    '!src/presentation/guards/**/*.ts',
    '!src/presentation/filters/**/*.ts',
    '!src/presentation/interceptors/**/*.ts',
  ],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@domain/(.*)$': '<rootDir>/src/domain/$1',
    '^@application/(.*)$': '<rootDir>/src/application/$1',
    '^@infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1',
    '^@presentation/(.*)$': '<rootDir>/src/presentation/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
  },
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 70,
      statements: 70,
    },
  },
};

export default config;
