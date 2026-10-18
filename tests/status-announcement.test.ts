import test from 'node:test';
import assert from 'node:assert/strict';
import { scheduleStatusAnnouncement } from '../src/lib/a11y/status-announcement.ts';

test('a short upload publishes its final result without queuing obsolete progress', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const messages: string[] = [];
  const publish = (message: string) => messages.push(message);

  let cancel = scheduleStatusAnnouncement(publish, 'Checking', 1000);
  t.mock.timers.tick(200);
  cancel();
  cancel = scheduleStatusAnnouncement(publish, 'Applying', 1000);
  t.mock.timers.tick(400);
  cancel();
  cancel = scheduleStatusAnnouncement(publish, 'Saved with two warnings', 100);
  assert.deepEqual(messages.filter(Boolean), []);
  t.mock.timers.tick(100);
  t.mock.timers.tick(3000);
  assert.deepEqual(messages.filter(Boolean), ['Saved with two warnings']);
  cancel();
});

test('a longer operation announces current progress once, then its completed result', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const messages: string[] = [];
  const publish = (message: string) => messages.push(message);
  const cancelProgress = scheduleStatusAnnouncement(publish, 'Applying', 1000);
  t.mock.timers.tick(5000);
  assert.deepEqual(messages.filter(Boolean), ['Applying']);

  cancelProgress();
  const cancelResult = scheduleStatusAnnouncement(publish, 'Saved', 100);
  t.mock.timers.tick(5000);
  assert.deepEqual(messages.filter(Boolean), ['Applying', 'Saved']);
  cancelResult();
});

test('a repeated identical result has a separate empty update before publication', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const messages: string[] = [];
  const publish = (message: string) => messages.push(message);
  const cancelFirst = scheduleStatusAnnouncement(publish, 'Saved', 100);
  t.mock.timers.tick(100);
  cancelFirst();

  const cancelSecond = scheduleStatusAnnouncement(publish, 'Saved', 100);
  assert.deepEqual(messages, ['', 'Saved', '']);
  t.mock.timers.tick(100);
  assert.deepEqual(messages, ['', 'Saved', '', 'Saved']);
  cancelSecond();
});

test('a focused error cancels pending progress and leaves the status region empty', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const messages: string[] = [];
  const publish = (message: string) => messages.push(message);
  const cancel = scheduleStatusAnnouncement(publish, 'Checking', 1000);
  t.mock.timers.tick(200);
  cancel();
  scheduleStatusAnnouncement(publish, '', 1000);
  t.mock.timers.tick(5000);
  assert.deepEqual(messages, ['', '']);
});

test('cleanup prevents a pending result from being published after unmount', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const messages: string[] = [];
  const cancel = scheduleStatusAnnouncement(
    (message) => messages.push(message),
    'Saved',
    100,
  );
  cancel();
  t.mock.timers.tick(5000);
  assert.deepEqual(messages, ['']);
});
