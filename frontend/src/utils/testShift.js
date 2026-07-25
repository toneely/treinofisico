import assert from 'assert';
import fs from 'fs';
import path from 'path';

function runTests() {
  console.log('Starting demo date shift unit tests with stripped supabaseClient...');

  // Read the original file
  const filePath = path.resolve('frontend/src/utils/demoDateShift.js');
  let content = fs.readFileSync(filePath, 'utf8');

  // Strip the import of supabaseClient to avoid Vite's import.meta.env error in pure Node.js
  content = content.replace(/import\s+\{\s*supabase\s*\}\s+from\s+['"][^'"]+['"];?/g, '');
  // Mock supabase as a global or local empty object so getDemoOffset won't crash on reference
  content = 'const supabase = {};\n' + content;

  // Since we are running in ESM, we can write a temporary file and import it, or use eval/Function.
  // Writing a temporary file without the import is extremely clean!
  const tempFilePath = path.resolve('frontend/src/utils/demoDateShift.test-temp.js');
  fs.writeFileSync(tempFilePath, content, 'utf8');

  import('./demoDateShift.test-temp.js')
    .then((module) => {
      const { shiftDemoDate } = module;

      // Test 1: shiftDemoDate with no offset should return the original string
      const d1 = '2025-05-15T12:00:00.000Z';
      assert.strictEqual(shiftDemoDate(d1, 0), d1);
      assert.strictEqual(shiftDemoDate(d1, null), d1);

      // Test 2: Shift that results in a Saturday should not trigger any extra adjustment
      // 2025-05-17 is a Saturday
      // Let's take a Wednesday, say 2025-05-14 (Wednesday).
      // Shift it by 3 days in ms (3 * 86400000 = 259200000 ms) -> lands on Saturday 2025-05-17.
      const anchorWed = '2025-05-14T12:00:00.000Z';
      const threeDaysInMs = 3 * 86400000;
      const shiftedSat = shiftDemoDate(anchorWed, threeDaysInMs);
      const satDate = new Date(shiftedSat);
      assert.strictEqual(satDate.getUTCDay(), 6); // 6 is Saturday
      assert.strictEqual(satDate.getUTCDate(), 17);

      // Test 3: Shift that results in a Sunday should trigger Sunday-avoidance adjustment (+1 day / pushed to Monday)
      // Shift Wednesday 2025-05-14 by 4 days in ms (4 * 86400000 = 345600000 ms) -> lands on Sunday 2025-05-18.
      // With Sunday avoidance, it should be adjusted to Monday 2025-05-19.
      const fourDaysInMs = 4 * 86400000;
      const shiftedSun = shiftDemoDate(anchorWed, fourDaysInMs);
      const sunDate = new Date(shiftedSun);
      // It should NOT be Sunday (getDay() !== 0)
      assert.notStrictEqual(sunDate.getUTCDay(), 0);
      // It should be Monday (getDay() === 1)
      assert.strictEqual(sunDate.getUTCDay(), 1);
      // The date should be May 19th.
      assert.strictEqual(sunDate.getUTCDate(), 19);

      // Test 4: Math.round check for weekly blocks alignment
      const SEVEN_DAYS_IN_MS = 604800000;
      function mockGetOffset(today, anchorDate) {
        const baseDiff = today - anchorDate;
        return Math.round(baseDiff / SEVEN_DAYS_IN_MS) * SEVEN_DAYS_IN_MS;
      }

      // If the difference is exactly 12 days, it should round to 14 days (2 weeks).
      const anchorTime = new Date('2025-05-01T12:00:00.000Z').getTime();
      const todayTime1 = anchorTime + (12 * 86400000); // 12 days later
      const offset1 = mockGetOffset(todayTime1, anchorTime);
      assert.strictEqual(offset1, 2 * SEVEN_DAYS_IN_MS);

      // If the difference is exactly 9 days, it should round to 7 days (1 week).
      const todayTime2 = anchorTime + (9 * 86400000); // 9 days later
      const offset2 = mockGetOffset(todayTime2, anchorTime);
      assert.strictEqual(offset2, 1 * SEVEN_DAYS_IN_MS);

      console.log('All tests passed successfully!');

      // Cleanup
      try {
        fs.unlinkSync(tempFilePath);
      } catch (e) {}
    })
    .catch((err) => {
      console.error('Test execution failed:', err);
      try {
        fs.unlinkSync(tempFilePath);
      } catch (e) {}
      process.exit(1);
    });
}

runTests();
