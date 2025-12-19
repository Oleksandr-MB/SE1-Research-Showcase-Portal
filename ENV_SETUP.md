1. Download postgresql and pgadmin4
2. In postgresql, create the research_portal database
3. Set the default password for the postgres user to 'admin'
4. Log in to pgadmin and verify that the database has been created
5. Edit config.json in vscode (I've sent you the file earlier)
6. Run db_creator.py in Python debugger with the profile from config.json
7. Verify in pgadmin that empty tables have been created
8. Run main.py in debugger as well
9. Go to src/frontend and run the frontend (npm run dev)
10. Open localhost:3000