# EMBA Exam Timer

A single-file, offline web app that runs a timed exam plan block by block. It warns you before each block ends, tells you which block comes next, and shrinks or grows the remaining blocks when you run late or early so you still finish by the hard end time.

## Use

Open `index.html` in Chrome, Edge, Firefox or Safari. You don't need a server or an internet connection.

1. Edit the plan: rename the two unlabeled blocks, change minutes, reorder blocks, and tick **Fixed** for blocks that must never shrink (Check is fixed by default).
2. Choose **Start now**, or **Exam starts at 10:00**. A start time that has already passed works too: the timer counts from that time.
3. Click **Test an alert** and **Enable desktop notifications** before the exam starts.
4. Press **N** (or **Next stage**) when you actually move on. Press **U** to undo a mistaken move.

## Alerts

| When | What |
|---|---|
| N min before a block ends (default 2) | Heads-up banner, naming the next block and its budget |
| Block budget reached | Full-screen "Move on → *next block*" prompt, with sound and a desktop notification |
| Every N min while over (default 2) | Repeat prompt showing how much later blocks are shrinking |
| 15 / 10 / 5 min before the hard end | End-of-exam warnings |

## How the rebalancing works

When you move to a new block, the time left before the hard end is split across the remaining blocks. Fixed blocks keep their planned minutes. The other blocks are scaled in proportion to their planned minutes. If you finish a block early, the time you saved goes to the later blocks. If you finish late, the later blocks get shorter.

## Limitations

- Browsers slow down timers in hidden tabs. After about 5 minutes hidden, Chrome can deliver an alert up to about 1 minute late. Keep the window visible, for example side by side with your exam, or run it on a phone.
- Desktop notifications need permission. Some browsers block them for pages opened directly as a file (`file://`). The on-page banner and sound work either way.
- Sound starts only after you have clicked something on the page. Clicking **Start** counts.
- The plan, settings and the running timer are saved in this browser (`localStorage`), so a reload or an accidental close keeps your progress.
