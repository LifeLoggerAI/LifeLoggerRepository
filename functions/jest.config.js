module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      isolatedModules: true,
      tsconfig: {
        skipLibCheck: true,
        noEmitOnError: false,
      }
    }],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  testTimeout: 10000,
};