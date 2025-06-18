#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { S3Client, ListBucketsCommand, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config();

// Конфигурация S3 клиента для Yandex Cloud
const s3Client = new S3Client({
  region: 'ru-central1',
  endpoint: 'https://storage.yandexcloud.net',
  credentials: {
    accessKeyId: process.env.YANDEX_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.YANDEX_SECRET_ACCESS_KEY || '',
  },
  forcePathStyle: true,
});

class YandexCloudMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'yandex-cloud-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers(): void {
    // Регистрируем список доступных инструментов
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'list_buckets',
          description: 'Получить список всех bucket в Yandex Cloud Object Storage',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'list_objects',
          description: 'Получить список объектов в указанном bucket',
          inputSchema: {
            type: 'object',
            properties: {
              bucket: {
                type: 'string',
                description: 'Имя bucket',
              },
              prefix: {
                type: 'string',
                description: 'Префикс для фильтрации объектов (необязательно)',
              },
              maxKeys: {
                type: 'number',
                description: 'Максимальное количество объектов для возврата (по умолчанию 1000)',
              },
            },
            required: ['bucket'],
          },
        },
        {
          name: 'download_object',
          description: 'Скачать объект из bucket в локальную папку',
          inputSchema: {
            type: 'object',
            properties: {
              bucket: {
                type: 'string',
                description: 'Имя bucket',
              },
              key: {
                type: 'string',
                description: 'Ключ (путь) объекта в bucket',
              },
              localPath: {
                type: 'string',
                description: 'Локальный путь для сохранения файла',
              },
            },
            required: ['bucket', 'key', 'localPath'],
          },
        },
      ],
    }));

    // Обработчик вызовов инструментов
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'list_buckets':
            return await this.listBuckets();
          case 'list_objects':
            return await this.listObjects(args as any);
          case 'download_object':
            return await this.downloadObject(args as any);
          default:
            throw new Error(`Неизвестный инструмент: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
        return {
          content: [
            {
              type: 'text',
              text: `Ошибка выполнения ${name}: ${errorMessage}`,
            },
          ],
        };
      }
    });
  }

  private async listBuckets() {
    try {
      const command = new ListBucketsCommand({});
      const response = await s3Client.send(command);
      
      const buckets = response.Buckets?.map(bucket => ({
        name: bucket.Name,
        creationDate: bucket.CreationDate?.toISOString(),
      })) || [];

      return {
        content: [
          {
            type: 'text',
            text: `Найдено ${buckets.length} bucket(s):\n${JSON.stringify(buckets, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Не удалось получить список bucket: ${error}`);
    }
  }

  private async listObjects(args: { bucket: string; prefix?: string; maxKeys?: number }) {
    try {
      const command = new ListObjectsV2Command({
        Bucket: args.bucket,
        Prefix: args.prefix,
        MaxKeys: args.maxKeys || 1000,
      });
      
      const response = await s3Client.send(command);
      
      const objects = response.Contents?.map(obj => ({
        key: obj.Key,
        size: obj.Size,
        lastModified: obj.LastModified?.toISOString(),
        etag: obj.ETag,
      })) || [];

      return {
        content: [
          {
            type: 'text',
            text: `Найдено ${objects.length} объект(ов) в bucket "${args.bucket}":\n${JSON.stringify(objects, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Не удалось получить список объектов: ${error}`);
    }
  }

  private async downloadObject(args: { bucket: string; key: string; localPath: string }) {
    try {
      const command = new GetObjectCommand({
        Bucket: args.bucket,
        Key: args.key,
      });
      
      const response = await s3Client.send(command);
      
      if (!response.Body) {
        throw new Error('Пустой ответ от сервера');
      }

      // Создаем папку если она не существует
      const directory = args.localPath.substring(0, args.localPath.lastIndexOf('/'));
      if (directory && !existsSync(directory)) {
        mkdirSync(directory, { recursive: true });
      }

      // Конвертируем поток в буфер и сохраняем
      const chunks: Uint8Array[] = [];
      const reader = response.Body.transformToWebStream().getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      
      const buffer = Buffer.concat(chunks);
      writeFileSync(args.localPath, buffer);

      return {
        content: [
          {
            type: 'text',
            text: `Файл "${args.key}" успешно скачан в "${args.localPath}" (размер: ${buffer.length} байт)`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Не удалось скачать объект: ${error}`);
    }
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Yandex Cloud MCP сервер запущен');
  }
}

// Запуск сервера
const server = new YandexCloudMCPServer();
server.run().catch(console.error);