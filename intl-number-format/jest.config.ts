import type { Config } from 'jest'

const config: Config = {
  testMatch: ['<rootDir>/src/**/*.test.{tsx,ts}'],
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '~/(.*)$': '<rootDir>/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/config/jest/setupTests.ts'],
  verbose: true,
}

export default config
