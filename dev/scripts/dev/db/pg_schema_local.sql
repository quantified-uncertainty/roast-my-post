SELECT 'CREATE DATABASE roast_my_post'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'roast_my_post')\gexec
