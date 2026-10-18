import type { SavedSchedule } from '../domain/schedule.ts';

export const readySchedule = {
  date: '2026-10-15',
  updatedAt: '2026-10-14T17:42:00Z',
  staff: [
    {
      id: 'st_001',
      name: 'Anna',
      hours: [true, true, true, true, false, false, false, false],
    },
    {
      id: 'st_002',
      name: 'Ben',
      hours: [false, true, true, true, true, false, false, false],
    },
    {
      id: 'st_003',
      name: 'Clara',
      hours: [false, false, false, false, true, true, true, true],
    },
    {
      id: 'st_004',
      name: 'David',
      hours: [false, false, false, false, false, false, false, false],
    },
    {
      id: 'st_005',
      name: 'Elena',
      hours: [true, true, true, false, false, false, false, false],
    },
    {
      id: 'st_006',
      name: 'Felix',
      hours: [false, false, false, true, true, true, true, true],
    },
    {
      id: 'st_007',
      name: 'Grace',
      hours: [false, false, true, true, true, true, false, false],
    },
    {
      id: 'st_008',
      name: 'Hugo',
      hours: [false, false, false, false, false, true, true, true],
    },
  ],
} as const satisfies SavedSchedule;
