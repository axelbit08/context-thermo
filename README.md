# 🌡️ context-thermo

### Your Claude chat is dying and you don't even know it.

Every message eats your context window. At some point Claude starts forgetting what you said 20 minutes ago — and you only notice when it's too late.

**context-thermo fixes that. Forever.**

```
Contexte █ █ █ █ █ █ █ █ ░ ░ 78 %  156k/200k · auto à 70 %
```

A live gauge sits right above your prompt and goes **🟢 green → 🟡 yellow → 🔴 red** as your context fills up. And the moment it hits **70 %**, it does the thing you always forget to do:

> ⚡ **It auto-runs `/compact` for you** — summarizing your goal, decisions, touched files and next step — and you keep going in a fresh, near-empty context. **No lost thread. No copy-pasting. No "wait, what were we doing?"**

---

## ✨ Why you'll never uninstall it

| | Without context-thermo | With context-thermo |
|---|---|---|
| Know how full your context is | ❌ No idea | ✅ Live, color-coded |
| Claude forgetting early messages | 😩 Constantly | 🧠 Never — it compacts first |
| Starting a new chat | 📋 Copy, paste, re-explain | ⚡ Automatic, summary kept |
| Effort required | Yours | **Zero** |

## 🚀 Install in 10 seconds

At the prompt of a Claude Code session:

```
/plugin install context-thermo --marketplace axelbit08/context-thermo
```

Answer `y` to add the marketplace, pick a scope — done.

From a shell:

```
claude plugin install context-thermo --marketplace axelbit08/context-thermo
```

## 🎛️ Commands

| Command | What it does |
|---|---|
| `/jauge` | Shows the exact fill (% and tokens) |
| `/jauge auto off` | Turns off the automatic compact |
| `/jauge auto on` | Turns it back on (70 % threshold) |
| `/jauge reset` | Compacts right now |

## 🧠 How it works

- Listens to `session.measure` — the same figures as Claude's status line, pushed after every turn, zero polling, zero cost.
- Draws a 10-segment gauge above the prompt, each segment colored by its position (green → red), lit up to the current fill.
- At ≥ 70 %, waits for the current answer to finish, then calls the exact same compaction as `/compact`, with instructions to keep what matters.

~150 lines of TypeScript. No dependencies. No tracking.

---

## 🇫🇷 En français

**Ta conversation avec Claude se remplit sans que tu le voies.** context-thermo affiche une jauge vert → rouge au-dessus de ta zone de saisie et, à **70 %**, lance automatiquement `/compact` pour repartir sur un contexte neuf **sans perdre le fil**.

---

⭐ **If it saved your chat even once, drop a star — it helps more people find it.**

Made by [@axelbit08](https://github.com/axelbit08) with Claude.
