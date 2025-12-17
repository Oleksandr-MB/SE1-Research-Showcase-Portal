1. Скачайте postgresql и pgadmin4 
2. В postgersql создайте базу данных research_portal
3. Поставьте пароль юзеру postgres (стандартный) 'admin'
4. Зайдите в pgadmin и проверьте, что БД создана
5. Измените config.json в vscode (файл ниже)
6. Запустите db_creator.py через python debugger с профилем из config.json
7. Проверьте в pgadmin, что пустые таблицы создались
8. Так же само через debugger запустите main.py
9. Перейдите в src/frontend и запустите фронт (npm run dev)
10. Откройте localhost:3000
