# yandex-cloude-mcp
Неофициальный mcp сервер для взаимодействия с Yandex Cloude API.

Основные особенности этого решения:
Функциональность:
``` 
📋 Список всех bucket в вашем аккаунте
📁 Просмотр содержимого конкретного bucket
⬇️ Скачивание файлов в локальную папку
``` 
Технические детали:

Использует официальный AWS SDK (совместим с Yandex Cloud)
Настроен endpoint для Yandex Cloud (https://storage.yandexcloud.net)
Поддерживает все основные операции через MCP протокол

Безопасность:

Ключи доступа хранятся в переменных окружения
Можно настроить права доступа через сервисные аккаунты

После создания и настройки этого сервера, Claude сможет подключиться к вашим bucket в Yandex Cloud и помочь с анализом данных, управлением файлами и другими задачами!

Шаг 1: Создание проекта

Выполните команды в терминале:
``` 
bashmkdir yandex-cloud-mcp

cd yandex-cloud-mcp

npm init -y
``` 

Шаг 2: Установка зависимостей

Основные зависимости
``` 
npm install @modelcontextprotocol/sdk @aws-sdk/client-s3 dotenv

Dev зависимости для TypeScript

npm install -D typescript @types/node ts-node nodemon
``` 

Шаг 3: Создание структуры папок
``` 
bashmkdir src
``` 

Шаг 4: Конфигурационные файлы

Создайте файл tsconfig.json в корне проекта:
``` 
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
``` 
Обновите package.json, добавив scripts:
``` 
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts",
    "watch": "nodemon --exec ts-node src/index.ts"
  }
}
``` 

Шаг 5: Файл переменных окружения
Создайте файл .env в корне проекта:
``` 
bashYANDEX_ACCESS_KEY_ID=your_yandex_access_key_id_here
YANDEX_SECRET_ACCESS_KEY=your_yandex_secret_access_key_here
``` 
⚠️ Пока оставьте placeholder значения - мы заполним их после получения ключей
Шаг 6: Основной код
Создайте файл src/index.ts и скопируйте туда весь код из артефакта (он так же называется index.ts) выше (начиная с #!/usr/bin/env node).

Шаг 7: Получение ключей доступа в Yandex Cloud

Перейдите в консоль Yandex Cloud: https://console.cloud.yandex.ru/
Войдите в аккаунт или создайте новый, если его нет
Создайте или выберите каталог (folder) в вашем облаке
Перейдите в IAM:

В левом меню найдите "Identity and Access Management" или "IAM"
Выберите "Сервисные аккаунты"


Создайте сервисный аккаунт:

Нажмите "Создать сервисный аккаунт"
Введите имя (например, "mcp-s3-access")
Назначьте роль storage.editor (для полного доступа) или storage.viewer (только чтение)
Нажмите "Создать"


Создайте статический ключ доступа:

Откройте созданный сервисный аккаунт
Перейдите на вкладку "Ключи доступа"
Нажмите "Создать новый ключ" → "Статический ключ доступа"
Сохраните Access Key ID и Secret Access Key (они показываются только один раз!)



Шаг 8: Обновление .env файла
Откройте файл .env и замените placeholder значения на ваши ключи:
``` 
bashYANDEX_ACCESS_KEY_ID=YCAJEваш_access_key_id_здесь
YANDEX_SECRET_ACCESS_KEY=YCваш_очень_длинный_secret_key_здесь
``` 
Шаг 9: Тестирование
Попробуйте запустить сервер:
bashnpm run build
npm start
Если все настроено правильно, должно появиться сообщение:
Yandex Cloud MCP сервер запущен

Шаг 10: Подключение к Claude Desktop
1. Найдите файл конфигурации Claude Desktop
Файл конфигурации находится в разных местах в зависимости от ОС:
``` 
Windows:
%APPDATA%\Claude\claude_desktop_config.json
macOS:
~/Library/Application Support/Claude/claude_desktop_config.json
Linux:
~/.config/Claude/claude_desktop_config.json
``` 
3. Создайте или отредактируйте конфигурацию
Если файл не существует - создайте его. Если существует - добавьте ваш сервер.
Новый файл конфигурации:
``` 
{
  "mcpServers": {
    "yandex-cloud": {
      "command": "node",
      "args": ["/полный/путь/к/вашему/проекту/yandex-cloud-mcp/dist/index.js"],
      "env": {
        "YANDEX_ACCESS_KEY_ID": "ваш_access_key_id",
        "YANDEX_SECRET_ACCESS_KEY": "ваш_secret_access_key"
      }
    }
  }
}
``` 
Если файл уже существует, добавьте в секцию mcpServers:
``` 
{
  "mcpServers": {
    "существующие-серверы": { ... },
    "yandex-cloud": {
      "command": "node",
      "args": ["/полный/путь/к/вашему/проекту/yandex-cloud-mcp/dist/index.js"],
      "env": {
        "YANDEX_ACCESS_KEY_ID": "ваш_access_key_id",
        "YANDEX_SECRET_ACCESS_KEY": "ваш_secret_access_key"
      }
    }
  }
}
``` 
5. Узнайте полный путь к проекту
В терминале, находясь в папке yandex-cloud-mcp:
``` 
Windows:
cmdecho %cd%\dist\index.js
macOS/Linux:
bashecho "$(pwd)/dist/index.js"
``` 
7. Перезапустите Claude Desktop
Полностью закройте и снова откройте приложение Claude Desktop.
8. Проверьте подключение
После перезапуска попробуйте написать в чате:
Можешь показать мои bucket в Yandex Cloud?
Если все настроено правильно, Claude сможет использовать инструменты для работы с вашим Yandex Cloud!
Важно: Замените /полный/путь/к/вашему/проекту/ на реальный путь к вашей папке проекта.

Пояснения по шагам:

Шаг 4:

Создание tsconfig.json

Откройте текстовый редактор (например, VS Code, Notepad++, или любой другой)
Создайте новый файл в корневой папке yandex-cloud-mcp (там же где package.json)
Назовите файл tsconfig.json (важно: именно это имя, с расширением .json)
Скопируйте и вставьте этот код:
``` 
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
``` 
Сохраните файл

Обновление package.json

Откройте файл package.json (он уже существует после npm init -y)
Найдите секцию "scripts" (она может выглядеть примерно так):
``` 
json"scripts": {
  "test": "echo \"Error: no test specified\" && exit 1"
}
``` 
Замените её на:
``` 
"scripts": {
  "build": "tsc",
  "start": "node dist/index.js",
  "dev": "ts-node src/index.ts",
  "watch": "nodemon --exec ts-node src/index.ts",
  "test": "echo \"Error: no test specified\" && exit 1"
}
``` 
Сохраните файл

Альтернативный способ (через терминал)
Если предпочитаете командную строку:
``` 
bash# Создание tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF
``` 
Проверка
После выполнения у вас должна быть такая структура:
``` 
yandex-cloud-mcp/
├── node_modules/
├── src/
├── package.json
├── package-lock.json
└── tsconfig.json
``` 

