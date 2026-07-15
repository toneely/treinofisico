import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test('Verify PWA Orientation Lock in manifest.json', async () => {
  const manifestPath = path.resolve('public/manifest.json');
  const manifestContent = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  expect(manifestContent.orientation).toBe('portrait-primary');
});

test('Verify PageTransition Wrapper existence and basic styling in pages', async () => {
  const pageTransitionPath = path.resolve('src/components/PageTransition.jsx');
  expect(fs.existsSync(pageTransitionPath)).toBe(true);

  const fileContent = fs.readFileSync(pageTransitionPath, 'utf8');
  expect(fileContent).toContain('variants={variants}');
  expect(fileContent).toContain('initial="initial"');
  expect(fileContent).toContain('animate="animate"');
  expect(fileContent).toContain('exit="exit"');
  expect(fileContent).toContain('w-full');
});

test('Verify Inicio has Skeleton screens and wraps content in PageTransition', async () => {
  const inicioPath = path.resolve('src/pages/Inicio.jsx');
  const fileContent = fs.readFileSync(inicioPath, 'utf8');

  // Verify skeleton contains correct classes
  expect(fileContent).toContain('animate-pulse');
  expect(fileContent).toContain('bg-slate-200');
  expect(fileContent).toContain('rounded-2xl');

  // Verify PageTransition wrapper is applied
  expect(fileContent).toContain('<PageTransition>');
  expect(fileContent).toContain('</PageTransition>');
});

test('Verify History and Profile are wrapped in PageTransition', async () => {
  const historyPath = path.resolve('src/pages/History.jsx');
  const profilePath = path.resolve('src/pages/Profile.jsx');

  const historyContent = fs.readFileSync(historyPath, 'utf8');
  const profileContent = fs.readFileSync(profilePath, 'utf8');

  expect(historyContent).toContain('<PageTransition>');
  expect(historyContent).toContain('</PageTransition>');

  expect(profileContent).toContain('<PageTransition>');
  expect(profileContent).toContain('</PageTransition>');
});
