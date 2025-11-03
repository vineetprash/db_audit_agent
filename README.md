
Real-time database audit system with PostgreSQL. Track all INSERT/UPDATE/DELETE operations via audit logs. Detect suspicious activities automatically. CRUD operations for Users (Admin/Dean/Faculty/Student with rollNo/marks) and Courses. Socket.io for live log streaming. 

Docker command to setup database
`docker run -d --name audit_db -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=audit_db -p 5432:5432 postgres:16-alpine
