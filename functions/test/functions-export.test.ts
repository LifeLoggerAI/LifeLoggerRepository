import { readFileSync } from 'fs';
import { join } from 'path';

describe('Firebase Functions Index Structure', () => {
  let indexContent: string;

  beforeAll(() => {
    // Read the index.ts file content directly
    indexContent = readFileSync(join(__dirname, '../src/index.ts'), 'utf8');
  });

  describe('Export statements verification', () => {
    it('should export genkit-sample module', () => {
      expect(indexContent).toContain('export * from "./genkit-sample";');
    });

    it('should export user-management module', () => {
      expect(indexContent).toContain('export * from "./user-management";');
    });

    it('should export emotion-engine module', () => {
      expect(indexContent).toContain('export * from "./emotion-engine";');
    });

    it('should export torso-engine module', () => {
      expect(indexContent).toContain('export * from "./torso-engine";');
    });

    it('should export legs-engine module', () => {
      expect(indexContent).toContain('export * from "./legs-engine";');
    });

    it('should export arms-engine module', () => {
      expect(indexContent).toContain('export * from "./arms-engine";');
    });

    it('should export orb-engine module', () => {
      expect(indexContent).toContain('export * from "./orb-engine";');
    });

    it('should export social-engine module', () => {
      expect(indexContent).toContain('export * from "./social-engine";');
    });

    it('should export timeline-engine module', () => {
      expect(indexContent).toContain('export * from "./timeline-engine";');
    });

    it('should export data-privacy module', () => {
      expect(indexContent).toContain('export * from "./data-privacy";');
    });

    it('should export scheduled module', () => {
      expect(indexContent).toContain('export * from "./scheduled";');
    });

    it('should export notifications module', () => {
      expect(indexContent).toContain('export * from "./notifications";');
    });

    it('should export email-engine module', () => {
      expect(indexContent).toContain('export * from "./email-engine";');
    });

    it('should export speech-engine module', () => {
      expect(indexContent).toContain('export * from "./speech-engine";');
    });

    it('should export visuals-engine module', () => {
      expect(indexContent).toContain('export * from "./visuals-engine";');
    });

    it('should export telemetry-engine module', () => {
      expect(indexContent).toContain('export * from "./telemetry-engine";');
    });

    it('should export avatar-engine module', () => {
      expect(indexContent).toContain('export * from "./avatar-engine";');
    });

    it('should export dream-engine module', () => {
      expect(indexContent).toContain('export * from "./dream-engine";');
    });

    it('should export symbolic-engine module', () => {
      expect(indexContent).toContain('export * from "./symbolic-engine";');
    });
  });

  describe('Index file structure', () => {
    it('should contain proper comments and structure', () => {
      expect(indexContent).toContain('Import function triggers from their respective submodules');
      expect(indexContent).toContain('firebase.google.com/docs/functions');
    });

    it('should export all required engine modules', () => {
      const expectedExports = [
        'genkit-sample',
        'user-management',
        'emotion-engine',
        'torso-engine',
        'legs-engine',
        'arms-engine',
        'orb-engine',
        'social-engine',
        'timeline-engine',
        'data-privacy',
        'scheduled',
        'notifications',
        'email-engine',
        'speech-engine',
        'visuals-engine',
        'telemetry-engine',
        'avatar-engine',
        'dream-engine',
        'symbolic-engine'
      ];

      expectedExports.forEach(moduleName => {
        expect(indexContent).toContain(`export * from "./${moduleName}";`);
      });
    });

    it('should be the single entry point for Firebase Functions', () => {
      // Verify this is structured as a proper Firebase Functions entry point
      expect(indexContent).toMatch(/export \* from/);
      // Should not contain any direct function implementations
      expect(indexContent).not.toMatch(/export const \w+ = /);
    });
  });
});