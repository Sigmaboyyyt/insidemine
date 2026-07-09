# Как сделать сайт публичным

## Самый быстрый способ: Netlify Drop

1. Открой https://app.netlify.com/drop
2. Перетащи туда всю папку `site insidemine` или архив с файлами:
   - `index.html`
   - `rules.html`
   - `styles.css`
   - `script.js`
3. Netlify сразу выдаст публичную ссылку вида:
   `https://random-name.netlify.app`

Для авто-выдачи через API используй Netlify и настрой переменные из `NETLIFY_API_SETUP.md`.

## Через GitHub Pages

1. Создай репозиторий на GitHub.
2. Загрузи в него файлы:
   - `index.html`
   - `rules.html`
   - `styles.css`
   - `script.js`
3. Открой `Settings` -> `Pages`.
4. В `Build and deployment` выбери:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
5. Через минуту появится ссылка вида:
   `https://username.github.io/repository-name/`

## Локально на своем ПК

Можно открыть файл напрямую:

`C:\Users\vffge\Desktop\site insidemine\index.html`

Такая ссылка работает только на твоем компьютере.
