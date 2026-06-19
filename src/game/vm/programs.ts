// Stock robot programs (design §9.3). For now, assembler-built robots ship with
// the autonomous miner so the VM is demonstrable end-to-end before the Blockly
// editor exists — this is Milestone 1 ("a robot that mines without you"). Once the
// editor lands, players author/replace this per robot.

import type { BlockProgram } from './ast';

/**
 * Autonomous miner:
 *   loop:
 *     if a resource node exists:
 *       mine the nearest node (until cargo full or it's exhausted)
 *       deposit at the nearest refinery
 *     else:
 *       wait 1s
 */
export const MINER_PROGRAM: BlockProgram = [
  {
    op: 'loop',
    body: [
      {
        op: 'if',
        cond: { kind: 'exists', target: { kind: 'nearestNode' } },
        then: [
          { op: 'mine', target: { kind: 'nearestNode' } },
          { op: 'deposit', target: { kind: 'nearestRefinery' } },
        ],
        otherwise: [{ op: 'wait', seconds: 1 }],
      },
    ],
  },
];
