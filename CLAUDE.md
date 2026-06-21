# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**FITBYLOGIC Habits** — мобильное PWA-приложение для трекинга привычек. Весь проект — один файл `index.html` с встроенными CSS и JS. Нет сборки, нет зависимостей, нет сервера.

Деплой: GitHub Pages → `https://mihailkazachinsckij-bot.github.io/fitbylogic_habits/`

## Stack

- Vanilla HTML/CSS/JS — никаких фреймворков, никаких npm-пакетов
- PWA: `manifest.json` + `<link rel="apple-touch-icon" href="icon.svg">`
- Хранилище: `localStorage` (ключи: `hb2_habits`, `hb2_comps`, `hb2_profile`, `hb2_onboarded`, `hb2_dark`, `hb2_stacks`)
- Иконка приложения: `icon.svg` (512×512, тёмный градиент + дуга прогресса)
- ИИ-бэкенд: Cloudflare Worker (`worker.js`) проксирует запросы к Anthropic API; ключ хранится как секрет воркера

## Development

```
open index.html              # открыть напрямую
python3 -m http.server 8080  # локальный сервер (нужен для PWA-фич)
```

Деплой — push в `main`, GitHub Pages публикует автоматически.

## Architecture

Весь код в `index.html`, порядок разделов:

1. **CSS** (`<style>`) — CSS-переменные тем, стили всех компонентов
2. **HTML** — онбординг (`#onboarding`), приложение (`#app`)
3. **JS** (`<script>`) — состояние, логика, рендеринг

### Состояние (объект `S`)

```js
S = { habits, completions, profile, onboarded, stacks }
```

`saveS()` / `loadS()` сериализуют в `localStorage`. При добавлении нового поля обновлять оба метода и оба пути в `catch`-блоке `loadS`.

Структура привычки:
```js
{ id, name, icon, enabled, duration, startDate, schedule: { type: "daily" | "custom", days?: number[] } }
```

Структура стека:
```js
{ id, habitIds: string[] }  // порядок habitIds задаёт последовательность "затем"
```

### Ключевые функции

| Функция | Что делает |
|---|---|
| `totalComps(h)` | Считает **все** выполнения с `h.startDate` (для прогресс-бара) |
| `countComps(h)` | Считает **последовательные** дни (стрик отдельной привычки) |
| `calcStreak()` | Серия дней, когда **все** активные привычки выполнены подряд |
| `calcTotalXP()` | +30 XP за каждое выполнение, +100 XP за завершённый цикл (duration); max 10 000 |
| `getRankIdx(xp)` | Индекс в массиве `RANKS` (9 рангов от Новичок до Легенда) |
| `renderCards()` | Рисует карточки привычек и стек-группы для `selectedDate` |
| `buildCardSegs(h)` | Возвращает `{comp, dur, segs}` — HTML сегментов прогресс-бара |
| `makeSwipeable(wrap, card, cb)` | Свайп влево для удаления карточки (iOS-стиль) |
| `buildSystemPrompt()` | Формирует системный промпт для ИИ (включает привычки, стеки, XP) |
| `parseSuggestions(text)` | Парсит ответ ИИ: возвращает `{clean, tips, action}` |
| `appendActionCard(action)` | Рендерит карточку действия ИИ (ADD / ENABLE / STACK) в чат |
| `pickIcon(name)` | Подбирает эмодзи по ключевым словам на русском |

### Вкладки (4 штуки)

| id | data-tab | Экран |
|---|---|---|
| `s-habits` | `habits` | Привычки (главный) |
| `s-profile` | `profile` | Профиль |
| `s-journey` | `journey` | Путь к цели (XP + ранги) |
| `s-chat` | `chat` | ИИ-тренер |

При переключении вкладки вызывается `renderJourney()` или `openChatTab()`.

### Bottom Sheets

| id | Назначение |
|---|---|
| `edit-sheet` | Список привычек с тоглами вкл/выкл |
| `sug-sheet` | Выбор новой привычки из каталога |
| `dp-sheet` | Настройка срока и расписания привычки |
| `stack-sheet` | Конструктор стека — выбор привычек в порядке (нумерация ①②③) |

### Стеки привычек

`S.stacks` — массив `{ id, habitIds[] }`. `renderCards()` строит `stackOf` (Map habitId→stack) и рендерит стек-группы (`.stack-group`) вместо отдельных карточек для связанных привычек. Кнопка ✕ вызывает `S.stacks.filter(...)` + `saveS()` + `renderCards()`. При удалении привычки через свайп из `remove()` выполняется очистка стеков:
```js
S.stacks = S.stacks
  .map(s => ({ ...s, habitIds: s.habitIds.filter(id => id !== hId) }))
  .filter(s => s.habitIds.length >= 2);
```

### ИИ-чат (вкладка «Тренер»)

- `WORKER_URL` — URL Cloudflare Worker (константа в JS)
- `chatHistory` — массив `{role, content}`, хранится в памяти (не персистируется)
- `parseSuggestions(text)` парсит блок `СОВЕТЫ:` (чипы-вопросы) и строку `ДЕЙСТВИЕ: TYPE | ...`
- Форматы ДЕЙСТВИЕ: `ADD | 🏃 | Название`, `ENABLE | Название`, `STACK | Привычка1 | Привычка2`
- `appendActionCard(action)` добавляет стеклянную карточку в чат с кнопками принять/отклонить

### XP и ранги (вкладка «Путь»)

Массив `RANKS` (9 элементов) с полями `{xp, icon, name, color, glow}`. `renderJourney()` строит визуальный путь (`.path-node`) и XP-бар. Максимум 10 000 XP.

### Темы

`darkMode` переключается через `toggleTheme()`, сохраняется в `hb2_dark`. Применяется через `data-theme="dark"` на `<html>`.

## Style Rules

- **Дизайн**: Apple Liquid Glass (`backdrop-filter: saturate(180%) blur(20px)`)
- **Светлая тема**: `--bg: #f2f2f7`, `--glass: rgba(255,255,255,0.72)`
- **Тёмная тема**: `--bg: #1c1c1e`, `--glass: rgba(44,44,46,0.88)`
- **Шрифт**: `-apple-system, BlinkMacSystemFont, 'SF Pro Text'`
- **Safe area**: `env(safe-area-inset-top, 44px)` и `env(safe-area-inset-bottom, 0px)` для iPhone
- **Высота viewport**: `100dvh` (не `100vh`)
- Анимации карточек: `fadeUp` с `animation-delay: i * 30ms`
- Скругления: `--r20: 20px`, `--r16: 16px`, `--r13: 13px`
- Стек-группы: `border: 0.5px solid rgba(0,122,255,0.18)`, `border-radius: 20px`

## What NOT to do

- Не разбивать на несколько файлов — весь проект остаётся одним `index.html`
- Не добавлять сборщики (webpack, vite и т.п.) и npm-зависимости
- Не использовать `100vh` вместо `100dvh` — ломается на мобильных браузерах
- Не ставить fallback `0px` для `--st` — контент уйдёт за статус-бар iOS; минимум `44px`
- Не хранить токены/PAT в коде или git-истории (ключ Anthropic — только секрет Cloudflare Worker)
