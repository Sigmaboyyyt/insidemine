# Авто-выдача через Netlify

Сайт нельзя безопасно держать на GitHub Pages, если нужна авто-выдача через API.
Для авто-выдачи загрузи проект на Netlify.

## Переменные окружения Netlify

В Netlify открой:

`Site configuration` -> `Environment variables`

Добавь:

```text
PTERO_PANEL_URL=https://mgr.hosting-minecraft.pro
PTERO_API_KEY=новый_api_ключ_ptlc
PTERO_SERVER_ID=id_сервера_из_pterodactyl
```

`PTERO_SERVER_ID` - это короткий идентификатор сервера в панели Pterodactyl.
Его видно в URL или в API клиента. Обычно ссылка выглядит примерно так:

```text
https://mgr.hosting-minecraft.pro/server/XXXXXXXX
```

Где `XXXXXXXX` и есть нужный ID.

## Что уже делает сайт

После нажатия кнопки выдачи сайт отправляет заказ сюда:

```text
/.netlify/functions/issue-order
```

Форум тоже использует Netlify Functions:

```text
/.netlify/functions/forum-threads
```

Жалобы, заявки, ответы и статусы хранятся в Netlify Blobs. Поэтому они видны
с другого компьютера или телефона только на опубликованном Netlify-сайте. Если
открывать `forum.html` прямо с компьютера, сайт включит локальный режим через
браузерное хранилище, и темы будут видны только на этом устройстве.

## Проверка функции

После деплоя открой в браузере:

```text
https://ТВОЙ-САЙТ.netlify.app/.netlify/functions/issue-order
```

Должен появиться JSON примерно такого вида:

```json
{
  "ok": true,
  "function": "issue-order",
  "configured": {
    "panelUrl": "https://mgr.hosting-minecraft.pro",
    "hasApiKey": true,
    "hasServerId": true
  }
}
```

Если вместо JSON ошибка 404, значит Netlify не задеплоил папку `netlify/functions`.
Если `hasApiKey` или `hasServerId` равны `false`, значит переменные окружения не настроены или сайт не был передеплоен после настройки.

Функция сама формирует и отправляет команды:

```text
lp user Nick parent set Privilege
lp user Nick parent set default
lp user Nick parent addtemp Privilege 30d
dc givekey Nick donate 5
```

Разбан и размут пока не выдаются через API, только привилегии и кейсы.

## Пример запроса

```bash
curl -X POST "https://ТВОЙ-САЙТ.netlify.app/.netlify/functions/issue-order" \
  -H "Content-Type: application/json" \
  -d '{
    "nickname": "PlayerName",
    "items": [
      { "type": "privilege", "grantName": "Spektor", "duration": "30" },
      { "type": "case", "caseKey": "donate", "quantity": 5 }
    ]
  }'
```

## Важно

Старый API-ключ лучше перевыпустить, потому что он уже был отправлен в чат.
Новый ключ не вставляй в `script.js`, `index.html` или GitHub.

Сейчас оплата отключена: любой пользователь, который оформит заказ на сайте,
сразу получит привилегии или кейсы. Это удобно для теста, но небезопасно для
открытого магазина.
